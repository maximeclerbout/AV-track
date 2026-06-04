const express = require('express')
const { query } = require('../db/pool')
const { auth } = require('../middleware/auth')
const { audit } = require('../middleware/audit')

const router = express.Router()
router.use(auth)

// GET validation d'un chantier (crée automatiquement si inexistante)
router.get('/chantier/:chantierId', async (req, res) => {
  const { chantierId } = req.params
  try {
    let result = await query(
      'SELECT * FROM validations_client WHERE chantier_id = $1 ORDER BY created_at DESC LIMIT 1',
      [chantierId]
    )
    let validation
    if (result.rows.length === 0) {
      const created = await query(
        'INSERT INTO validations_client (chantier_id) VALUES ($1) RETURNING *',
        [chantierId]
      )
      validation = created.rows[0]
    } else {
      validation = result.rows[0]
    }
    const articles = await query(
      'SELECT * FROM validation_articles WHERE validation_id = $1',
      [validation.id]
    )
    res.json({ ...validation, articles: articles.rows })
  } catch (err) {
    console.error('Erreur GET validation:', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// PATCH sauvegarder les articles (valide + commentaire)
router.patch('/:id/articles', async (req, res) => {
  const { id } = req.params
  const { articles } = req.body // [{ produit_id, valide, commentaire }]
  if (!Array.isArray(articles)) return res.status(400).json({ error: 'Articles requis.' })
  try {
    for (const article of articles) {
      await query(
        `INSERT INTO validation_articles (validation_id, produit_id, valide, commentaire)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (validation_id, produit_id)
         DO UPDATE SET valide = $3, commentaire = $4`,
        [id, article.produit_id, article.valide, article.commentaire || null]
      )
    }
    await query('UPDATE validations_client SET updated_at = NOW() WHERE id = $1', [id])
    res.json({ message: 'Articles sauvegardés.' })
  } catch (err) {
    console.error('Erreur PATCH articles:', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// POST signer (type: 'client' ou 'tech')
router.post('/:id/signer', async (req, res) => {
  const { id } = req.params
  const { type, signatureBase64, nom_signataire, date_signature } = req.body
  if (!['client', 'tech'].includes(type)) return res.status(400).json({ error: 'Type invalide.' })
  if (!signatureBase64 || !nom_signataire) return res.status(400).json({ error: 'Données manquantes.' })
  try {
    const col_sig  = type === 'client' ? 'signature_client'      : 'signature_tech'
    const col_nom  = type === 'client' ? 'nom_signataire_client'  : 'nom_signataire_tech'
    const col_date = type === 'client' ? 'date_signature_client'  : 'date_signature_tech'
    await query(
      `UPDATE validations_client SET ${col_sig} = $1, ${col_nom} = $2, ${col_date} = $3, updated_at = NOW() WHERE id = $4`,
      [signatureBase64, nom_signataire, date_signature || new Date(), id]
    )
    // Recalcul statut
    const val = (await query('SELECT * FROM validations_client WHERE id = $1', [id])).rows[0]
    let statut = 'en_cours'
    if (val.signature_client && val.signature_tech) statut = 'signe_complet'
    else if (val.signature_client) statut = 'signe_client'
    else if (val.signature_tech)   statut = 'signe_tech'
    await query('UPDATE validations_client SET statut = $1 WHERE id = $2', [statut, id])

    const chantierRes = await query('SELECT * FROM chantiers WHERE id = $1', [val.chantier_id])
    await audit(val.chantier_id, req.user, `Validation signée (${type}) par "${nom_signataire}"`, 'chantier', val.chantier_id)
    res.json({ message: 'Signature enregistrée.', statut })
  } catch (err) {
    console.error('Erreur signature validation:', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// GET générer PDF de la validation
router.get('/:id/pdf', async (req, res) => {
  try {
    const valResult = await query('SELECT * FROM validations_client WHERE id = $1', [req.params.id])
    if (!valResult.rows.length) return res.status(404).json({ error: 'Validation introuvable.' })
    const val = valResult.rows[0]

    const chantier = (await query('SELECT * FROM chantiers WHERE id = $1', [val.chantier_id])).rows[0]

    const articlesRows = (await query('SELECT * FROM validation_articles WHERE validation_id = $1', [val.id])).rows
    const artMap = {}
    articlesRows.forEach(a => { artMap[a.produit_id] = a })

    const sallesRows = (await query('SELECT * FROM salles WHERE chantier_id = $1 ORDER BY nom', [val.chantier_id])).rows
    const salles = await Promise.all(sallesRows.map(async s => {
      const prods = (await query('SELECT * FROM produits WHERE salle_id = $1 ORDER BY position_ordre, type_equipement', [s.id])).rows
      return { ...s, produits: prods }
    }))

    const { PDFDocument, rgb, StandardFonts } = require('pdf-lib')
    const pdfDoc   = await PDFDocument.create()
    const fontB    = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontR    = await pdfDoc.embedFont(StandardFonts.Helvetica)

    const GREEN    = rgb(0.039, 0.737, 0.506)
    const INDIGO   = rgb(0.38, 0.42, 0.94)
    const DARK     = rgb(0.1,  0.11, 0.14)
    const GRAY     = rgb(0.5,  0.5,  0.5)
    const WHITE    = rgb(1,    1,    1)
    const LT_GREEN = rgb(0.9,  0.98, 0.94)

    const W = 595, H = 842, M = 40
    const CW = W - M * 2

    // Colonnes : cb | type | ref | comment | ok
    const CB_X  = M + 6
    const TY_X  = M + 26
    const RF_X  = M + 220
    const CM_X  = M + 370
    const OK_X  = W - M - 16

    const trunc = (text, f, size, maxW) => {
      let t = String(text || '')
      if (f.widthOfTextAtSize(t, size) <= maxW) return t
      while (t.length > 0 && f.widthOfTextAtSize(t + '…', size) > maxW) t = t.slice(0, -1)
      return t + '…'
    }

    let page, y

    const newPage = () => {
      page = pdfDoc.addPage([W, H])
      // Header vert
      page.drawRectangle({ x: 0, y: H - 50, width: W, height: 50, color: GREEN })
      page.drawText('AVTrack Pro', { x: M, y: H - 33, font: fontB, size: 16, color: WHITE })
      page.drawText('Validation client', { x: W - M - 110, y: H - 33, font: fontR, size: 11, color: WHITE })
      // Footer
      const foot = `${chantier.nom}${chantier.client ? ' — ' + chantier.client : ''}`
      page.drawText(foot, { x: M, y: 18, font: fontR, size: 8, color: GRAY })
      y = H - 62
    }

    const ensure = (needed) => { if (y - needed < 55) newPage() }

    newPage()

    // ── Bloc infos chantier ─────────────────────────────────────
    ensure(80)
    page.drawRectangle({ x: M, y: y - 72, width: CW, height: 76, color: rgb(0.94, 0.98, 0.96), borderColor: GREEN, borderWidth: 1 })

    const info = (label, value, dy) => {
      page.drawText(label, { x: M + 8, y: y - dy, font: fontB, size: 9, color: GRAY })
      page.drawText(trunc(value || '—', fontR, 10, CW - 85), { x: M + 70, y: y - dy, font: fontR, size: 10, color: DARK })
    }
    info('Chantier :', chantier.nom, 14)
    info('Client :',   chantier.client, 28)
    if (chantier.nom_contact) info('Contact :', chantier.nom_contact + (chantier.telephone ? ' — ' + chantier.telephone : ''), 42)
    info('Adresse :', chantier.adresse, 56)
    const dateStr = new Date().toLocaleDateString('fr-FR')
    page.drawText(`Édité le ${dateStr}`, { x: M + 8, y: y - 69, font: fontR, size: 8, color: GRAY })
    y -= 84

    // ── Équipements par salle ───────────────────────────────────
    for (const salle of salles) {
      if (!salle.produits.length) continue

      ensure(32)
      // Bandeau salle
      const nbOk = salle.produits.filter(p => artMap[p.id]?.valide).length
      page.drawRectangle({ x: M, y: y - 24, width: CW, height: 25, color: DARK })
      page.drawText(trunc(`${salle.nom}${salle.etage ? '  —  ' + salle.etage : ''}`, fontB, 10, CW - 60), { x: M + 8, y: y - 16, font: fontB, size: 10, color: WHITE })
      const cntColor = nbOk === salle.produits.length ? rgb(0.6, 1, 0.8) : WHITE
      page.drawText(`${nbOk}/${salle.produits.length}`, { x: OK_X - 20, y: y - 16, font: fontB, size: 10, color: cntColor })
      y -= 27

      // En-têtes colonnes
      ensure(20)
      page.drawRectangle({ x: M, y: y - 18, width: CW, height: 19, color: rgb(0.91, 0.95, 0.92) })
      const hY = y - 12
      page.drawText('Équipement / Marque', { x: TY_X, y: hY, font: fontB, size: 8, color: GRAY })
      page.drawText('Référence / S/N',      { x: RF_X, y: hY, font: fontB, size: 8, color: GRAY })
      page.drawText('Commentaire',           { x: CM_X, y: hY, font: fontB, size: 8, color: GRAY })
      page.drawText('OK',                    { x: OK_X, y: hY, font: fontB, size: 8, color: GRAY })
      y -= 21

      // Produits
      for (let i = 0; i < salle.produits.length; i++) {
        const p   = salle.produits[i]
        const art = artMap[p.id]
        const ok  = art?.valide || false
        const cmt = art?.commentaire || ''
        const rowH = cmt ? 28 : 18

        ensure(rowH + 2)
        const rowBg = ok ? LT_GREEN : (i % 2 === 0 ? WHITE : rgb(0.97, 0.97, 0.97))
        page.drawRectangle({ x: M, y: y - rowH, width: CW, height: rowH, color: rowBg })

        // Bordure gauche verte si validé
        if (ok) page.drawRectangle({ x: M, y: y - rowH, width: 3, height: rowH, color: GREEN })

        // Checkbox
        const cbY = y - rowH + 4
        page.drawRectangle({ x: CB_X, y: cbY, width: 12, height: 12, borderColor: ok ? GREEN : rgb(0.75, 0.75, 0.75), borderWidth: 1.5, color: ok ? GREEN : WHITE })
        if (ok) {
          page.drawLine({ start: { x: CB_X + 2, y: cbY + 5 }, end: { x: CB_X + 5, y: cbY + 2 }, thickness: 1.5, color: WHITE })
          page.drawLine({ start: { x: CB_X + 5, y: cbY + 2 }, end: { x: CB_X + 11, y: cbY + 9 }, thickness: 1.5, color: WHITE })
        }

        // Textes
        const tY = y - (cmt ? 10 : rowH / 2 + 3)
        const typeStr = trunc([p.type_equipement, p.marque, p.modele].filter(Boolean).join(' '), fontR, 9, RF_X - TY_X - 6)
        page.drawText(typeStr, { x: TY_X, y: tY, font: ok ? fontB : fontR, size: 9, color: ok ? rgb(0.02, 0.45, 0.28) : DARK })

        const refStr = trunc([p.reference, p.serial_number ? 'S/N: ' + p.serial_number : ''].filter(Boolean).join(' / '), fontR, 8, CM_X - RF_X - 6)
        page.drawText(refStr, { x: RF_X, y: tY, font: fontR, size: 8, color: GRAY })

        if (cmt) {
          const cmtStr = trunc(cmt, fontR, 8, OK_X - CM_X - 10)
          page.drawText(cmtStr, { x: CM_X, y: tY, font: fontR, size: 8, color: DARK })
        }

        y -= rowH + 2
      }
      y -= 8
    }

    // ── Zone signatures ────────────────────────────────────────
    const SIG_H = 110
    ensure(SIG_H + 30)
    y -= 16
    page.drawText('Signatures', { x: M, y, font: fontB, size: 12, color: DARK })
    y -= 12

    const sigW = (CW - 16) / 2
    const clientX = M
    const techX   = M + sigW + 16

    const drawSigBox = async (x, bx, label, sigB64, nom, dateVal, borderColor, labelColor) => {
      page.drawRectangle({ x, y: bx - SIG_H, width: sigW, height: SIG_H, borderColor, borderWidth: 1.5, color: WHITE })
      page.drawText(label, { x: x + 8, y: bx - 16, font: fontB, size: 10, color: labelColor })
      if (nom) {
        page.drawText(nom, { x: x + 8, y: bx - 30, font: fontR, size: 9, color: DARK })
        if (dateVal) {
          const d = new Date(dateVal).toLocaleDateString('fr-FR')
          page.drawText(d, { x: x + 8, y: bx - 42, font: fontR, size: 9, color: GRAY })
        }
        if (sigB64) {
          try {
            const buf = Buffer.from(sigB64, 'base64')
            const img = await pdfDoc.embedPng(buf)
            page.drawImage(img, { x: x + 8, y: bx - SIG_H + 8, width: sigW - 16, height: 55 })
          } catch (_) {}
        }
      } else {
        page.drawText('Non signé', { x: x + 8, y: bx - SIG_H / 2 + 4, font: fontR, size: 10, color: rgb(0.75, 0.25, 0.25) })
      }
    }

    await drawSigBox(clientX, y, 'Client', val.signature_client, val.nom_signataire_client, val.date_signature_client, GREEN, GREEN)
    await drawSigBox(techX,   y, 'Technicien AVI', val.signature_tech, val.nom_signataire_tech, val.date_signature_tech, INDIGO, INDIGO)

    const pdfBytes = await pdfDoc.save()
    const safe = chantier.nom.replace(/[^a-zA-Z0-9-_]/g, '_')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Validation_${safe}.pdf"`)
    res.end(Buffer.from(pdfBytes))
  } catch (err) {
    console.error('Erreur PDF validation:', err)
    res.status(500).json({ error: 'Erreur génération PDF.' })
  }
})

module.exports = router
