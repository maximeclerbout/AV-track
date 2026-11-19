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

module.exports = router;
