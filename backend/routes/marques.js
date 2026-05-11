const express = require('express');
const { query } = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM marques ORDER BY nom');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.post('/auto-detect', requireRole('admin', 'chef'), async (req, res) => {
  try {
    const marqRes = await query('SELECT nom FROM marques ORDER BY LENGTH(nom) DESC');
    const marques = marqRes.rows.map(r => r.nom);
    const produitsRes = await query('SELECT id, reference FROM produits WHERE marque IS NULL AND reference IS NOT NULL');
    let updated = 0;

    for (const p of produitsRes.rows) {
      const ref = p.reference.trim();
      let found = null;
      for (const m of marques) {
        const refLow = ref.toLowerCase();
        const mLow = m.toLowerCase();
        if (refLow.startsWith(mLow + ' ') || refLow.startsWith(mLow + '-') || refLow === mLow) {
          found = m; break;
        }
      }
      if (found) {
        const modele = ref.substring(found.length).trim().replace(/^[-\s]+/, '') || null;
        await query('UPDATE produits SET marque = $1, modele = $2 WHERE id = $3', [found, modele, p.id]);
        updated++;
      }
    }
    res.json({ message: `${updated} équipement(s) mis à jour.`, updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la détection.' });
  }
});

router.post('/', requireRole('admin', 'chef'), async (req, res) => {
  const { nom } = req.body;
  if (!nom?.trim()) return res.status(400).json({ error: 'Nom requis.' });
  try {
    const result = await query(
      'INSERT INTO marques (nom) VALUES ($1) ON CONFLICT (nom) DO UPDATE SET nom = EXCLUDED.nom RETURNING *',
      [nom.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.delete('/:id', requireRole('admin', 'chef'), async (req, res) => {
  try {
    const result = await query('DELETE FROM marques WHERE id = $1 RETURNING nom', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Marque introuvable.' });
    res.json({ message: `Marque "${result.rows[0].nom}" supprimée.` });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

module.exports = router;
