const express = require('express');
const multer  = require('multer');
const XLSX    = require('xlsx');
const { query, transaction } = require('../db/pool');
const { auth, requireRole }  = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
router.use(auth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

const mapStatut = (etat) => {
  if (!etat) return 'a_faire';
  const e = etat.toLowerCase();
  if (e.includes('recette ok') || e.includes('fait')) return 'termine';
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

router.post('/excel', requireRole('admin', 'chef'), upload.single('fichier'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier Excel requis.' });

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

// Toujours prendre le PREMIER onglet uniquement
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    let headerRow = -1;
    let headers   = [];
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
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
      site:        headers.findIndex(h => h.includes('site')),
      salle:       headers.findIndex(h => h.includes('salle')),
      nom:         headers.findIndex(h => h.includes('nom') && (h.includes('equip') || h.includes('équip'))),
      etat:        headers.findIndex(h => h.includes('etat') || h.includes('état')),
      marque:      headers.findIndex(h => h.includes('marque')),
      modele:      headers.findIndex(h => h.includes('mod')),
      sn:          headers.findIndex(h => h === 's/n' || h.includes('serie') || h.includes('s/n')),
      reseau:      headers.findIndex(h => h.includes('r') && h.includes('seau') && !h.includes('adr')),
      ip:          headers.findIndex(h => h === 'adresse ip' || h === 'ip'),
      masque:      headers.findIndex(h => h.includes('mask')),
      gateway:     headers.findIndex(h => h.includes('passerelle')),
      dns1:        headers.findIndex(h => h.includes('dns 1') || h === 'dns1'),
      mdp:         headers.findIndex(h => h.includes('mot de passe') || h.includes('password')),
      commentaire: headers.findIndex(h => h.includes('commentaire')),
    };

    let nomClient = '';
    let adresse = '';
    for (let i = 0; i < headerRow; i++) {
      const row = rows[i];
      const label = (row[2] || '').toString().toLowerCase();
      if (label.includes('client')) nomClient = clean(row[3]);
      if (label.includes('adresse')) adresse = clean(row[3]);
    }

    const nomChantier = req.body.nom_chantier ||
      (nomClient ? nomClient : req.file.originalname.replace(/\.(xlsx|xls)$/i, ''));

    const sallesMap = {};
    let lastSite = '';
    let lastSalle = '';

let lignesVidesConsecutives = 0;
    for (let i = headerRow + 1; i < rows.length; i++) {
      const row = rows[i];

      // Arrêt si 2 lignes vides consécutives = fin du tableau principal
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
      if (site)  lastSite  = site;
      if (salle) lastSalle = salle;

      const salleKey = (site + '___' + salle).toLowerCase();
      if (!sallesMap[salleKey]) {
        sallesMap[salleKey] = {
          nom: salle || site || 'Salle principale',
          produits: []
        };
      }

      const marque    = clean(col.marque  >= 0 ? row[col.marque]  : '');
      const modele    = clean(col.modele  >= 0 ? row[col.modele]  : '');
      const ref       = [marque, modele].filter(Boolean).join(' ') || nomEquip;
      const surReseau = mapReseau(col.reseau >= 0 ? row[col.reseau] : '');
      const ip        = clean(col.ip      >= 0 ? row[col.ip]      : '');
      const masque    = clean(col.masque  >= 0 ? row[col.masque]  : '');
      const gateway   = clean(col.gateway >= 0 ? row[col.gateway] : '');
      const dns       = clean(col.dns1    >= 0 ? row[col.dns1]    : '');
      const mdp       = clean(col.mdp     >= 0 ? row[col.mdp]     : '');
      const sn        = clean(col.sn      >= 0 ? row[col.sn]      : '');
      const etat      = clean(col.etat    >= 0 ? row[col.etat]    : '');
      const comment   = clean(col.commentaire >= 0 ? row[col.commentaire] : '');

      sallesMap[salleKey].produits.push({
        type_equipement: 'Autre',
        reference:       ref,
        serial_number:   sn || null,
        description:     nomEquip + (comment ? ' — ' + comment : ''),
        sur_reseau:      surReseau,
        ip:              surReseau ? ip      : null,
        masque:          surReseau ? masque  : null,
        gateway:         surReseau ? gateway : null,
        dns:             surReseau ? dns     : null,
        mdp:             surReseau ? mdp     : null,
      });
    }

    const salles = Object.values(sallesMap);
    if (salles.length === 0) {
      return res.status(400).json({ error: 'Aucune donnee trouvee dans le fichier.' });
    }

    const importResult = await transaction(async (dbClient) => {
      const chRes = await dbClient.query(
        `INSERT INTO chantiers (nom, client, adresse, statut, description, created_by)
         VALUES ($1, $2, $3, 'en_cours', 'Importe depuis Excel', $4) RETURNING *`,
        [nomChantier, nomClient, adresse, req.user.id]
      );
      const chantier = chRes.rows[0];

      let totalProduits = 0;

      for (const salle of salles) {
        const sRes = await dbClient.query(
          `INSERT INTO salles (chantier_id, nom, statut)
           VALUES ($1, $2, 'en_cours') RETURNING id`,
          [chantier.id, salle.nom]
        );
        const salleId = sRes.rows[0].id;

        for (const p of salle.produits) {
          await dbClient.query(
            `INSERT INTO produits
              (salle_id, type_equipement, reference, serial_number,
               description, sur_reseau, ip, masque, gateway, dns, mdp, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [
              salleId, p.type_equipement, p.reference, p.serial_number,
              p.description, p.sur_reseau, p.ip, p.masque,
              p.gateway, p.dns, p.mdp, req.user.id
            ]
          );
          totalProduits++;
        }
      }

      return {
        chantier_id: chantier.id,
        nb_salles:   salles.length,
        nb_produits: totalProduits
      };
    });

    await audit(importResult.chantier_id, req.user,
      'Chantier importe depuis Excel : ' + importResult.nb_salles + ' salle(s), ' + importResult.nb_produits + ' equipement(s)',
      'chantier', importResult.chantier_id
    );

    res.status(201).json({
      message:     'Import reussi !',
      chantier_id: importResult.chantier_id,
      nb_salles:   importResult.nb_salles,
      nb_produits: importResult.nb_produits
    });

  } catch (err) {
    console.error('Erreur import:', err);
    res.status(500).json({ error: 'Erreur lors de l\'import : ' + err.message });
  }
});

module.exports = router;
