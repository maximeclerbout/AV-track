const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { query } = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || './backups');
try {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
} catch (err) {
  console.error('[Backup] Impossible de créer le dossier backups :', err.message);
}

async function createBackupFile(prefix = 'backup') {
  const chantiersResult = await query('SELECT * FROM chantiers ORDER BY id');
  const chantiers = await Promise.all(chantiersResult.rows.map(async (chantier) => {
    const sallesResult = await query(
      'SELECT * FROM salles WHERE chantier_id = $1 ORDER BY position_ordre, nom',
      [chantier.id]
    );
    const salles = await Promise.all(sallesResult.rows.map(async (salle) => {
      const produitsResult = await query(
        'SELECT * FROM produits WHERE salle_id = $1 ORDER BY position_ordre',
        [salle.id]
      );
      return { ...salle, produits: produitsResult.rows };
    }));
    return { ...chantier, salles };
  }));

  const data = {
    version: '1.0',
    app: 'AVTrack Pro',
    created_at: new Date().toISOString(),
    chantiers
  };

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${prefix}_${ts}.json`;
  fs.writeFileSync(path.join(BACKUP_DIR, filename), JSON.stringify(data, null, 2));
  return filename;
}

async function autoBackup() {
  const today = new Date().toISOString().slice(0, 10);
  const files = fs.existsSync(BACKUP_DIR) ? fs.readdirSync(BACKUP_DIR) : [];
  const alreadyDone = files.some(f => f.startsWith(`backup_${today}`) && !f.includes('manual'));
  if (alreadyDone) return;
  try {
    const filename = await createBackupFile('backup');
    console.log(`[Backup] Sauvegarde automatique créée : ${filename}`);
  } catch (err) {
    console.error('[Backup] Erreur sauvegarde automatique :', err.message);
  }
}

// GET /api/backup/list
router.get('/list', requireRole('admin', 'chef'), (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return res.json([]);
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json') && f.startsWith('backup'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        const auto = !f.includes('manual');
        return { filename: f, size: stat.size, mtime: stat.mtime.toISOString(), auto };
      })
      .sort((a, b) => b.mtime.localeCompare(a.mtime));
    res.json(files);
  } catch {
    res.status(500).json({ error: 'Erreur lecture sauvegardes.' });
  }
});

// POST /api/backup/create — sauvegarde manuelle
router.post('/create', requireRole('admin', 'chef'), async (req, res) => {
  try {
    const filename = await createBackupFile('backup_manual');
    res.json({ filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur création sauvegarde.' });
  }
});

// GET /api/backup/download/:filename
router.get('/download/:filename', requireRole('admin', 'chef'), (req, res) => {
  const filename = req.params.filename.replace(/[^a-zA-Z0-9_\-\.]/g, '');
  if (!filename.endsWith('.json') || !filename.startsWith('backup')) {
    return res.status(400).json({ error: 'Fichier invalide.' });
  }
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Fichier introuvable.' });
  res.download(filepath, filename);
});

// DELETE /api/backup/:filename
router.delete('/:filename', requireRole('admin'), (req, res) => {
  const filename = req.params.filename.replace(/[^a-zA-Z0-9_\-\.]/g, '');
  if (!filename.endsWith('.json') || !filename.startsWith('backup')) {
    return res.status(400).json({ error: 'Fichier invalide.' });
  }
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Fichier introuvable.' });
  fs.unlinkSync(filepath);
  res.json({ message: 'Sauvegarde supprimée.' });
});

// POST /api/backup/restore — injection d'une sauvegarde
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/restore', requireRole('admin'), upload.single('backup'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier requis.' });

  let backup;
  try {
    backup = JSON.parse(req.file.buffer.toString('utf-8'));
  } catch {
    return res.status(400).json({ error: 'JSON invalide.' });
  }

  if (!Array.isArray(backup.chantiers)) {
    return res.status(400).json({ error: 'Format de sauvegarde invalide.' });
  }

  let imported = 0;
  try {
    for (const ch of backup.chantiers) {
      const chRes = await query(
        `INSERT INTO chantiers (nom, client, adresse, date_debut, date_fin, statut, description, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [ch.nom, ch.client || null, ch.adresse || null,
         ch.date_debut || null, ch.date_fin || null,
         ch.statut || 'a_faire', ch.description || null, req.user.id]
      );
      const chantierId = chRes.rows[0].id;

      for (const s of (ch.salles || [])) {
        const sRes = await query(
          `INSERT INTO salles (chantier_id, nom, etage, statut, commentaire, net_masque, net_gateway, net_dns, position_ordre)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
          [chantierId, s.nom, s.etage || null, s.statut || 'a_faire',
           s.commentaire || null, s.net_masque || '255.255.255.0',
           s.net_gateway || null, s.net_dns || null, s.position_ordre || 0]
        );
        const salleId = sRes.rows[0].id;

        for (const p of (s.produits || [])) {
          await query(
            `INSERT INTO produits (salle_id, type_equipement, reference, serial_number, description,
             sur_reseau, ip, masque, gateway, dns, mdp, position_ordre, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [salleId, p.type_equipement, p.reference, p.serial_number || null,
             p.description || null, p.sur_reseau || false,
             p.ip || null, p.masque || null, p.gateway || null,
             p.dns || null, p.mdp || null, p.position_ordre || 0, req.user.id]
          );
        }
      }
      imported++;
    }
    res.json({ message: `${imported} chantier(s) importé(s) avec succès.`, imported });
  } catch (err) {
    console.error('Erreur restore:', err);
    res.status(500).json({ error: 'Erreur lors de la restauration.' });
  }
});

module.exports = { router, autoBackup };
