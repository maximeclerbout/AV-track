const express = require('express');
const { query } = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/categories — liste pour tout le monde
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM categories_equipement WHERE actif = true ORDER BY ordre, nom'
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

// POST /api/categories — créer (admin seulement)
router.post('/', requireRole('admin'), async (req, res) => {
  const { nom, ordre = 0 } = req.body;
  if (!nom) return res.status(400).json({ error: 'Nom requis.' });
  try {
    const result = await query(
      'INSERT INTO categories_equipement (nom, ordre, created_by) VALUES ($1,$2,$3) RETURNING *',
      [nom, ordre, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Cette categorie existe deja.' });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PATCH /api/categories/:id — modifier (admin)
router.patch('/:id', requireRole('admin'), async (req, res) => {
  const { nom, ordre, actif } = req.body;
  const fields = [], vals = [];
  if (nom !== undefined)   { fields.push('nom = $' + (fields.length+1));   vals.push(nom); }
  if (ordre !== undefined) { fields.push('ordre = $' + (fields.length+1)); vals.push(ordre); }
  if (actif !== undefined) { fields.push('actif = $' + (fields.length+1)); vals.push(actif); }
  if (fields.length === 0) return res.status(400).json({ error: 'Rien a modifier.' });
  vals.push(req.params.id);
  try {
    const result = await query(
      'UPDATE categories_equipement SET ' + fields.join(', ') + ' WHERE id = $' + vals.length + ' RETURNING *',
      vals
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

// DELETE /api/categories/:id — supprimer (admin)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await query('DELETE FROM categories_equipement WHERE id = $1', [req.params.id]);
    res.json({ message: 'Categorie supprimee.' });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

module.exports = router;
