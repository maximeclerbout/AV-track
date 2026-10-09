const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { query } = require('../db/pool')
const { auth } = require('../middleware/auth')
const { audit } = require('../middleware/audit')
const { sendBlSigne } = require('../utils/mailer')

const router = express.Router()

// ── Positionnement dynamique du cartouche de signature ──────────────────────
// Le cartouche "Date / Nom / Commentaires / Signature" n'est pas toujours a la
// meme hauteur sur le BL PDF : elle depend de la taille du bloc adresse
// au-dessus (bloc "Client" present ou non, adresse plus ou moins longue...).
// Des coordonnees fixes finissent donc par ne plus coller au cartouche des que
// le gabarit du BDC evolue. On detecte donc la position reelle des libelles
// dans le PDF a signer avant d'y ecrire.
const decodeBlChar = (t) => {
  let raw = ''
  for (const r of t.R) {
    try { raw += decodeURIComponent(r.T) } catch { raw += r.T }
  }
  // Anomalie de police recontree sur certains PDF AVI : certaines lettres
  // majuscules sont decodees encadrees d'espaces (" C ") au lieu du caractere seul.
  return raw.replace(/^ ([A-Za-zÀ-ÿ]) $/, '$1')
}

const charsOfBlPage = (page) => {
  const chars = page.Texts.map(t => ({ x: t.x, y: t.y, txt: decodeBlChar(t) }))
  chars.sort((a, b) => a.y - b.y || a.x - b.x)
  const out = []
  for (const c of chars) {
    const prev = out[out.length - 1]
    // glyphe double (rendu gras) : meme caractere, position quasi identique
    if (prev && prev.txt === c.txt && Math.abs(prev.x - c.x) < 0.1 && Math.abs(prev.y - c.y) < 0.05) continue
    out.push(c)
  }
  return out
}

// Cherche un libelle (ex: "Date") caractere par caractere sur une meme ligne
const findBlLabel = (chars, label) => {
  const target = label.toLowerCase()
  for (let i = 0; i < chars.length; i++) {
    if (chars[i].txt.toLowerCase() !== target[0]) continue
    let j = i, k = 0, ok = true
    while (k < target.length) {
      if (j >= chars.length || Math.abs(chars[j].y - chars[i].y) > 0.1 || chars[j].txt.toLowerCase() !== target[k]) { ok = false; break }
      j++; k++
    }
    if (ok) return { y: chars[i].y, xEnd: chars[j - 1].x + 0.32 }
  }
  return null
}

const extractBlPages = (buffer) => new Promise((resolve, reject) => {
  const PDFParser = require('pdf2json')
  const parser = new PDFParser(null, 1)
  parser.on('pdfParser_dataError', reject)
  parser.on('pdfParser_dataReady', () => resolve(parser.data?.Pages || []))
  parser.parseBuffer(buffer)
})

// Renvoie les positions (en points PDF, origine bas-gauche comme pdf-lib) ou
// ecrire date/nom/commentaire/signature, detectees sur la 1ere page du PDF
// a signer. Renvoie null si la detection echoue (gabarit non reconnu).
const locateSignatureBox = async (pdfBytes, pageHeightPt) => {
  try {
    const pages = await extractBlPages(pdfBytes)
    const page = pages[0]
    if (!page) return null
    const chars = charsOfBlPage(page)
    const scale = pageHeightPt / page.Height

    const dateLbl = findBlLabel(chars, 'Date')
    const nomLbl = findBlLabel(chars, 'Nom')
    if (!dateLbl || !nomLbl) return null
    const commentLbl = findBlLabel(chars, 'Commentaires')
    const sigLbl = findBlLabel(chars, 'Signature')

    const BASELINE_OFFSET = 19 // decalage libelle -> ligne de base du texte saisi (calibre sur le gabarit AVI)
    const MARGIN = 6
    const toY = (y) => pageHeightPt - y * scale - BASELINE_OFFSET
    const toX = (xEnd) => xEnd * scale + MARGIN

    return {
      date: { x: toX(dateLbl.xEnd), y: toY(dateLbl.y) },
      nom: { x: toX(nomLbl.xEnd), y: toY(nomLbl.y) },
      commentaire: commentLbl ? { x: toX(commentLbl.xEnd), y: toY(commentLbl.y) } : null,
      signature: sigLbl ? { x: toX(sigLbl.xEnd), yTop: toY(sigLbl.y) } : null,
    }
  } catch (e) {
    return null
  }
}

// Route publique — accessible depuis un lien email sans connexion
router.get('/:id/download-signe', async (req, res) => {
  try {
    const result = await query('SELECT * FROM bons_livraison WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'BL introuvable.' })
    const bl = result.rows[0]
    if (!bl.chemin_signe) return res.status(404).json({ error: 'BL non signé.' })
    const filePath = path.join('/opt/avtrack/backend', bl.chemin_signe)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier introuvable.' })
    const nomSigne = bl.nom_original.replace('.pdf', '_signe.pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nomSigne)}"`)
    res.setHeader('Content-Type', 'application/pdf')
    res.sendFile(filePath)
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }) }
})

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

// GET affichage inline (iframe mobile) — token accepté en query param via auth middleware
router.get('/:id/inline', async (req, res) => {
  try {
    const result = await query('SELECT * FROM bons_livraison WHERE id = $1', [req.params.id])
    if (!result.rows.length) return res.status(404).send('Introuvable')
    const bl = result.rows[0]
    const filePath = path.join('/opt/avtrack/backend', bl.chemin)
    if (!fs.existsSync(filePath)) return res.status(404).send('Fichier introuvable')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(bl.nom_original)}"`)
    res.sendFile(filePath)
  } catch (err) { res.status(500).send('Erreur serveur') }
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

    // Tableau Date/Nom/Commentaires/Signature sur la page 1 — position
    // detectee dans ce PDF precis (elle varie selon la taille du bloc adresse
    // au-dessus), avec repli sur des coordonnees fixes si la detection echoue.
    const SIG_IMG_HEIGHT = 55
    const DEFAULTS = {
      date: { x: 90, y: 558 },
      nom: { x: 390, y: 558 },
      commentaire: { x: 90, y: 524 },
      signature: { x: 330, yTop: 523 },
    }
    const box = await locateSignatureBox(originalPdfBytes, ph)
    const pos = {
      date: box?.date || DEFAULTS.date,
      nom: box?.nom || DEFAULTS.nom,
      commentaire: box?.commentaire || DEFAULTS.commentaire,
      signature: box?.signature || DEFAULTS.signature,
    }

    firstPage.drawText(date_signature || new Date().toLocaleDateString('fr-FR'), {
      x: pos.date.x, y: pos.date.y, size: 10, font, color: rgb(0, 0, 0)
    })
    firstPage.drawText(nom_signataire, {
      x: pos.nom.x, y: pos.nom.y, size: 10, font, color: rgb(0, 0, 0)
    })
    if (commentaire) {
      firstPage.drawText(commentaire, {
        x: pos.commentaire.x, y: pos.commentaire.y, size: 10, font, color: rgb(0, 0, 0)
      })
    }
    if (signatureBase64) {
      const sigBuffer = Buffer.from(signatureBase64, 'base64')
      const sigImage = await pdfDoc.embedPng(sigBuffer)
      firstPage.drawImage(sigImage, {
        x: pos.signature.x, y: pos.signature.yTop - SIG_IMG_HEIGHT, width: 180, height: SIG_IMG_HEIGHT
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

    // Passer toutes les salles du chantier à "termine"
    await query(`UPDATE salles SET statut = 'termine' WHERE chantier_id = $1 AND statut != 'termine'`, [bl.chantier_id])

    // Si toutes les salles sont terminées → chantier "termine"
    const sallesRes = await query(`SELECT COUNT(*) FILTER (WHERE statut != 'termine') AS restantes FROM salles WHERE chantier_id = $1`, [bl.chantier_id])
    if (parseInt(sallesRes.rows[0].restantes) === 0) {
      await query(`UPDATE chantiers SET statut = 'termine' WHERE id = $1`, [bl.chantier_id])
    }

    // Email automatique à l'ADV
    const chantierRes = await query('SELECT * FROM chantiers WHERE id = $1', [bl.chantier_id])
    sendBlSigne({
      bl: { ...bl, id: req.params.id },
      chantier: chantierRes.rows[0] || { nom: '?', client: '' },
      signataire: nom_signataire,
      date: date_signature || new Date().toLocaleDateString('fr-FR'),
      fichierPath: filePath,
    }).catch(err => console.error('[Mail] Erreur async:', err.message))

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
