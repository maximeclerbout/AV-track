const express = require('express');
const multer  = require('multer');
const { query } = require('../db/pool');
const { auth }  = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
router.use(auth);

const uploadMem = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const getChantierIdFromSalle = async (salleId) => {
  const r = await query('SELECT chantier_id FROM salles WHERE id = $1', [salleId]);
  return r.rows[0]?.chantier_id;
};

const getChantierIdFromProduit = async (produitId) => {
  const r = await query(
    'SELECT s.chantier_id FROM produits p JOIN salles s ON p.salle_id = s.id WHERE p.id = $1',
    [produitId]
  );
  return r.rows[0]?.chantier_id;
};

router.get('/salles/:sid/produits', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM produits WHERE salle_id = $1 ORDER BY position_ordre, type_equipement',
      [req.params.sid]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.post('/salles/:sid/produits', async (req, res) => {
  const { type_equipement, reference, serial_number, description,
          sur_reseau = false, ip, masque, gateway, dns, mdp } = req.body;

  if (!reference) return res.status(400).json({ error: 'La référence est requise.' });

  try {
    const result = await query(
      `INSERT INTO produits
        (salle_id, type_equipement, reference, serial_number, description,
         sur_reseau, ip, masque, gateway, dns, mdp, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.params.sid,
       type_equipement || 'Autre', reference, serial_number, description,
       sur_reseau, ip || null, masque || null, gateway || null, dns || null,
       mdp || null, req.user.id]
    );
    const produit = result.rows[0];
    const chantierId = await getChantierIdFromSalle(req.params.sid);
    await audit(chantierId, req.user,
      `Équipement ajouté : ${reference} (${type_equipement || 'Autre'})`,
      'produit', produit.id
    );
    res.status(201).json(produit);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.patch('/:id', async (req, res) => {
  const allowed = ['type_equipement','reference','serial_number','description',
                   'sur_reseau','ip','masque','gateway','dns','mdp','position_ordre'];
  const fields = [], vals = [];

  allowed.forEach(f => {
    if (req.body[f] !== undefined) {
      fields.push(`${f} = $${fields.length + 1}`);
      vals.push(req.body[f]);
    }
  });
  fields.push(`updated_by = $${fields.length + 1}`);
  vals.push(req.user.id);

  if (fields.length <= 1) return res.status(400).json({ error: 'Aucun champ à modifier.' });
  vals.push(req.params.id);

  try {
    const result = await query(
      `UPDATE produits SET ${fields.join(', ')} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Équipement introuvable.' });
    const produit = result.rows[0];
    const chantierId = await getChantierIdFromProduit(req.params.id);
    await audit(chantierId, req.user,
      `Équipement modifié : ${produit.reference}`, 'produit', produit.id, req.body
    );
    res.json(produit);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const chantierId = await getChantierIdFromProduit(req.params.id);
    const result = await query('DELETE FROM produits WHERE id = $1 RETURNING reference', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Équipement introuvable.' });
    await audit(chantierId, req.user,
      `Équipement supprimé : ${result.rows[0].reference}`, 'produit', parseInt(req.params.id)
    );
    res.json({ message: `Équipement "${result.rows[0].reference}" supprimé.` });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

module.exports = router;
