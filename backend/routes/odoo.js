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

const TACHES_GENERIQUES = ['programmation', 'préparation chantier', 'preparation chantier'];

// Le titre d'une affaire n'est presque jamais rempli dans le champ dedie
// d'Odoo : on le retrouve en pratique dans le nom de la tache technicien
// (ex: "163682 - Salle du conseil - visio (Inter)"), dont on retire le
// numero d'affaire, le nom du client et le suffixe entre parentheses.
function extraireTitre(taches, numero, client) {
  if (!taches?.length) return '';
  const numeroEsc = String(numero).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reNumeroPrefixe = new RegExp('^' + numeroEsc + '\\s*[-–]?\\s*(.+?)\\s*\\([^)]*\\)\\s*$', 'i');
  for (const t of taches) {
    const m = (t || '').match(reNumeroPrefixe);
    if (m && m[1].trim()) return m[1].trim();
  }
  for (const t of taches) {
    let s = (t || '').split(String(numero)).join(' ');
    if (client) {
      const clientEsc = client.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      s = s.replace(new RegExp('^\\s*' + clientEsc + '\\s*[-–]?\\s*', 'i'), '');
    }
    s = s.replace(/\s*\([^)]*\)\s*$/, '').replace(/^[\s\-–]+|[\s\-–]+$/g, '').trim();
    if (s) return s;
  }
  return '';
}

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
    // Sans recherche : les 100 affaires les plus recentes. Avec une
    // recherche (numero ou client), on interroge Odoo directement sur
    // toutes les affaires plutot que de filtrer seulement ce sous-ensemble.
    const q = (req.query.q || '').trim();
    const domaine = q ? ['|', ['name', 'ilike', q], ['partner_id.display_name', 'ilike', q]] : [];
    const projects = await odoo.searchRead('project.project', domaine, {
      fields: ['name', 'partner_id', 'create_date', 'user_id', 'x_studio_objet_de_lintervention'],
      order: 'id desc',
      limit: q ? 200 : 100
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

    // Lecture groupee des taches liees, pour en extraire un titre lisible
    // quand le champ dedie d'Odoo n'est pas rempli (cas le plus frequent).
    const projectIds = projects.map(p => p.id);
    let tachesByProject = {};
    if (projectIds.length > 0) {
      const taches = await odoo.searchRead('project.task', [['project_id', 'in', projectIds]], {
        fields: ['project_id', 'name']
      });
      for (const t of taches) {
        const pid = t.project_id ? t.project_id[0] : null;
        if (!pid) continue;
        const nom = (t.name || '').trim();
        if (TACHES_GENERIQUES.includes(nom.toLowerCase())) continue;
        (tachesByProject[pid] ||= []).push(nom);
      }
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
      const titre = p.x_studio_objet_de_lintervention || extraireTitre(tachesByProject[p.id] || [], p.name, client);
      return {
        odoo_id: p.id,
        numero_affaire: p.name,
        titre,
        client,
        adresse: partner ? formatAdresse(partner) : '',
        nom_contact,
        telephone: partner?.phone || '',
        vendeur: p.user_id ? p.user_id[1].replace(/\s*\(Collaborateur\)\s*$/, '') : '',
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
