const express = require('express');
const { query } = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/categories — liste (all=true pour admin)
router.get('/', async (req, res) => {
  try {
    const all = req.query.all === 'true' && req.user?.role === 'admin'
    const result = await query(
      all
        ? 'SELECT * FROM categories_equipement ORDER BY ordre, nom'
        : 'SELECT * FROM categories_equipement WHERE actif = true ORDER BY ordre, nom'
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

// POST /api/categories — créer (admin seulement)
router.post('/', requireRole('admin'), async (req, res) => {
  const { nom, ordre = 0, couleur = '#7b8096' } = req.body;
  if (!nom) return res.status(400).json({ error: 'Nom requis.' });
  try {
    const result = await query(
      'INSERT INTO categories_equipement (nom, ordre, couleur, created_by) VALUES ($1,$2,$3,$4) RETURNING *',
      [nom, ordre, couleur, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Cette categorie existe deja.' });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PATCH /api/categories/:id — modifier (admin)
router.patch('/:id', requireRole('admin'), async (req, res) => {
  const { nom, ordre, actif, couleur, reseau_actif } = req.body;
  const fields = [], vals = [];
  if (nom !== undefined)         { fields.push('nom = $' + (fields.length+1));         vals.push(nom); }
  if (ordre !== undefined)       { fields.push('ordre = $' + (fields.length+1));       vals.push(ordre); }
  if (actif !== undefined)       { fields.push('actif = $' + (fields.length+1));       vals.push(actif); }
  if (couleur !== undefined)     { fields.push('couleur = $' + (fields.length+1));     vals.push(couleur); }
  if (reseau_actif !== undefined){ fields.push('reseau_actif = $' + (fields.length+1)); vals.push(reseau_actif); }
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
