const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
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

const progStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_DIR || './uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `extron_prog_${req.params.id}_${Date.now()}${ext}`);
  }
});
const uploadProg = multer({ storage: progStorage, limits: { fileSize: 100 * 1024 * 1024 } });

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

// GET toutes les photos d'une salle
router.get('/salles/:id/photos', async (req, res) => {
  try {
    let result = await query('SELECT * FROM salle_photos WHERE salle_id = $1 ORDER BY created_at ASC', [req.params.id]);
    // Migration auto : si pas de salle_photos mais photo_url existe, on l'insère
    if (result.rows.length === 0) {
      const salleResult = await query('SELECT photo_url FROM salles WHERE id = $1', [req.params.id]);
      if (salleResult.rows[0]?.photo_url) {
        const inserted = await query(
          'INSERT INTO salle_photos (salle_id, url) VALUES ($1, $2) RETURNING *',
          [req.params.id, salleResult.rows[0].photo_url]
        );
        return res.json(inserted.rows);
      }
    }
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

// POST ajouter une photo (multiple)
router.post('/salles/:id/photos', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier recu.' });
  try {
    const url = `/uploads/${req.file.filename}`;
    const inserted = await query(
      'INSERT INTO salle_photos (salle_id, url) VALUES ($1, $2) RETURNING *',
      [req.params.id, url]
    );
    const salle = await query('SELECT photo_url, chantier_id, nom FROM salles WHERE id = $1', [req.params.id]);
    if (!salle.rows[0].photo_url) {
      await query('UPDATE salles SET photo_url = $1 WHERE id = $2', [url, req.params.id]);
    }
    await audit(salle.rows[0].chantier_id, req.user, `Photo ajoutée pour "${salle.rows[0].nom}"`, 'salle', parseInt(req.params.id));
    res.json(inserted.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

// DELETE supprimer une photo spécifique
router.delete('/salles/:id/photos/:photoId', async (req, res) => {
  try {
    const result = await query('SELECT * FROM salle_photos WHERE id = $1 AND salle_id = $2', [req.params.photoId, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Photo introuvable.' });
    const photo = result.rows[0];
    const fs = require('fs');
    const filePath = path.join('/opt/avtrack/backend', photo.url);
    if (fs.existsSync(filePath)) fs.unlink(filePath, () => {});
    await query('DELETE FROM salle_photos WHERE id = $1', [photo.id]);
    const salle = await query('SELECT photo_url FROM salles WHERE id = $1', [req.params.id]);
    if (salle.rows[0].photo_url === photo.url) {
      const next = await query('SELECT url FROM salle_photos WHERE salle_id = $1 ORDER BY created_at ASC LIMIT 1', [req.params.id]);
      await query('UPDATE salles SET photo_url = $1 WHERE id = $2', [next.rows[0]?.url || null, req.params.id]);
    }
    res.json({ message: 'Photo supprimée.' });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_DIR || './uploads'),
  filename: (req, file, cb) => cb(null, `video_salle_${req.params.id}_${Date.now()}${path.extname(file.originalname)}`)
});
const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => file.mimetype.startsWith('video/') ? cb(null, true) : cb(new Error('Vidéo uniquement.'))
});

router.get('/salles/:id/videos', async (req, res) => {
  try {
    const result = await query('SELECT * FROM salle_videos WHERE salle_id = $1 ORDER BY created_at ASC', [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.post('/salles/:id/videos', uploadVideo.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier recu.' });
  try {
    const url = `/uploads/${req.file.filename}`;
    const inserted = await query(
      'INSERT INTO salle_videos (salle_id, url, nom_original, taille_bytes) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, url, req.file.originalname, req.file.size]
    );
    const salle = await query('SELECT chantier_id, nom FROM salles WHERE id = $1', [req.params.id]);
    await audit(salle.rows[0].chantier_id, req.user, `Vidéo ajoutée pour "${salle.rows[0].nom}"`, 'salle', parseInt(req.params.id));
    res.json(inserted.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.delete('/salles/:id/videos/:videoId', async (req, res) => {
  try {
    const result = await query('SELECT * FROM salle_videos WHERE id = $1 AND salle_id = $2', [req.params.videoId, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Vidéo introuvable.' });
    const video = result.rows[0];
    const filePath = path.join('/opt/avtrack/backend', video.url);
    const fsLib = require('fs');
    if (fsLib.existsSync(filePath)) fsLib.unlink(filePath, () => {});
    await query('DELETE FROM salle_videos WHERE id = $1', [video.id]);
    res.json({ message: 'Vidéo supprimée.' });
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
    const produitsResult = await query(
      `SELECT * FROM produits WHERE salle_id = $1
       ORDER BY
         CASE WHEN sur_reseau THEN 0 ELSE 1 END,
         CASE WHEN type_equipement = 'Autre' THEN 1 ELSE 0 END,
         type_equipement`,
      [req.params.id]
    );
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

// ── PROGRAMMES EXTRON ──────────────────────────────────────────────────────

router.get('/salles/:id/programmes', async (req, res) => {
  try {
    const result = await query(
      `SELECT sp.*, u.prenom || ' ' || u.nom AS uploaded_by_nom
       FROM salle_programmes sp
       LEFT JOIN users u ON sp.uploaded_by = u.id
       WHERE sp.salle_id = $1 ORDER BY sp.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/salles/:id/programmes', uploadProg.single('programme'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' });
  try {
    const url = `/uploads/${req.file.filename}`;
    const result = await query(
      `INSERT INTO salle_programmes (salle_id, nom_original, chemin, taille_bytes, mime_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, req.file.originalname, url, req.file.size, req.file.mimetype || 'application/octet-stream', req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/salles/:id/programmes/:fileId/download', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM salle_programmes WHERE id = $1 AND salle_id = $2',
      [req.params.fileId, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Fichier introuvable.' });
    const prog = result.rows[0];
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    const filepath = path.join(uploadDir, prog.chemin.replace(/^\/uploads\//, ''));
    if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Fichier manquant sur le disque.' });
    res.download(filepath, prog.nom_original);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.delete('/salles/:id/programmes/:fileId', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM salle_programmes WHERE id = $1 AND salle_id = $2',
      [req.params.fileId, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Fichier introuvable.' });
    const prog = result.rows[0];
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    const filepath = path.join(uploadDir, prog.chemin.replace(/^\/uploads\//, ''));
    if (fs.existsSync(filepath)) fs.unlink(filepath, () => {});
    await query('DELETE FROM salle_programmes WHERE id = $1', [req.params.fileId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
