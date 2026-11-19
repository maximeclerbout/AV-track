const express = require('express');
const { query } = require('../db/pool');
const { auth } = require('../middleware/auth');
const odoo = require('../services/odoo');

const router = express.Router();
router.use(auth);

// Nom de societe a partir du nom complet du contact Odoo
// (ex: "CFI Groupe, PUCCIO Goeffrey" -> "CFI Groupe")
function clientFromPartnerName(name) {
  if (!name) return '';
  return name.split(',')[0].trim();
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

    const existing = await query(
      `SELECT numero_affaire FROM chantiers WHERE numero_affaire IS NOT NULL AND numero_affaire <> ''`
    );
    const existingSet = new Set(existing.rows.map(r => r.numero_affaire.trim()));

    const affaires = projects.map(p => ({
      odoo_id: p.id,
      numero_affaire: p.name,
      client: clientFromPartnerName(p.partner_id ? p.partner_id[1] : ''),
      create_date: p.create_date,
      deja_importee: existingSet.has((p.name || '').trim())
    }));

    res.json(affaires);
  } catch (err) {
    console.error('Erreur lecture affaires Odoo:', err.message);
    res.status(502).json({ error: 'Impossible de contacter Odoo : ' + err.message });
  }
});

module.exports = router;
