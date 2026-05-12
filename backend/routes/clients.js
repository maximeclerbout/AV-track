const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_DIR || './uploads'),
  filename: (req, file, cb) => cb(null, `client_logo_${req.params.id}_${Date.now()}${path.extname(file.originalname)}`)
});
const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Image uniquement.'))
});

async function getClientFull(id) {
  const clientRes = await query('SELECT * FROM clients WHERE id = $1', [id]);
  if (clientRes.rows.length === 0) return null;
  const client = clientRes.rows[0];
  const adresses = await query('SELECT * FROM client_adresses WHERE client_id = $1 ORDER BY is_principale DESC, id ASC', [id]);
  const contacts = await query('SELECT * FROM client_contacts WHERE client_id = $1 ORDER BY id ASC', [id]);
  const nbChantiers = await query('SELECT COUNT(*) FROM chantiers WHERE client_id = $1', [id]);
  return { ...client, adresses: adresses.rows, contacts: contacts.rows, nb_chantiers: parseInt(nbChantiers.rows[0].count) };
}

// GET / - Liste tous les clients avec adresses et contacts
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*,
        COUNT(DISTINCT ch.id) AS nb_chantiers,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', ca.id, 'adresse', ca.adresse, 'is_principale', ca.is_principale))
          FILTER (WHERE ca.id IS NOT NULL), '[]') AS adresses,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', cc.id, 'nom', cc.nom, 'telephone', cc.telephone))
          FILTER (WHERE cc.id IS NOT NULL), '[]') AS contacts
      FROM clients c
      LEFT JOIN chantiers ch ON ch.client_id = c.id
      LEFT JOIN client_adresses ca ON ca.client_id = c.id
      LEFT JOIN client_contacts cc ON cc.client_id = c.id
      GROUP BY c.id
      ORDER BY c.nom ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /match?nom=xxx - Trouve un client par nom (pour autocomplete)
router.get('/match', async (req, res) => {
  const { nom } = req.query;
  if (!nom?.trim()) return res.json(null);
  try {
    const result = await query(
      `SELECT * FROM clients
       WHERE $1 ILIKE '%' || nom || '%' OR nom ILIKE '%' || $1 || '%'
       ORDER BY length(nom) DESC LIMIT 1`,
      [nom.trim()]
    );
    if (result.rows.length === 0) return res.json(null);
    const client = await getClientFull(result.rows[0].id);
    res.json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /search?q=xxx - Recherche pour autocomplete (retourne liste)
router.get('/search', async (req, res) => {
  const { q } = req.query;
  try {
    const result = await query(
      `SELECT id, nom, logo_url FROM clients
       WHERE nom ILIKE '%' || $1 || '%'
       ORDER BY nom ASC LIMIT 10`,
      [q?.trim() || '']
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const client = await getClientFull(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client introuvable.' });
    res.json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST / - Créer un client
router.post('/', requireRole('admin', 'chef'), async (req, res) => {
  const { nom, adresses = [], contacts = [] } = req.body;
  if (!nom?.trim()) return res.status(400).json({ error: 'Le nom du client est requis.' });
  try {
    const existing = await query('SELECT id FROM clients WHERE lower(nom) = lower($1)', [nom.trim()]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Un client avec ce nom existe déjà.' });

    const result = await query('INSERT INTO clients (nom) VALUES ($1) RETURNING *', [nom.trim()]);
    const client = result.rows[0];

    for (const adr of adresses) {
      if (adr.adresse?.trim()) {
        await query(
          'INSERT INTO client_adresses (client_id, adresse, is_principale) VALUES ($1, $2, $3)',
          [client.id, adr.adresse.trim(), !!adr.is_principale]
        );
      }
    }
    for (const contact of contacts) {
      if (contact.nom?.trim() || contact.telephone?.trim()) {
        await query(
          'INSERT INTO client_contacts (client_id, nom, telephone) VALUES ($1, $2, $3)',
          [client.id, contact.nom?.trim() || '', contact.telephone?.trim() || '']
        );
      }
    }

    const full = await getClientFull(client.id);
    res.status(201).json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PUT /:id - Modifier un client
router.put('/:id', requireRole('admin', 'chef'), async (req, res) => {
  const { nom, adresses = [], contacts = [] } = req.body;
  if (!nom?.trim()) return res.status(400).json({ error: 'Le nom est requis.' });
  try {
    const check = await query('SELECT id FROM clients WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Client introuvable.' });

    await query('UPDATE clients SET nom = $1, updated_at = NOW() WHERE id = $2', [nom.trim(), req.params.id]);

    await query('DELETE FROM client_adresses WHERE client_id = $1', [req.params.id]);
    for (const adr of adresses) {
      if (adr.adresse?.trim()) {
        await query(
          'INSERT INTO client_adresses (client_id, adresse, is_principale) VALUES ($1, $2, $3)',
          [req.params.id, adr.adresse.trim(), !!adr.is_principale]
        );
      }
    }

    await query('DELETE FROM client_contacts WHERE client_id = $1', [req.params.id]);
    for (const contact of contacts) {
      if (contact.nom?.trim() || contact.telephone?.trim()) {
        await query(
          'INSERT INTO client_contacts (client_id, nom, telephone) VALUES ($1, $2, $3)',
          [req.params.id, contact.nom?.trim() || '', contact.telephone?.trim() || '']
        );
      }
    }

    const full = await getClientFull(req.params.id);
    res.json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// DELETE /:id
router.delete('/:id', requireRole('admin', 'chef'), async (req, res) => {
  try {
    const check = await query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Client introuvable.' });
    const client = check.rows[0];

    if (client.logo_url) {
      const fp = path.join(process.env.UPLOAD_DIR || './uploads', client.logo_url.replace(/^\/uploads\//, ''));
      if (fs.existsSync(fp)) fs.unlink(fp, () => {});
    }

    await query('UPDATE chantiers SET client_id = NULL WHERE client_id = $1', [req.params.id]);
    await query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /:id/logo - Upload logo
router.post('/:id/logo', requireRole('admin', 'chef'), uploadLogo.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' });
  try {
    const old = await query('SELECT logo_url FROM clients WHERE id = $1', [req.params.id]);
    if (old.rows[0]?.logo_url) {
      const fp = path.join(process.env.UPLOAD_DIR || './uploads', old.rows[0].logo_url.replace(/^\/uploads\//, ''));
      if (fs.existsSync(fp)) fs.unlink(fp, () => {});
    }
    const url = `/uploads/${req.file.filename}`;
    await query('UPDATE clients SET logo_url = $1, updated_at = NOW() WHERE id = $2', [url, req.params.id]);
    res.json({ logo_url: url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// DELETE /:id/logo
router.delete('/:id/logo', requireRole('admin', 'chef'), async (req, res) => {
  try {
    const old = await query('SELECT logo_url FROM clients WHERE id = $1', [req.params.id]);
    if (old.rows[0]?.logo_url) {
      const fp = path.join(process.env.UPLOAD_DIR || './uploads', old.rows[0].logo_url.replace(/^\/uploads\//, ''));
      if (fs.existsSync(fp)) fs.unlink(fp, () => {});
    }
    await query('UPDATE clients SET logo_url = NULL, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
