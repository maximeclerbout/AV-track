const express = require('express');
const multer  = require('multer');
const XLSX    = require('xlsx');
const ExcelJS = require('exceljs');
const { query, transaction } = require('../db/pool');
const { auth, requireRole }  = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { matchOrCreateClient } = require('../utils/clientMatcher');

const router = express.Router();
router.use(auth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

const mapStatut = (etat) => {
  if (!etat) return 'a_faire';
  const e = etat.toLowerCase();
  if (e.includes('recette ok') || e.includes('fait') || e.includes('termin')) return 'termine';
  if (e.includes('cours')) return 'en_cours';
  if (e.includes('probleme') || e.includes('problème')) return 'probleme';
  return 'a_faire';
};

const mapReseau = (val) => {
  if (!val) return false;
  return val.toString().toUpperCase().trim().startsWith('O');
};

const clean = (val) => {
  if (val === null || val === undefined) return '';
  const s = val.toString().trim();
  if (s === '?' || s === 'N/A' || s === '-') return '';
  return s;
};

// GET /api/import/excel/template — génère et télécharge le modèle Excel
router.get('/excel/template', requireRole('admin', 'chef'), async (req, res) => {
  try {
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

    const GREEN      = 'FF059669';
    const CARD_BG    = 'FF181B24';
    const YELLOW     = 'FFFFFDE7';
    const HEADER_FG  = 'FFFFFFFF';
    const GRAY_TEXT  = 'FF9CA3AF';
    const EXAMPLE_BG = 'FFF3F4F6';
    const SITE_EX_BG = 'FFE8F5E9';
    const SITE_EX_FG = 'FF166534';

    const applyStyle = (cell, style) => Object.assign(cell, style);

    // ── Ligne 1 : Titre ──────────────────────────────────────────
    ws.mergeCells('A1:Z1');
    applyStyle(ws.getCell('A1'), {
      value: 'AVTrack Pro  —  Modèle d\'import chantier',
      font: { bold: true, size: 15, color: { argb: HEADER_FG }, name: 'Calibri' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } },
      alignment: { horizontal: 'center', vertical: 'middle' },
    });
    ws.getRow(1).height = 34;

    // ── Ligne 2 : Instructions ────────────────────────────────────
    ws.mergeCells('A2:Z2');
    applyStyle(ws.getCell('A2'), {
      value: 'Remplissez les infos chantier (lignes 4-7), puis les équipements à partir de la ligne 13. Ne pas modifier les en-têtes. NIC 2 = 2ème carte réseau (Dante, AV LAN…)',
      font: { italic: true, size: 10, color: { argb: GRAY_TEXT } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: CARD_BG } },
      alignment: { horizontal: 'center', vertical: 'middle' },
    });
    ws.getRow(2).height = 18;
    ws.getRow(3).height = 10;

    // ── Bloc infos chantier (lignes 4-7) ─────────────────────────
    const labelStyle = (argb = CARD_BG) => ({
      font: { bold: true, size: 11, color: { argb: 'FFE8EAF0' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb } },
      alignment: { horizontal: 'right', vertical: 'middle' },
      border: { right: { style: 'thin', color: { argb: GREEN } } },
    });
    const inputCellStyle = {
      font: { size: 11, color: { argb: 'FF1F2937' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW } },
      border: { bottom: { style: 'medium', color: { argb: GREEN } } },
      alignment: { vertical: 'middle' },
    };

    const infoRows = [
      [4, 'Client :', 'G4', 'Nom du chantier :'],
      [5, 'Adresse :', 'G5', 'Date début (JJ/MM/AAAA) :'],
      [6, 'Contact :', 'G6', 'Date fin (JJ/MM/AAAA) :'],
      [7, 'Téléphone :', null, null],
    ];

    infoRows.forEach(([rowNum, leftLabel, rightLabelCell, rightLabel]) => {
      ws.getRow(rowNum).height = 24;
      applyStyle(ws.getCell(`A${rowNum}`), labelStyle(CARD_BG));
      ws.getCell(`A${rowNum}`).value = leftLabel;
      ws.mergeCells(`B${rowNum}:E${rowNum}`);
      applyStyle(ws.getCell(`B${rowNum}`), inputCellStyle);
      if (rightLabelCell && rightLabel) {
        applyStyle(ws.getCell(`F${rowNum}`), { ...labelStyle(CARD_BG), border: { left: { style: 'thin', color: { argb: GREEN } }, right: { style: 'thin', color: { argb: GREEN } } } });
        ws.getCell(`F${rowNum}`).value = rightLabel;
        ws.mergeCells(`G${rowNum}:J${rowNum}`);
        applyStyle(ws.getCell(`G${rowNum}`), inputCellStyle);
      }
    });

    ws.getRow(10).height = 10;

    // ── Ligne 11 : Séparateur section équipements ─────────────────
    ws.mergeCells('A11:Z11');
    applyStyle(ws.getCell('A11'), {
      value: 'LISTE DES ÉQUIPEMENTS',
      font: { bold: true, size: 11, color: { argb: HEADER_FG } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: CARD_BG } },
      alignment: { horizontal: 'center', vertical: 'middle' },
    });
    ws.getRow(11).height = 20;

    // ── Ligne 12 : En-têtes colonnes ──────────────────────────────
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

    // ── Lignes d'exemple (13-15) ──────────────────────────────────
    const BDR_EX = { style: 'thin', color: { argb: 'FFD1D5DB' } };
    const examples = [
      ['Bâtiment A', 'Salle Conférence 01', 'RDC',  'TV',             'Samsung', 'QM65B',      'SN-001234', 'A faire', 'O', 'Management', '192.168.1.10', '255.255.255.0', '192.168.1.1', '8.8.8.8', '8.8.4.4', 'admin', '',         '',      '',             '',              '',              '',        '',       '',          'Mur Nord'],
      ['Bâtiment A', 'Salle Conférence 01', '',     'Amplificateur',  'QSC',     'Q-SYS C110', 'SN-002345', 'A faire', 'O', 'Contrôle',   '192.168.1.20', '255.255.255.0', '192.168.1.1', '8.8.8.8', '',        'admin', 'admin123', 'Dante', '192.168.2.20', '255.255.255.0', '192.168.2.1', '8.8.8.8', '8.8.4.4', 'admin', '',          ''],
      ['Bâtiment A', 'Salle Réunion 02',    '1er',  'Videoprojecteur','Epson',   'EB-L615U',   '',          'A faire', 'N', '',            '',             '',              '',            '',        '',        '',      '',         '',      '',             '',              '',              '',        '',       '',          'Plafond'],
    ];
    examples.forEach((data, idx) => {
      const row = ws.getRow(13 + idx);
      row.height = 20;
      data.forEach((val, i) => {
        const cell = row.getCell(i + 1);
        cell.value = val;
        const isSite = i < 3;
        cell.font      = { italic: true, size: 10, color: { argb: isSite ? SITE_EX_FG : GRAY_TEXT } };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: isSite ? SITE_EX_BG : EXAMPLE_BG } };
        cell.alignment = { vertical: 'middle' };
        cell.border    = { bottom: BDR_EX, right: BDR_EX };
      });
    });

    // ── Note sous les exemples ────────────────────────────────────
    ws.getRow(16).height = 14;
    ws.mergeCells('A16:Z16');
    applyStyle(ws.getCell('A16'), {
      value: '⬆ Lignes d\'exemple — à supprimer avant import. Réseau : O = Oui, N = Non. États : A faire / En cours / Problème / Terminé. NIC 2 optionnel (Dante, AV LAN, etc.)',
      font: { italic: true, size: 9, color: { argb: GRAY_TEXT } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: EXAMPLE_BG } },
      alignment: { horizontal: 'center' },
    });

    ws.views = [{}];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="AVTrack_modele_import.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Erreur génération template:', err);
    res.status(500).json({ error: 'Erreur génération du modèle.' });
  }
});

// POST /api/import/excel — importer un chantier depuis Excel
router.post('/excel', requireRole('admin', 'chef'), upload.single('fichier'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier Excel requis.' });

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    let headerRow = -1;
    let headers   = [];
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const row = rows[i].map(c => c.toString().toLowerCase());
      if (row.some(c => c.includes('nom equipement') || c.includes('équipement') || c.includes('equipement'))) {
        headerRow = i;
        headers   = rows[i].map(c => c.toString().toLowerCase().trim());
        break;
      }
    }

    if (headerRow === -1) {
      return res.status(400).json({ error: 'Format non reconnu. Colonne "Nom Equipement" introuvable.' });
    }

    const col = {
      site:    headers.findIndex(h => h.includes('site')),
      salle:   headers.findIndex(h => h.includes('salle')),
      etage:   headers.findIndex(h => h.includes('tage') || h.includes('etage') || h.includes('étage')),
      nom:     headers.findIndex(h => h.includes('nom') && (h.includes('equip') || h.includes('équip'))),
      type:    headers.findIndex(h => h.includes('type')),
      etat:    headers.findIndex(h => h.includes('etat') || h.includes('état')),
      marque:  headers.findIndex(h => h.includes('marque')),
      modele:  headers.findIndex(h => h.includes('mod')),
      sn:      headers.findIndex(h => h === 's/n' || h.includes('serie') || h.includes('s/n')),
      reseau:  headers.findIndex(h => h.includes('r') && h.includes('seau') && !h.includes('adr')),
      label1:  headers.findIndex(h => h.includes('label') && (h.includes('1') || h.includes('nic 1'))),
      ip:      headers.findIndex(h => h === 'adresse ip' || h === 'ip' || (h.includes('adresse ip') && !h.includes('2'))),
      masque:  headers.findIndex(h => (h.includes('mask') || h === 'masque') && !h.includes('2')),
      gateway: headers.findIndex(h => h.includes('passerelle') && !h.includes('2')),
      dns1:    headers.findIndex(h => (h === 'dns 1' || h === 'dns1' || h === 'dns') && !h.includes('nic2')),
      dns_alt: headers.findIndex(h => h === 'dns 2' && !h.includes('nic2')),
      login:   headers.findIndex(h => (h === 'identifiant' || h === 'login') && !h.includes('2')),
      mdp:     headers.findIndex(h => (h.includes('mot de passe') || h.includes('password')) && !h.includes('2')),
      label2:  headers.findIndex(h => h.includes('label') && h.includes('2')),
      ip2:     headers.findIndex(h => h.includes('ip 2') || h.includes('ip2') || (h.includes('adresse ip') && h.includes('2'))),
      masque2: headers.findIndex(h => (h.includes('masque') || h.includes('mask')) && h.includes('2')),
      gateway2:headers.findIndex(h => h.includes('passerelle') && h.includes('2')),
      dns2:    headers.findIndex(h => h.includes('dns 1') && h.includes('nic2')),
      dns2_alt:headers.findIndex(h => h.includes('dns 2') && h.includes('nic2')),
      login2:  headers.findIndex(h => (h.includes('identifiant') || h.includes('login')) && h.includes('2')),
      mdp2:    headers.findIndex(h => (h.includes('mot de passe') || h.includes('password')) && h.includes('2')),
      comment: headers.findIndex(h => h.includes('commentaire')),
    };

    // Lecture flexible du bloc d'infos avant les en-têtes
    let nomClient = '', adresse = '', nomContact = '', telephone = '';
    for (let i = 0; i < headerRow; i++) {
      const row = rows[i];
      for (let j = 0; j < row.length - 1; j++) {
        const label = (row[j] || '').toString().toLowerCase().trim();
        const val   = clean(row[j + 1]);
        if (!val) continue;
        if (label.includes('client'))                                      nomClient  = val;
        if (label.includes('adresse'))                                     adresse    = val;
        if (label.includes('contact'))                                     nomContact = val;
        if (label.includes('phone') || label.includes('t') && label.includes('l') && label.endsWith(':')) telephone  = val;
      }
    }
    // Fallback: chercher "téléphone" plus explicitement
    for (let i = 0; i < headerRow; i++) {
      const row = rows[i];
      for (let j = 0; j < row.length - 1; j++) {
        const raw = (row[j] || '').toString();
        if (/t[eé]l[eé]phone/i.test(raw)) telephone = clean(row[j + 1]);
      }
    }

    const nomChantier = req.body.nom_chantier ||
      (nomClient ? nomClient : req.file.originalname.replace(/\.(xlsx|xls)$/i, ''));

    const sallesMap = {};
    let lastSite = '', lastSalle = '', lastEtage = '';
    let lignesVidesConsecutives = 0;

    for (let i = headerRow + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => !c)) {
        lignesVidesConsecutives++;
        if (lignesVidesConsecutives >= 2) break;
        continue;
      }
      lignesVidesConsecutives = 0;

      const nomEquip = clean(col.nom >= 0 ? row[col.nom] : '');
      if (!nomEquip) continue;

      const site  = clean(col.site  >= 0 ? row[col.site]  : '') || lastSite;
      const salle = clean(col.salle >= 0 ? row[col.salle] : '') || lastSalle;
      const etage = clean(col.etage >= 0 ? row[col.etage] : '') || lastEtage;
      if (site)  lastSite  = site;
      if (salle) lastSalle = salle;
      if (etage) lastEtage = etage;

      const salleKey = (site + '___' + salle).toLowerCase();
      if (!sallesMap[salleKey]) {
        sallesMap[salleKey] = { nom: salle || site || 'Salle principale', etage, statut: 'a_faire', produits: [] };
      }

      const marque    = clean(col.marque  >= 0 ? row[col.marque]  : '');
      const modele    = clean(col.modele  >= 0 ? row[col.modele]  : '');
      const ref       = [marque, modele].filter(Boolean).join(' ') || nomEquip;
      const typeEquip = clean(col.type    >= 0 ? row[col.type]    : '') || 'Autre';
      const surReseau = mapReseau(col.reseau >= 0 ? row[col.reseau] : '');
      const etat      = clean(col.etat    >= 0 ? row[col.etat]    : '');
      const statutSalle = mapStatut(etat);
      if (statutSalle !== 'a_faire') sallesMap[salleKey].statut = statutSalle;

      const hasNic2 = surReseau && col.ip2 >= 0 && clean(row[col.ip2]);
      sallesMap[salleKey].produits.push({
        type_equipement: typeEquip,
        reference:       ref,
        marque:          marque || null,
        modele:          modele || null,
        serial_number:   clean(col.sn      >= 0 ? row[col.sn]      : '') || null,
        description:     nomEquip + (clean(col.comment >= 0 ? row[col.comment] : '') ? ' — ' + clean(col.comment >= 0 ? row[col.comment] : '') : ''),
        statut_produit:  mapStatut(etat),
        sur_reseau:      surReseau,
        label_reseau1:   surReseau && col.label1   >= 0 ? clean(row[col.label1])   || null : null,
        ip:              surReseau && col.ip       >= 0 ? clean(row[col.ip])       || null : null,
        masque:          surReseau && col.masque   >= 0 ? clean(row[col.masque])   || null : null,
        gateway:         surReseau && col.gateway  >= 0 ? clean(row[col.gateway])  || null : null,
        dns:             surReseau && col.dns1     >= 0 ? clean(row[col.dns1])     || null : null,
        dns_alt:         surReseau && col.dns_alt  >= 0 ? clean(row[col.dns_alt])  || null : null,
        login:           surReseau && col.login    >= 0 ? clean(row[col.login])    || null : null,
        mdp:             surReseau && col.mdp      >= 0 ? clean(row[col.mdp])      || null : null,
        label_reseau2:   hasNic2 && col.label2    >= 0 ? clean(row[col.label2])   || null : null,
        ip2:             hasNic2                        ? clean(row[col.ip2])       || null : null,
        masque2:         hasNic2 && col.masque2   >= 0 ? clean(row[col.masque2])  || null : null,
        gateway2:        hasNic2 && col.gateway2  >= 0 ? clean(row[col.gateway2]) || null : null,
        dns2:            hasNic2 && col.dns2      >= 0 ? clean(row[col.dns2])     || null : null,
        dns2_alt:        hasNic2 && col.dns2_alt  >= 0 ? clean(row[col.dns2_alt]) || null : null,
        login2:          hasNic2 && col.login2    >= 0 ? clean(row[col.login2])   || null : null,
        mdp2:            hasNic2 && col.mdp2      >= 0 ? clean(row[col.mdp2])     || null : null,
      });
    }

    const salles = Object.values(sallesMap);
    if (salles.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée trouvée dans le fichier.' });
    }

    const { clientId, photoUrl } = await matchOrCreateClient(nomClient, { adresse, nom_contact: nomContact, telephone });

    const importResult = await transaction(async (dbClient) => {
      const chRes = await dbClient.query(
        `INSERT INTO chantiers (nom, client, adresse, nom_contact, telephone, statut, description, created_by, client_id, photo_url)
         VALUES ($1,$2,$3,$4,$5,'en_cours','Importé depuis Excel',$6,$7,$8) RETURNING *`,
        [nomChantier, nomClient, adresse, nomContact || null, telephone || null, req.user.id, clientId, photoUrl]
      );
      const chantier = chRes.rows[0];
      let totalProduits = 0;

      for (const salle of salles) {
        const sRes = await dbClient.query(
          `INSERT INTO salles (chantier_id, nom, etage, statut) VALUES ($1,$2,$3,$4) RETURNING id`,
          [chantier.id, salle.nom, salle.etage || null, salle.statut || 'a_faire']
        );
        const salleId = sRes.rows[0].id;
        for (const p of salle.produits) {
          await dbClient.query(
            `INSERT INTO produits (salle_id, type_equipement, reference, serial_number,
               description, sur_reseau,
               label_reseau1, ip, masque, gateway, dns, dns_alt, login, mdp,
               label_reseau2, ip2, masque2, gateway2, dns2, dns2_alt, login2, mdp2,
               marque, modele, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
            [salleId, p.type_equipement, p.reference, p.serial_number,
             p.description, p.sur_reseau,
             p.label_reseau1, p.ip, p.masque, p.gateway, p.dns, p.dns_alt, p.login, p.mdp,
             p.label_reseau2, p.ip2, p.masque2, p.gateway2, p.dns2, p.dns2_alt, p.login2, p.mdp2,
             p.marque, p.modele, req.user.id]
          );
          totalProduits++;
        }
      }
      return { chantier_id: chantier.id, nb_salles: salles.length, nb_produits: totalProduits };
    });

    const allMarques = [...new Set(salles.flatMap(s => s.produits.map(p => p.marque)).filter(Boolean))];
    for (const m of allMarques) {
      await query('INSERT INTO marques (nom) VALUES ($1) ON CONFLICT (nom) DO NOTHING', [m]);
    }

    await audit(importResult.chantier_id, req.user,
      `Chantier importé depuis Excel : ${importResult.nb_salles} salle(s), ${importResult.nb_produits} équipement(s)`,
      'chantier', importResult.chantier_id
    );

    res.status(201).json({
      message: 'Import réussi !',
      chantier_id: importResult.chantier_id,
      nb_salles:   importResult.nb_salles,
      nb_produits: importResult.nb_produits,
    });

  } catch (err) {
    console.error('Erreur import:', err);
    res.status(500).json({ error: 'Erreur lors de l\'import : ' + err.message });
  }
});

module.exports = router;
