const express = require('express')
const multer = require('multer')
const zlib = require('zlib')
const { query } = require('../db/pool')
const parser = require('xml2js')
const { auth } = require('../middleware/auth')
const { audit } = require('../middleware/audit')

const router = express.Router()
router.use(auth)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.xml') || file.mimetype === 'text/xml' || file.mimetype === 'application/xml') cb(null, true)
    else cb(new Error('Seuls les fichiers XML sont acceptes.'))
  }
})

const devinerType = (category, type) => {
  const c = (category || '').toLowerCase()
  const t = (type || '').toLowerCase()
  if (t.includes('projector') || t.includes('display') && t.includes('large')) return 'Videoprojecteur'
  if (t.includes('display') || t.includes('monitor') || t.includes('screen')) return 'TV'
  if (t.includes('switcher') || t.includes('matrix') || t.includes('switch')) return 'Matrice'
  if (t.includes('amplifier') || t.includes('amp')) return 'Amplificateur'
  if (t.includes('speaker') || t.includes('micro') || t.includes('audio') || c === 'audio') return 'Autre'
  if (t.includes('camera') || t.includes('codec') || t.includes('visio')) return 'Visio'
  if (t.includes('receiver') || t.includes('transmitter') || t.includes('distribution') || t.includes('hdbase')) return 'Switch AV'
  if (t.includes('control') || t.includes('controller') || t.includes('processor')) return 'Controleur'
  return 'Autre'
}

const decompresserXten = (buffer) => {
  try {
    // Décoder base64 + décompresser zlib
    const decoded = Buffer.from(buffer.toString(), 'base64')
    const decompressed = zlib.inflateRawSync(decoded)
    return decodeURIComponent(decompressed.toString('utf-8'))
  } catch (e) {
    return null
  }
}

const parseXtenXML = (xmlContent) => {
  const parser = require('xml2js')
  return new Promise((resolve, reject) => {
    parser.parseString(xmlContent, { explicitArray: true }, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

const pointDansRectangle = (px, py, rx, ry, rw, rh) => {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh
}

router.post('/parse', upload.single('fichier'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier XML requis.' })
  try {
    const xmlContent = req.file.buffer.toString('utf-8')
	const fs = require('fs')
    const path = require('path')
    const tmpName = 'import_xml_' + Date.now() + '.xml'
const tmpPath = path.join('/opt/avtrack/backend/uploads', tmpName)
    fs.writeFileSync(tmpPath, req.file.buffer)
    const tmpInfo = { tmpName, originalName: req.file.originalname, size: req.file.size }
    // Parser le XML externe (mxfile)
    const parsed = await parseXtenXML(xmlContent)
    const mxfile = parsed.mxfile
    if (!mxfile) return res.status(400).json({ error: 'Format XML non reconnu.' })

    const diagrams = mxfile.diagram || []
    let nomChantier = ''
    let toutes_zones = []
    let tous_equipements = []

    for (const diagram of diagrams) {
      const diagramName = diagram.$.name || diagram.$.xmlid || 'Synoptique'
      if (!nomChantier) nomChantier = diagramName

      // Décompresser le contenu
      const rawData = typeof diagram._ === 'string' ? diagram._ : (diagram.mxGraphModel ? null : diagram._)

      let innerXml = null
      if (rawData) {
        innerXml = decompresserXten(rawData.trim())
      } else if (diagram.mxGraphModel) {
        // Déjà décompressé
        const innerParsed = await parseXtenXML('<root>' + JSON.stringify(diagram.mxGraphModel) + '</root>')
        innerXml = JSON.stringify(diagram.mxGraphModel)
      }

      if (!innerXml) continue

      // Parser le XML interne
      let innerParsed
      try {
        innerParsed = await parseXtenXML(innerXml)
      } catch (e) {
        continue
      }

      const model = innerParsed.mxGraphModel
      if (!model || !model.root) continue

      const cells = model.root[0].mxCell || []

      // Collecter zones et équipements avec géométrie
      const cellsData = []
      for (const cell of cells) {
        const attrs = cell.$ || {}
        const geom = cell.mxGeometry ? cell.mxGeometry[0].$ : null
        if (!geom) continue

        cellsData.push({
          id: attrs.id,
          value: (attrs.value || '').replace(/&#10;/g, ' ').replace(/\n/g, ' ').trim(),
          product_name: (attrs.product_name || '').replace(/&#10;/g, ' ').replace(/\n/g, ' ').trim(),
          category: attrs.category || '',
          type: attrs.type || '',
          style: attrs.style || '',
          x: parseFloat(geom.x || 0),
          y: parseFloat(geom.y || 0),
          w: parseFloat(geom.width || 0),
          h: parseFloat(geom.height || 0),
        })
      }

      // Détecter les zones (rectangles avec nom de salle dans style text)
      const zonesLabel = cellsData.filter(c =>
        c.value && c.style.includes('text') &&
        (c.value.match(/^Zone\s/i) || c.value.match(/^Salle/i) || c.value.match(/^Room/i) || c.value.match(/^GB\d/i))
      )

      // Pour chaque zone label, trouver le rectangle parent (même position, grande taille)
      const zones = []
      const zonesVues = new Set()
      for (const zl of zonesLabel) {
        if (zonesVues.has(zl.value)) continue
        zonesVues.add(zl.value)
        // Chercher rectangle à la même position
        const rect = cellsData.find(c =>
          Math.abs(c.x - zl.x) < 10 &&
          Math.abs(c.y - zl.y) < 10 &&
          c.w > 100 && c.h > 100 &&
          c.id !== zl.id
        )
        zones.push({
          nom: zl.value,
          x: zl.x,
          y: zl.y,
          w: rect ? rect.w : 500,
          h: rect ? rect.h : 300,
        })
      }

      toutes_zones.push(...zones)

      // Équipements
      const equips = cellsData.filter(c => c.product_name && c.product_name.length > 1)

      // Associer chaque équipement à une zone
      for (const equip of equips) {
        let section = 'Salle principale'
        for (const zone of zones) {
          if (pointDansRectangle(equip.x, equip.y, zone.x, zone.y, zone.w, zone.h)) {
            section = zone.nom
            break
          }
        }

        // Dédoublonner par product_name + section
        const existing = tous_equipements.find(e =>
          e.product_name === equip.product_name && e.section === section
        )
        if (existing) {
          existing.quantite++
        } else {
          tous_equipements.push({
            product_name: equip.product_name,
            category: equip.category,
            type: equip.type,
            section,
            quantite: 1,
          })
        }
      }
    }

    // Formatter pour le frontend
    const sections = [...new Set(tous_equipements.map(e => e.section))]
    const articles = tous_equipements.map(e => ({
      reference: e.product_name,
      serial_number: '',
      description: e.type || e.category || '',
      type_equipement: devinerType(e.category, e.type),
      sur_reseau: false,
      quantite: e.quantite,
      section: e.section,
    }))

    res.json({
      tmpFile: tmpInfo,	
      client: '',
      adresse: '',
      titre: nomChantier,
      sections,
      articles
    })
  } catch (err) {
    console.error('Erreur parse XML:', err)
    res.status(500).json({ error: 'Erreur lecture XML : ' + err.message })
  }
})

router.post('/create', async (req, res) => {
  const { nom_chantier, client, adresse, salles_config, articles } = req.body
const { tmpFile } = req.body  
if (!nom_chantier || !articles?.length) {
    return res.status(400).json({ error: 'Donnees incompletes.' })
  }
  try {
    const chRes = await query(
      `INSERT INTO chantiers (nom, client, adresse, statut, description, created_by)
       VALUES ($1, $2, $3, 'a_faire', 'Importe depuis synoptique XML', $4) RETURNING *`,
      [nom_chantier, client, adresse, req.user.id]
    )
    const chantier = chRes.rows[0]

    const salleIds = {}
    if (salles_config && salles_config.length > 0) {
      for (const sc of salles_config) {
        const sRes = await query(
          `INSERT INTO salles (chantier_id, nom, statut) VALUES ($1, $2, 'a_faire') RETURNING id`,
          [chantier.id, sc.nom]
        )
        salleIds[sc.section] = sRes.rows[0].id
      }
    } else {
      const sRes = await query(
        `INSERT INTO salles (chantier_id, nom, statut) VALUES ($1, $2, 'a_faire') RETURNING id`,
        [chantier.id, 'Salle principale']
      )
      salleIds['default'] = sRes.rows[0].id
    }

    let nbProduits = 0
    for (const art of articles.filter(a => a.reference)) {
      const salleId = salleIds[art.section] || salleIds['default'] || Object.values(salleIds)[0]
      const qty = parseInt(art.quantite) || 1
      for (let q = 0; q < qty; q++) {
        await query(
          `INSERT INTO produits (salle_id, type_equipement, reference, description, sur_reseau, created_by)
           VALUES ($1, $2, $3, $4, false, $5)`,
          [salleId, art.type_equipement || 'Autre', art.reference, art.description || '', req.user.id]
        )
        nbProduits++
      }
    }

    await audit(chantier.id, req.user,
      'Chantier importe depuis synoptique XML : ' + nbProduits + ' equipement(s)',
      'chantier', chantier.id
    )
if (tmpFile) {
      const fs = require('fs')
      const path = require('path')
      const uploadDir = '/opt/avtrack/backend/uploads'
      const finalName = 'doc_' + Date.now() + '_' + tmpFile.originalName
      const finalPath = path.join(uploadDir, finalName)
      const tmpPath = path.join(uploadDir, tmpFile.tmpName)
      if (fs.existsSync(tmpPath)) {
        fs.renameSync(tmpPath, finalPath)
        await query(
          `INSERT INTO documents (chantier_id, nom_fichier, nom_original, chemin, taille_bytes, mime_type, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [chantier.id, finalName, tmpFile.originalName, '/uploads/' + finalName, tmpFile.size, 'application/xml', req.user.id]
        )
      }
    }
    res.status(201).json({ message: 'Import reussi !', chantier_id: chantier.id, nb_articles: nbProduits })
  } catch (err) {
    console.error('Erreur creation XML:', err)
    res.status(500).json({ error: 'Erreur creation : ' + err.message })
  }
})

module.exports = router
