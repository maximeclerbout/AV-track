const express = require('express');
const bcrypt  = require('bcryptjs');
const { query } = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', requireRole('admin', 'chef'), async (req, res) => {
  try {
    const result = await query(
      'SELECT id, nom, prenom, email, role, actif, last_login, created_at FROM users ORDER BY nom, prenom'
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.post('/', requireRole('admin'), async (req, res) => {
const { nom, prenom, email, password, role = 'technicien', poste = 'Technicien AV' } = req.body;
  if (!nom || !prenom || !email || !password) {
    return res.status(400).json({ error: 'Champs requis: nom, prenom, email, password.' });
  }
  if (password.length < 8) return res.status(400).json({ error: 'Mot de passe: 8 caractères minimum.' });

  try {
    const hash = await bcrypt.hash(password, 10)
    const result = await query(
      'INSERT INTO users (nom, prenom, email, password, role, poste, must_change_password) VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id, nom, prenom, email, role, poste',
      [nom, prenom, email.toLowerCase(), hash, role, poste || 'Technicien AV']
    )
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.patch('/:id', async (req, res) => {
  const targetId = parseInt(req.params.id);
  const isSelf = req.user.id === targetId;
  const isAdmin = req.user.role === 'admin';
  if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Accès refusé.' });

  const { nom, prenom, email, role, actif, poste } = req.body;
  try {
    const fields = [], vals = [];
    if (nom)    { fields.push(`nom = $${fields.length+1}`);    vals.push(nom); }
    if (prenom) { fields.push(`prenom = $${fields.length+1}`); vals.push(prenom); }
    if (email)  { fields.push(`email = $${fields.length+1}`);  vals.push(email.toLowerCase()); }
    if (isAdmin && role !== undefined)  { fields.push(`role = $${fields.length+1}`);  vals.push(role); }
    if (isAdmin && actif !== undefined) { fields.push(`actif = $${fields.length+1}`); vals.push(actif); }
    if (poste) { fields.push(`poste = $${fields.length+1}`); vals.push(poste); }
    if (req.body.must_change_password !== undefined) { fields.push(`must_change_password = $${fields.length+1}`); vals.push(req.body.must_change_password); }

    if (fields.length === 0) return res.status(400).json({ error: 'Aucun champ à modifier.' });
    vals.push(targetId);
    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${vals.length} RETURNING id, nom, prenom, email, role, actif`,
      vals
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email déjà utilisé.' });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
