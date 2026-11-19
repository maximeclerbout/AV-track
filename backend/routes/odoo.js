const express = require('express');
const { query } = require('../db/pool');
const { auth } = require('../middleware/auth');
const odoo = require('../services/odoo');

const router = express.Router();
router.use(auth);

function formatAdresse(p) {
  const ligne1 = [p.street, p.street2].filter(Boolean).join(', ');
  const ligne2 = [p.zip, p.city].filter(Boolean).join(' ');
  return [ligne1, ligne2].filter(Boolean).join(', ');
}

// Sections de devis qui ne correspondent pas a une salle physique (main
// d'oeuvre, fournitures de cablage, contrat de maintenance...) : leurs
// lignes ne sont pas des equipements a ajouter au chantier.
const SECTION_EXCLUE_REGEX = /install|contrat|service|maintenance|garantie|formation|main.?d.?oeuvre|fourniture|frais|divers|prestation/i;

// Reference constructeur + marque toujours entre crochets en debut de ligne
// (meme convention que les BDC PDF AVI), suivis de la description.
const MARQUE_REGEX = /^\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)$/;

const devinerType = (texte) => {
  const t = texte.toLowerCase();
  if (t.includes('projecteur') || t.includes('epson') || t.includes('videopro')) return 'Videoprojecteur';
  if (t.includes('ecran') || t.includes('samsung') || t.includes('qm') || t.includes('display') || t.includes('moniteur') || t.includes('flip')) return 'TV';
  if (t.includes('matrice') || t.includes('switcher') || t.includes('selecteur')) return 'Matrice';
  if (t.includes('ampli') && !t.includes('hdmi')) return 'Amplificateur';
  if (t.includes('micro') || t.includes('sennheiser') || t.includes('enceinte') || t.includes('balun') || t.includes('audio')) return 'Autre';
  if (t.includes('visio') || t.includes('camera') || t.includes('confer') || t.includes('poly') || t.includes('teams')) return 'Visio';
  if (t.includes('dtp') || t.includes('hdbase') || t.includes('distributeur') || t.includes('recepteur') || t.includes('extron') || t.includes('switch')) return 'Switch AV';
  if (t.includes('controleur') || t.includes('control') || t.includes('automate') || t.includes('crestron') || t.includes('reservation')) return 'Controleur';
  return 'Autre';
};

router.get('/affaires', async (req, res) => {
  if (!odoo.isConfigured()) {
    return res.status(503).json({ error: 'Integration Odoo non configuree sur ce serveur.' });
  }
  try {
    const projects = await odoo.searchRead('project.project', [], {
      fields: ['name', 'partner_id', 'create_date'],
      order: 'id desc',
      limit: 40
    });

    // Lecture groupee des contacts Odoo lies, pour recuperer l'adresse du
    // chantier, le nom du contact et son telephone directement depuis
    // l'affaire (plutot que de ne remplir que le numero et le client).
    const partnerIds = [...new Set(projects.filter(p => p.partner_id).map(p => p.partner_id[0]))];
    let partnersById = {};
    if (partnerIds.length > 0) {
      const partners = await odoo.searchRead('res.partner', [['id', 'in', partnerIds]], {
        fields: ['name', 'street', 'street2', 'city', 'zip', 'phone', 'parent_id']
      });
      partnersById = Object.fromEntries(partners.map(p => [p.id, p]));
    }

    const existing = await query(
      `SELECT numero_affaire FROM chantiers WHERE numero_affaire IS NOT NULL AND numero_affaire <> ''`
    );
    const existingSet = new Set(existing.rows.map(r => r.numero_affaire.trim()));

    const affaires = projects.map(p => {
      const partner = p.partner_id ? partnersById[p.partner_id[0]] : null;
      // Si le contact Odoo est une personne rattachee a une societe (parent_id),
      // le client c'est la societe et le contact c'est la personne elle-meme.
      const client = partner ? (partner.parent_id ? partner.parent_id[1] : partner.name) : '';
      const nom_contact = partner?.parent_id ? partner.name : '';
      return {
        odoo_id: p.id,
        numero_affaire: p.name,
        client,
        adresse: partner ? formatAdresse(partner) : '',
        nom_contact,
        telephone: partner?.phone || '',
        create_date: p.create_date,
        deja_importee: existingSet.has((p.name || '').trim())
      };
    });

    res.json(affaires);
  } catch (err) {
    console.error('Erreur lecture affaires Odoo:', err.message);
    res.status(502).json({ error: 'Impossible de contacter Odoo : ' + err.message });
  }
});

// Lit les lignes des ventes (sale.order) rattachees a l'affaire pour en
// deduire la liste des salles et du materiel vendu. Lecture seule — aucune
// ecriture n'est faite vers Odoo.
router.get('/affaires/:odooId/ventes', async (req, res) => {
  if (!odoo.isConfigured()) {
    return res.status(503).json({ error: 'Integration Odoo non configuree sur ce serveur.' });
  }
  const odooId = parseInt(req.params.odooId, 10);
  if (!odooId) return res.status(400).json({ error: 'Identifiant Odoo invalide.' });
  try {
    const projects = await odoo.searchRead('project.project', [['id', '=', odooId]], {
      fields: ['sale_order_ids']
    });
    if (projects.length === 0) return res.status(404).json({ error: 'Affaire Odoo introuvable.' });

    const orderIds = projects[0].sale_order_ids || [];
    if (orderIds.length === 0) return res.json({ sections: [], articles: [] });

    const orders = await odoo.searchRead('sale.order', [['id', 'in', orderIds], ['state', '!=', 'cancel']], {
      fields: ['id']
    });
    const validOrderIds = orders.map(o => o.id);
    if (validOrderIds.length === 0) return res.json({ sections: [], articles: [] });

    const lines = await odoo.searchRead('sale.order.line', [['order_id', 'in', validOrderIds]], {
      fields: ['name', 'product_id', 'product_uom_qty', 'display_type'],
      order: 'order_id, sequence, id'
    });

    const sections = [];
    const articles = [];
    let sectionCourante = 'Salle principale';
    let sectionExclue = false;

    for (const line of lines) {
      if (line.display_type === 'line_section') {
        const nom = (line.name || '').trim();
        if (SECTION_EXCLUE_REGEX.test(nom)) {
          sectionExclue = true;
        } else {
          sectionExclue = false;
          sectionCourante = nom;
          if (!sections.includes(sectionCourante)) sections.push(sectionCourante);
        }
        continue;
      }
      if (line.display_type || !line.product_id || sectionExclue) continue;

      const lignesTexte = (line.name || '').split('\n');
      const match = lignesTexte[0].match(MARQUE_REGEX);
      if (!match) continue;

      const refConstructeur = match[1].trim();
      const marque = match[2].trim();
      const description = [match[3].trim(), ...lignesTexte.slice(1).map(l => l.trim())].filter(Boolean).join(' ');
      const reference = (marque + ' ' + description).substring(0, 80);
      const quantite = Math.max(1, Math.round(line.product_uom_qty || 1));

      if (!sections.includes(sectionCourante)) sections.push(sectionCourante);
      articles.push({
        reference,
        ref_constructeur: refConstructeur,
        description,
        type_equipement: devinerType(description + ' ' + marque),
        quantite,
        section: sectionCourante
      });
    }

    res.json({ sections, articles });
  } catch (err) {
    console.error('Erreur lecture ventes Odoo:', err.message);
    res.status(502).json({ error: 'Impossible de contacter Odoo : ' + err.message });
  }
});

module.exports = router;
