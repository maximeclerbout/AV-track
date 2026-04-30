const express = require('express');
const ExcelJS = require('exceljs');
const { query } = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
router.use(auth);

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
  const { nom, client, adresse, telephone, nom_contact, date_debut, date_fin, statut = 'a_faire', description } = req.body;
  if (!nom) return res.status(400).json({ error: 'Le nom du chantier est requis.' });

  try {
    const result = await query(
      `INSERT INTO chantiers (nom, client, adresse, telephone, nom_contact, date_debut, date_fin, statut, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [nom, client, adresse, telephone || null, nom_contact || null, date_debut || null, date_fin || null, statut, description, req.user.id]
    );
    const chantier = result.rows[0];
    await audit(chantier.id, req.user, `Chantier "${nom}" créé`, 'chantier', chantier.id);
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

    const sallesResult = await query('SELECT * FROM salles WHERE chantier_id = $1 ORDER BY nom', [req.params.id]);
    const salles = await Promise.all(sallesResult.rows.map(async salle => {
      const prods = await query('SELECT * FROM produits WHERE salle_id = $1 ORDER BY type_equipement', [salle.id]);
      return { ...salle, produits: prods.rows };
    }));

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

module.exports = router;
