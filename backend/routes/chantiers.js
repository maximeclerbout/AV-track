const express = require('express');
const ExcelJS = require('exceljs');
const archiver = require('archiver');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
router.use(auth);

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_DIR || './uploads'),
  filename: (req, file, cb) => cb(null, `chantier_${req.params.id}_${Date.now()}${path.extname(file.originalname)}`)
});
const uploadPhoto = multer({ storage: photoStorage, limits: { fileSize: 15 * 1024 * 1024 }, fileFilter: (req, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Image uniquement.')) });

router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        c.*,
        COUNT(DISTINCT s.id) AS nb_salles,
        COUNT(DISTINCT p.id) AS nb_produits,
        COUNT(DISTINCT s2.id) FILTER (WHERE s2.statut = 'termine') AS nb_salles_terminees
      FROM chantiers c
      LEFT JOIN salles s ON s.chantier_id = c.id
      LEFT JOIN produits p ON p.salle_id = s.id
      LEFT JOIN salles s2 ON s2.chantier_id = c.id
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/', requireRole('admin', 'chef', 'technicien'), async (req, res) => {
  const { nom, client, adresse, telephone, nom_contact, date_debut, date_fin, statut = 'a_faire', description, salles = [] } = req.body;
  if (!nom) return res.status(400).json({ error: 'Le nom du chantier est requis.' });

  try {
    const result = await query(
      `INSERT INTO chantiers (nom, client, adresse, telephone, nom_contact, date_debut, date_fin, statut, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [nom, client, adresse, telephone || null, nom_contact || null, date_debut || null, date_fin || null, statut, description, req.user.id]
    );
    const chantier = result.rows[0];
    const sallesACreer = salles.filter(s => s && s.trim());
    for (const nomSalle of sallesACreer) {
      await query(
        `INSERT INTO salles (chantier_id, nom, statut) VALUES ($1, $2, 'a_faire')`,
        [chantier.id, nomSalle.trim()]
      );
    }
    await audit(chantier.id, req.user, `Chantier "${nom}" créé${sallesACreer.length ? ` avec ${sallesACreer.length} salle(s)` : ''}`, 'chantier', chantier.id);
    res.status(201).json(chantier);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const chResult = await query('SELECT * FROM chantiers WHERE id = $1', [id]);
    if (chResult.rows.length === 0) return res.status(404).json({ error: 'Chantier introuvable.' });
    const chantier = chResult.rows[0];

    const sallesResult = await query(
      'SELECT * FROM salles WHERE chantier_id = $1 ORDER BY position_ordre, nom', [id]
    );

    const salles = await Promise.all(sallesResult.rows.map(async (salle) => {
      const produits = await query(
        'SELECT * FROM produits WHERE salle_id = $1 ORDER BY position_ordre, type_equipement', [salle.id]
      );
      return { ...salle, produits: produits.rows };
    }));

    const docs = await query(
      `SELECT d.*, u.nom || ' ' || u.prenom AS uploaded_by_nom
       FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id
       WHERE d.chantier_id = $1 ORDER BY d.created_at DESC`, [id]
    );

    const hist = await query(
      'SELECT * FROM historique WHERE chantier_id = $1 ORDER BY created_at DESC LIMIT 50', [id]
    );

    res.json({ ...chantier, salles, documents: docs.rows, historique: hist.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.patch('/:id', requireRole('admin', 'chef', 'technicien'), async (req, res) => {
  const { id } = req.params;
  const allowed = ['nom','client','adresse','telephone','nom_contact','date_debut','date_fin','statut','description'];
  const fields = [], vals = [];

allowed.forEach(f => {
    if (req.body[f] !== undefined) {
      fields.push(`${f} = $${fields.length + 1}`);
      const val = req.body[f];
      vals.push((f === 'date_debut' || f === 'date_fin') ? (val === '' ? null : val) : val);
    }
  });
  if (fields.length === 0) return res.status(400).json({ error: 'Aucun champ à modifier.' });
  vals.push(id);

  try {
    const result = await query(
      `UPDATE chantiers SET ${fields.join(', ')} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Chantier introuvable.' });
    if (req.body.statut === 'termine') {
      await query(`UPDATE salles SET statut = 'termine' WHERE chantier_id = $1 AND statut != 'termine'`, [id]);
    }
    await audit(parseInt(id), req.user, `Chantier modifié`, 'chantier', parseInt(id), req.body);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const result = await query('DELETE FROM chantiers WHERE id = $1 RETURNING nom', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Chantier introuvable.' });
    res.json({ message: `Chantier "${result.rows[0].nom}" supprimé.` });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/:id/export', async (req, res) => {
  try {
    const chResult = await query('SELECT * FROM chantiers WHERE id = $1', [req.params.id]);
    if (chResult.rows.length === 0) return res.status(404).json({ error: 'Chantier introuvable.' });
    const chantier = chResult.rows[0];

    const sallesResult = await query('SELECT * FROM salles WHERE chantier_id = $1', [req.params.id]);
    const sallesUnsorted = await Promise.all(sallesResult.rows.map(async salle => {
      const prods = await query(
        `SELECT * FROM produits WHERE salle_id = $1
         ORDER BY sur_reseau DESC, (type_equipement ILIKE 'autre'), type_equipement`,
        [salle.id]
      );
      return { ...salle, produits: prods.rows };
    }));
    const salles = sallesUnsorted.sort((a, b) =>
      a.nom.localeCompare(b.nom, undefined, { numeric: true, sensitivity: 'base' })
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AVTrack Pro';

    const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1D26' } };
    const HEADER_FONT = { bold: true, color: { argb: 'FF00D4FF' }, size: 11 };
    const BORDER = { style: 'thin', color: { argb: 'FF2A2D3A' } };
    const B = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };

    const recap = workbook.addWorksheet('Récapitulatif');
    recap.columns = [
      { header: 'Salle',       key: 'salle',   width: 25 },
      { header: 'Étage',       key: 'etage',   width: 12 },
      { header: 'Statut',      key: 'statut',  width: 15 },
      { header: 'Nb équip.',   key: 'nb_prod', width: 12 },
      { header: 'Commentaire', key: 'comment', width: 40 },
    ];
    recap.getRow(1).font = HEADER_FONT;
    recap.getRow(1).fill = HEADER_FILL;
    recap.getRow(1).eachCell(cell => { cell.border = B; });

    salles.forEach(s => {
      const row = recap.addRow({
        salle: s.nom, etage: s.etage || '',
        statut: s.statut.replace('_', ' '),
        nb_prod: s.produits.length,
        comment: s.commentaire || ''
      });
      row.eachCell(cell => { cell.border = B; });
    });

    salles.forEach(salle => {
      const sheetName = salle.nom.substring(0, 28).replace(/[\/\\?*\[\]]/g, '-');
      const ws = workbook.addWorksheet(sheetName);

      ws.addRow([`Salle : ${salle.nom} | Étage : ${salle.etage || '-'} | Statut : ${salle.statut}`]);
      ws.addRow([`Réseau — Masque : ${salle.net_masque || '-'} | Passerelle : ${salle.net_gateway || '-'} | DNS : ${salle.net_dns || '-'}`]);
      ws.addRow([]);

      ws.columns = [18,28,22,35,10,16,16,16,16,15].map((w,i) => ({ key: String(i), width: w }));

      const hRow = ws.addRow(['Type','Référence','N° Série','Description','Réseau','IP','Masque','Passerelle','DNS','MDP']);
      hRow.font = HEADER_FONT;
      hRow.fill = HEADER_FILL;
      hRow.eachCell(c => { c.border = B; });

      salle.produits.forEach(p => {
        const row = ws.addRow([
          p.type_equipement, p.reference, p.serial_number || '',
          p.description || '', p.sur_reseau ? 'Oui' : 'Non',
          p.ip || '', p.masque || '', p.gateway || '', p.dns || '',
          p.mdp ? '••••••' : ''
        ]);
        row.eachCell(c => { c.border = B; });
      });
    });

    const safeName = chantier.nom.replace(/[^a-zA-Z0-9-_]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=AVTrack_${safeName}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Erreur export Excel:', err);
    res.status(500).json({ error: 'Erreur génération Excel.' });
  }
});

router.get('/:id/export-template', async (req, res) => {
  try {
    const chResult = await query('SELECT * FROM chantiers WHERE id = $1', [req.params.id]);
    if (chResult.rows.length === 0) return res.status(404).json({ error: 'Chantier introuvable.' });
    const chantier = chResult.rows[0];

    const sallesResult = await query('SELECT * FROM salles WHERE chantier_id = $1', [req.params.id]);
    const sallesRaw = await Promise.all(sallesResult.rows.map(async salle => {
      const prods = await query(
        `SELECT * FROM produits WHERE salle_id = $1
         ORDER BY sur_reseau DESC, (type_equipement ILIKE 'autre'), type_equipement, position_ordre`,
        [salle.id]
      );
      return { ...salle, produits: prods.rows };
    }));
    const salles = sallesRaw.sort((a, b) =>
      a.nom.localeCompare(b.nom, undefined, { numeric: true, sensitivity: 'base' })
    );

    const mapStatutToExcel = (s) => {
      if (s === 'termine')    return 'Terminé';
      if (s === 'en_cours')   return 'En cours';
      if (s === 'a_terminer') return 'A terminer';
      if (s === 'probleme')   return 'Problème';
      return 'A faire';
    };
    const fmtDate = (d) => {
      if (!d) return '';
      const dt = new Date(d);
      return [String(dt.getDate()).padStart(2,'0'), String(dt.getMonth()+1).padStart(2,'0'), dt.getFullYear()].join('/');
    };

    const wb = new ExcelJS.Workbook();
    wb.creator = 'AVTrack Pro';
    const ws = wb.addWorksheet('Chantier');

    ws.columns = [
      { width: 18 }, { width: 22 }, { width: 12 },
      { width: 20 }, { width: 16 }, { width: 20 }, { width: 22 },
      { width: 14 }, { width: 13 },
      { width: 18 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 18 },
      { width: 18 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 18 },
      { width: 30 },
    ];

    const GREEN     = 'FF059669';
    const CARD_BG   = 'FF181B24';
    const YELLOW    = 'FFFFFDE7';
    const HEADER_FG = 'FFFFFFFF';
    const GRAY_TEXT = 'FF9CA3AF';

    const applyStyle = (cell, style) => Object.assign(cell, style);

    // Ligne 1 : Titre
    ws.mergeCells('A1:Z1');
    applyStyle(ws.getCell('A1'), {
      value: `AVTrack Pro  —  Export chantier : ${chantier.nom}`,
      font: { bold: true, size: 15, color: { argb: HEADER_FG }, name: 'Calibri' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } },
      alignment: { horizontal: 'center', vertical: 'middle' },
    });
    ws.getRow(1).height = 34;

    // Ligne 2 : Info
    ws.mergeCells('A2:Z2');
    applyStyle(ws.getCell('A2'), {
      value: 'Fichier exporté depuis AVTrack Pro — réimportable tel quel. NIC 2 = 2ème carte réseau (Dante, AV LAN…)',
      font: { italic: true, size: 10, color: { argb: GRAY_TEXT } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: CARD_BG } },
      alignment: { horizontal: 'center', vertical: 'middle' },
    });
    ws.getRow(2).height = 18;
    ws.getRow(3).height = 10;

    // Bloc infos chantier (lignes 4-7)
    const labelStyle = {
      font: { bold: true, size: 11, color: { argb: 'FFE8EAF0' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: CARD_BG } },
      alignment: { horizontal: 'right', vertical: 'middle' },
      border: { right: { style: 'thin', color: { argb: GREEN } } },
    };
    const valueStyle = {
      font: { size: 11, color: { argb: 'FF1F2937' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW } },
      border: { bottom: { style: 'medium', color: { argb: GREEN } } },
      alignment: { vertical: 'middle' },
    };

    const infoData = [
      [4, 'Client :', chantier.client || '', 'Nom du chantier :', chantier.nom || ''],
      [5, 'Adresse :', chantier.adresse || '', 'Date début (JJ/MM/AAAA) :', fmtDate(chantier.date_debut)],
      [6, 'Contact :', chantier.nom_contact || '', 'Date fin (JJ/MM/AAAA) :', fmtDate(chantier.date_fin)],
      [7, 'Téléphone :', chantier.telephone || '', null, null],
    ];

    infoData.forEach(([rowNum, leftLabel, leftVal, rightLabel, rightVal]) => {
      ws.getRow(rowNum).height = 24;
      applyStyle(ws.getCell(`A${rowNum}`), labelStyle);
      ws.getCell(`A${rowNum}`).value = leftLabel;
      ws.mergeCells(`B${rowNum}:E${rowNum}`);
      applyStyle(ws.getCell(`B${rowNum}`), valueStyle);
      ws.getCell(`B${rowNum}`).value = leftVal;
      if (rightLabel !== null) {
        applyStyle(ws.getCell(`F${rowNum}`), { ...labelStyle, border: { left: { style: 'thin', color: { argb: GREEN } }, right: { style: 'thin', color: { argb: GREEN } } } });
        ws.getCell(`F${rowNum}`).value = rightLabel;
        ws.mergeCells(`G${rowNum}:J${rowNum}`);
        applyStyle(ws.getCell(`G${rowNum}`), valueStyle);
        ws.getCell(`G${rowNum}`).value = rightVal;
      }
    });

    ws.getRow(10).height = 10;

    // Ligne 11 : Séparateur
    ws.mergeCells('A11:Z11');
    applyStyle(ws.getCell('A11'), {
      value: 'LISTE DES ÉQUIPEMENTS',
      font: { bold: true, size: 11, color: { argb: HEADER_FG } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: CARD_BG } },
      alignment: { horizontal: 'center', vertical: 'middle' },
    });
    ws.getRow(11).height = 20;

    // Ligne 12 : En-têtes
    const headers = [
      'Site', 'Salle', 'Étage',
      'Type Equipement', 'Marque', 'Modèle', 'S/N',
      'Etat', 'Réseau (O/N)',
      'Label NIC 1', 'Adresse IP', 'Masque', 'Passerelle', 'DNS 1', 'DNS 2', 'Identifiant', 'Mot de passe',
      'Label NIC 2', 'Adresse IP 2', 'Masque 2', 'Passerelle 2', 'DNS 1 (NIC2)', 'DNS 2 (NIC2)', 'Identifiant 2', 'Mot de passe 2',
      'Commentaire',
    ];
    const headerRow = ws.getRow(12);
    headerRow.height = 30;
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font  = { bold: true, size: 10, color: { argb: HEADER_FG } };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF10B981' } },
        bottom: { style: 'medium', color: { argb: 'FF10B981' } },
        left: { style: 'thin', color: { argb: 'FF10B981' } },
        right: { style: 'thin', color: { argb: 'FF10B981' } },
      };
    });

    // Couleurs pour les données
    const SITE_BG  = 'FFE8F5E9';
    const SITE_FG  = 'FF166534';
    const SEP_BG   = 'FF14532D';
    const ROW_BG_A = 'FFFFFFFF';
    const ROW_BG_B = 'FFF3F4F6';
    const BDR_STD  = { style: 'thin', color: { argb: 'FFD1D5DB' } };

    // Données équipements à partir de la ligne 13
    let rowIdx = 13;
    for (const salle of salles) {
      // ── Bandeau séparateur de salle ──────────────────────────────
      const sepNum = rowIdx++;
      ws.mergeCells(`A${sepNum}:Z${sepNum}`);
      ws.getRow(sepNum).height = 22;
      const sepCell = ws.getCell(`A${sepNum}`);
      sepCell.value = `  ▸  ${salle.nom}${salle.etage ? '   —   ' + salle.etage : ''}   (${salle.produits.length} équipement${salle.produits.length !== 1 ? 's' : ''})`;
      sepCell.font  = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      sepCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: SEP_BG } };
      sepCell.alignment = { vertical: 'middle' };

      if (salle.produits.length === 0) {
        const row = ws.getRow(rowIdx++);
        row.height = 18;
        [chantier.nom, salle.nom, salle.etage || '', '(aucun équipement)'].forEach((val, i) => {
          const cell = row.getCell(i + 1);
          cell.value = val;
          cell.font  = { size: 10, italic: true, color: { argb: GRAY_TEXT } };
          cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_BG_A } };
          cell.border = { bottom: BDR_STD, right: BDR_STD };
        });
      }

      for (let pi = 0; pi < salle.produits.length; pi++) {
        const p = salle.produits[pi];
        const curNum = rowIdx++;
        const row    = ws.getRow(curNum);
        row.height   = 18;
        const rowBg  = pi % 2 === 0 ? ROW_BG_A : ROW_BG_B;

        const vals = [
          chantier.nom,
          salle.nom,
          salle.etage || '',
          p.type_equipement || '',
          p.marque || '',
          p.modele || '',
          p.serial_number || '',
          mapStatutToExcel(p.statut_produit),
          p.sur_reseau ? 'O' : 'N',
          p.label_reseau1 || '',
          p.ip || '',
          p.masque || '',
          p.gateway || '',
          p.dns || '',
          p.dns_alt || '',
          p.login || '',
          p.mdp || '',
          p.label_reseau2 || '',
          p.ip2 || '',
          p.masque2 || '',
          p.gateway2 || '',
          p.dns2 || '',
          p.dns2_alt || '',
          p.login2 || '',
          p.mdp2 || '',
          p.description || '',
        ];

        vals.forEach((val, i) => {
          const cell      = row.getCell(i + 1);
          const isSiteCol = i < 3;
          cell.value      = val;
          cell.font       = { size: 10, color: { argb: isSiteCol ? SITE_FG : 'FF1F2937' } };
          cell.fill       = { type: 'pattern', pattern: 'solid', fgColor: { argb: isSiteCol ? SITE_BG : rowBg } };
          cell.alignment  = { vertical: 'middle' };
          cell.border     = { bottom: BDR_STD, right: BDR_STD };
        });
      }
    }

    ws.views = [{}];

    const safeName = chantier.nom.replace(/[^a-zA-Z0-9-_]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=AVTrack_export_${safeName}.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Erreur export template:', err);
    res.status(500).json({ error: 'Erreur export.' });
  }
});

router.get('/:id/photos-zip', async (req, res) => {
  try {
    const chResult = await query('SELECT * FROM chantiers WHERE id = $1', [req.params.id]);
    if (chResult.rows.length === 0) return res.status(404).json({ error: 'Chantier introuvable.' });
    const chantier = chResult.rows[0];

    const sallesResult = await query(
      'SELECT * FROM salles WHERE chantier_id = $1',
      [req.params.id]
    );
    const salles = sallesResult.rows.sort((a, b) =>
      a.nom.localeCompare(b.nom, undefined, { numeric: true, sensitivity: 'base' })
    );

    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    const safeCh = chantier.nom.replace(/[^a-zA-Z0-9-_]/g, '_');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="Photos_${safeCh}.zip"`);

    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.on('error', err => { if (!res.headersSent) res.status(500).end(); });
    archive.pipe(res);

    for (const salle of salles) {
      const photosResult = await query(
        'SELECT * FROM salle_photos WHERE salle_id = $1 ORDER BY created_at ASC',
        [salle.id]
      );
      if (photosResult.rows.length === 0) continue;

      const safeSalle = salle.nom.replace(/[^a-zA-Z0-9-_]/g, '_');
      photosResult.rows.forEach((photo, i) => {
        const filename = photo.url.replace(/^\/uploads\//, '');
        const filepath = path.join(uploadDir, filename);
        const ext = path.extname(filename) || '.jpg';
        const nb = photosResult.rows.length;
        const photoName = `${safeSalle}${nb > 1 ? '_' + (i + 1) : ''}${ext}`;
        if (fs.existsSync(filepath)) archive.file(filepath, { name: photoName });
      });
    }

    await archive.finalize();
  } catch (err) {
    console.error('Erreur export photos ZIP:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Erreur génération ZIP.' });
  }
});

router.post('/:id/photo', uploadPhoto.single('photo'), async (req, res) => {
  console.log('[Photo Chantier] POST reçu, id=' + req.params.id + ', file=' + (req.file?.filename || 'AUCUN'));
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier recu.' });
  try {
    const url = `/uploads/${req.file.filename}`;
    const old = await query('SELECT photo_url FROM chantiers WHERE id = $1', [req.params.id]);
    if (old.rows[0]?.photo_url) {
      const fp = path.join('/opt/avtrack/backend', old.rows[0].photo_url);
      if (fs.existsSync(fp)) fs.unlink(fp, () => {});
    }
    await query('UPDATE chantiers SET photo_url = $1 WHERE id = $2', [url, req.params.id]);
    console.log('[Photo Chantier] Sauvegardée : ' + url);
    res.json({ photo_url: url });
  } catch (err) {
    console.error('[Photo Chantier] ERREUR:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.delete('/:id/photo', async (req, res) => {
  try {
    const result = await query('SELECT photo_url FROM chantiers WHERE id = $1', [req.params.id]);
    if (result.rows[0]?.photo_url) {
      const fp = path.join('/opt/avtrack/backend', result.rows[0].photo_url);
      if (fs.existsSync(fp)) fs.unlink(fp, () => {});
    }
    await query('UPDATE chantiers SET photo_url = NULL WHERE id = $1', [req.params.id]);
    res.json({ message: 'Photo supprimée.' });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

module.exports = router;
