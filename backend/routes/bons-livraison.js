const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { query } = require('../db/pool')
const { auth } = require('../middleware/auth')
const { audit } = require('../middleware/audit')

const router = express.Router()
router.use(auth)

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, '/opt/avtrack/backend/uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, 'bl_' + Date.now() + ext)
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Seuls les fichiers PDF sont acceptes.'))
  }
})

// GET tous les BL d'un chantier
router.get('/chantier/:cid', async (req, res) => {
  try {
    const result = await query(
      `SELECT bl.*, u.prenom || ' ' || u.nom as uploaded_by_name
       FROM bons_livraison bl
       LEFT JOIN users u ON u.id = bl.uploaded_by
       WHERE bl.chantier_id = $1
       ORDER BY bl.created_at DESC`,
      [req.params.cid]
    )
    res.json(result.rows)
} catch (err) { console.error('BL UPLOAD ERROR:', err.message); res.status(500).json({ error: err.message }) }
})

// GET tous les BL (pour page secrétaire)
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT bl.*, c.nom as chantier_nom, c.client, c.statut as chantier_statut,
              u.prenom || ' ' || u.nom as uploaded_by_name
       FROM bons_livraison bl
       JOIN chantiers c ON c.id = bl.chantier_id
       LEFT JOIN users u ON u.id = bl.uploaded_by
       WHERE c.statut != 'termine'
       ORDER BY bl.created_at DESC`
    )
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }) }
})

// POST uploader un BL
router.post('/chantier/:cid', upload.single('fichier'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier PDF requis.' })
  try {
    const result = await query(
      `INSERT INTO bons_livraison (chantier_id, nom_fichier, nom_original, chemin, taille_bytes, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.cid, req.file.filename, req.file.originalname,
       '/uploads/' + req.file.filename, req.file.size, req.user.id]
    )
    await audit(parseInt(req.params.cid), req.user, `BL "${req.file.originalname}" uploade`, 'chantier', parseInt(req.params.cid))
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }) }
})

// GET télécharger un BL
router.get('/:id/download', async (req, res) => {
  try {
    const result = await query('SELECT * FROM bons_livraison WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'BL introuvable.' })
    const bl = result.rows[0]
    const filePath = path.join('/opt/avtrack/backend', bl.chemin)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier introuvable.' })
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(bl.nom_original)}"`)
    res.setHeader('Content-Type', 'application/pdf')
    res.sendFile(filePath)
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }) }
})

// GET télécharger le BL signé
router.get('/:id/download-signe', async (req, res) => {
  try {
    const result = await query('SELECT * FROM bons_livraison WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'BL introuvable.' })
    const bl = result.rows[0]
    if (!bl.chemin_signe) return res.status(404).json({ error: 'BL non signe.' })
    const filePath = path.join('/opt/avtrack/backend', bl.chemin_signe)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier introuvable.' })
    const nomSigne = bl.nom_original.replace('.pdf', '_signe.pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nomSigne)}"`)
    res.setHeader('Content-Type', 'application/pdf')
    res.sendFile(filePath)
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }) }
})

// POST sauvegarder BL signé (reçoit PDF en base64)
router.post('/:id/signer', async (req, res) => {
const { signatureBase64, pdfBase64, nom_signataire, commentaire, date_signature } = req.body
  if (!signatureBase64 && !pdfBase64) return res.status(400).json({ error: 'Signature requise.' })
  try {
    const result = await query('SELECT * FROM bons_livraison WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'BL introuvable.' })
    const bl = result.rows[0]

    // Sauvegarder le PDF signé
    const nomFichier = 'bl_signe_' + Date.now() + '.pdf'
    const filePath = path.join('/opt/avtrack/backend/uploads', nomFichier)

    // Copier le PDF original et y ajouter la signature
    const originalPath = path.join('/opt/avtrack/backend', bl.chemin)
    const { PDFDocument, rgb } = require('pdf-lib')
    const originalPdfBytes = fs.readFileSync(originalPath)
    const pdfDoc = await PDFDocument.load(originalPdfBytes)
    const pages = pdfDoc.getPages()
    const lastPage = pages[pages.length - 1]
    const { width, height } = lastPage.getSize()

    // Ajouter texte : nom, date, commentaire
    const { StandardFonts } = require('pdf-lib')
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    const firstPage = pages[0]
    const { height: ph } = firstPage.getSize()

// Tableau Date/Nom/Commentaires/Signature sur la page 1
// Positions calibrées pour BL AVI
    // Date : à gauche, ligne haute du tableau
   firstPage.drawText(date_signature || new Date().toLocaleDateString('fr-FR'), {
      x: 90, y: 558, size: 10, font, color: rgb(0, 0, 0)
    })
firstPage.drawText(nom_signataire, {
      x: 390, y: 558, size: 10, font, color: rgb(0, 0, 0)
    })
    if (commentaire) {
      firstPage.drawText(commentaire, {
        x: 90, y: 524, size: 10, font, color: rgb(0, 0, 0)
      })
    }
    if (signatureBase64) {
      const sigBuffer = Buffer.from(signatureBase64, 'base64')
      const sigImage = await pdfDoc.embedPng(sigBuffer)
  firstPage.drawImage(sigImage, {
        x: 330, y: 468, width: 180, height: 55
      })
    }

    const pdfBytes = await pdfDoc.save()
    fs.writeFileSync(filePath, pdfBytes)
    await query(
      `UPDATE bons_livraison SET
        chemin_signe = $1, statut = 'signe',
        nom_signataire = $2, commentaire = $3,
        date_signature = $4
       WHERE id = $5`,
      ['/uploads/' + nomFichier, nom_signataire, commentaire,
       date_signature || new Date(), req.params.id]
    )

    await audit(bl.chantier_id, req.user, `BL signe par "${nom_signataire}"`, 'chantier', bl.chantier_id)
    res.json({ message: 'BL signe avec succes.', chemin_signe: '/uploads/' + nomFichier })
  } catch (err) {
    console.error('Erreur signature BL:', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// DELETE supprimer un BL
router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM bons_livraison WHERE id = $1 RETURNING *', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'BL introuvable.' })
    const bl = result.rows[0]
    // Supprimer les fichiers
    const files = [bl.chemin, bl.chemin_signe].filter(Boolean)
    files.forEach(f => {
      const fp = path.join('/opt/avtrack/backend', f)
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
    })
    res.json({ message: 'BL supprime.' })
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }) }
})

module.exports = router
