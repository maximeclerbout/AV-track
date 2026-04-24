const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { query } = require('../db/pool');
const { auth }  = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
router.use(auth);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_DIR || './uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `salle_${req.params.id}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont acceptees.'));
  }
});

router.get('/chantiers/:cid/salles', async (req, res) => {
  try {
    const result = await query(
      `SELECT s.*, COUNT(p.id) AS nb_produits,
        COUNT(p.id) FILTER (WHERE p.sur_reseau) AS nb_reseau
       FROM salles s
       LEFT JOIN produits p ON p.salle_id = s.id
       WHERE s.chantier_id = $1
       GROUP BY s.id
       ORDER BY s.position_ordre, s.nom`,
      [req.params.cid]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.post('/chantiers/:cid/salles', async (req, res) => {
  const { nom, etage, statut = 'a_faire', commentaire, net_masque, net_gateway, net_dns } = req.body;
  if (!nom) return res.status(400).json({ error: 'Le nom de la salle est requis.' });
  try {
    const result = await query(
      `INSERT INTO salles (chantier_id, nom, etage, statut, commentaire, net_masque, net_gateway, net_dns)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.cid, nom, etage, statut, commentaire, net_masque || '255.255.255.0', net_gateway, net_dns]
    );
    const salle = result.rows[0];
    await audit(parseInt(req.params.cid), req.user, `Salle "${nom}" ajoutee`, 'salle', salle.id);
    res.status(201).json({ ...salle, produits: [] });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.patch('/salles/:id', async (req, res) => {
  const allowed = ['nom','etage','statut','commentaire','net_masque','net_gateway','net_dns','position_ordre'];
  const fields = [], vals = [];
  allowed.forEach(f => {
    if (req.body[f] !== undefined) {
      fields.push(`${f} = $${fields.length + 1}`);
      vals.push(req.body[f]);
    }
  });
  if (fields.length === 0) return res.status(400).json({ error: 'Aucun champ a modifier.' });
  vals.push(req.params.id);
  try {
    const result = await query(
      `UPDATE salles SET ${fields.join(', ')} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Salle introuvable.' });
    const salle = result.rows[0];
    const action = req.body.statut
      ? `Salle "${salle.nom}" statut "${req.body.statut}"`
      : `Salle "${salle.nom}" modifiee`;
    await audit(salle.chantier_id, req.user, action, 'salle', salle.id, req.body);
    res.json(salle);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.post('/salles/:id/apply-network', async (req, res) => {
  try {
    const salleResult = await query('SELECT * FROM salles WHERE id = $1', [req.params.id]);
    if (salleResult.rows.length === 0) return res.status(404).json({ error: 'Salle introuvable.' });
    const salle = salleResult.rows[0];
    const updated = await query(
      `UPDATE produits SET masque = $1, gateway = $2, dns = $3
       WHERE salle_id = $4 AND sur_reseau = true RETURNING id`,
      [salle.net_masque, salle.net_gateway, salle.net_dns, salle.id]
    );
    await audit(salle.chantier_id, req.user,
      `Reseau propage sur ${updated.rowCount} equipement(s) de "${salle.nom}"`,
      'salle', salle.id
    );
    res.json({ updated: updated.rowCount, message: `Reseau applique sur ${updated.rowCount} equipement(s).` });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.post('/salles/:id/photo', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier recu.' });
  try {
    const url = `/uploads/${req.file.filename}`;
    const result = await query(
      'UPDATE salles SET photo_url = $1 WHERE id = $2 RETURNING chantier_id, nom',
      [url, req.params.id]
    );
    await audit(result.rows[0].chantier_id, req.user,
      `Photo ajoutee pour la salle "${result.rows[0].nom}"`, 'salle', parseInt(req.params.id)
    );
    res.json({ photo_url: url });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.delete('/salles/:id/photo', async (req, res) => {
  try {
    const result = await query('SELECT photo_url, chantier_id, nom FROM salles WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Salle introuvable.' });
    const salle = result.rows[0];
    if (salle.photo_url) {
      const fs = require('fs');
      const filePath = path.join('/opt/avtrack/backend', salle.photo_url);
      if (fs.existsSync(filePath)) fs.unlink(filePath, () => {});
    }
    await query('UPDATE salles SET photo_url = NULL WHERE id = $1', [req.params.id]);
    await audit(salle.chantier_id, req.user, `Photo supprimee pour la salle "${salle.nom}"`, 'salle', parseInt(req.params.id));
    res.json({ message: 'Photo supprimee.' });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.delete('/salles/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM salles WHERE id = $1 RETURNING nom, chantier_id', [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Salle introuvable.' });
    const { nom, chantier_id } = result.rows[0];
    await audit(chantier_id, req.user, `Salle "${nom}" supprimee`, 'salle', parseInt(req.params.id));
    res.json({ message: `Salle "${nom}" supprimee.` });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.get('/salles/:id/export', async (req, res) => {
  try {
    const salleResult = await query('SELECT * FROM salles WHERE id = $1', [req.params.id]);
    if (salleResult.rows.length === 0) return res.status(404).json({ error: 'Salle introuvable.' });
    const salle = salleResult.rows[0];
    const produitsResult = await query('SELECT * FROM produits WHERE salle_id = $1 ORDER BY type_equipement', [req.params.id]);
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet(salle.nom.substring(0, 28));
    const BORDER = { style: 'thin', color: { argb: 'FF2A2D3A' } };
    const B = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
    ws.addRow(['Salle : ' + salle.nom + ' | Etage : ' + (salle.etage || '-') + ' | Statut : ' + salle.statut]);
    ws.addRow(['Reseau Masque : ' + (salle.net_masque || '-') + ' | Passerelle : ' + (salle.net_gateway || '-') + ' | DNS : ' + (salle.net_dns || '-')]);
    ws.addRow([]);
    ws.columns = [18,28,22,35,10,16,16,16,16,15].map((w,i) => ({ key: String(i), width: w }));
    const hRow = ws.addRow(['Type','Reference','N Serie','Description','Reseau','IP','Masque','Passerelle','DNS','MDP']);
    hRow.font = { bold: true, color: { argb: 'FF00D4FF' } };
    hRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1D26' } };
    hRow.eachCell(c => { c.border = B; });
    produitsResult.rows.forEach(p => {
      const row = ws.addRow([
        p.type_equipement, p.reference, p.serial_number || '',
        p.description || '', p.sur_reseau ? 'Oui' : 'Non',
        p.ip || '', p.masque || '', p.gateway || '', p.dns || '',
        p.mdp ? '------' : ''
      ]);
      row.eachCell(c => { c.border = B; });
    });
    if (produitsResult.rows.length === 0) ws.addRow(['Aucun equipement dans cette salle']);
    const safeName = salle.nom.replace(/[^a-zA-Z0-9-_]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Salle_' + safeName + '.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Erreur export salle:', err);
    res.status(500).json({ error: 'Erreur export.' });
  }
});

module.exports = router;
