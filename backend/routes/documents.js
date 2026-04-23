const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { query } = require('../db/pool');
const { auth }  = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
router.use(auth);

const MIME_TYPES_AUTORISES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/zip',
  'text/plain', 'text/csv'
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `doc_${Date.now()}_${base}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || 50) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (MIME_TYPES_AUTORISES.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`));
  }
});

router.post('/', upload.single('fichier'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' });
  const { chantier_id, salle_id, nom_original } = req.body;
  if (!chantier_id) return res.status(400).json({ error: 'chantier_id requis.' });

  const taille = req.file.size > 1048576
    ? `${(req.file.size / 1048576).toFixed(1)} Mo`
    : `${Math.round(req.file.size / 1024)} Ko`;

  try {
    const result = await query(
      `INSERT INTO documents (chantier_id, salle_id, nom_fichier, nom_original, chemin, taille_bytes, mime_type, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        chantier_id, salle_id || null,
        req.file.filename,
        nom_original || req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        req.user.id
      ]
    );
    await audit(parseInt(chantier_id), req.user,
      `Document ajouté : ${nom_original || req.file.originalname}`,
      'document', result.rows[0].id
    );
    res.status(201).json({ ...result.rows[0], taille });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Document introuvable.' });
    const doc = result.rows[0];
const filePath = doc.chemin.startsWith('/uploads/')
      ? path.join('/opt/avtrack/backend', doc.chemin)
      : path.join('/opt/avtrack/backend', doc.chemin.startsWith('uploads/') ? doc.chemin : 'uploads/' + path.basename(doc.chemin))
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier introuvable sur le disque.' });
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.nom_original)}"`);
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.sendFile(filePath);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM documents WHERE id = $1 RETURNING *', [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Document introuvable.' });
    const doc = result.rows[0];
    if (fs.existsSync(doc.chemin)) fs.unlink(doc.chemin, () => {});
    await audit(doc.chantier_id, req.user, `Document supprimé : ${doc.nom_original}`, 'document', doc.id);
    res.json({ message: `Document "${doc.nom_original}" supprimé.` });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

module.exports = router;
