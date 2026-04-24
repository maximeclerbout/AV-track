const express = require('express')
const multer = require('multer')
const PDFParser = require('pdf2json')
const { query } = require('../db/pool')
const { auth } = require('../middleware/auth')
const { audit } = require('../middleware/audit')

const router = express.Router()
router.use(auth)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Seuls les fichiers PDF sont acceptes.'))
  }
})

const extractPdfText = (buffer) => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1)
    pdfParser.on('pdfParser_dataError', err => reject(err))
    pdfParser.on('pdfParser_dataReady', () => {
      resolve(pdfParser.getRawTextContent())
    })
    pdfParser.parseBuffer(buffer)
  })
}

const LIGNES_A_IGNORER = [
  'main d', 'moft', 'logistique', 'livr-m', 'acompte', 'avi-acpt',
  'recycl', 'ecotax', 'deee', 'cgv', 'sous-total', 'iban',
  'conditions de paiement', 'montant hors taxes', 'installation',
  'fourn-m', 'siret', 'page :', 'av-i.fr', 'alexandre dumas',
  'vaulx-en-velin', 'page (', '-page', 'break-', 'audio vid', 'page (', '-page', 'break-', 'audio vid', 'article', 'ref. constr', 'commande #',
  'ddaattee', 'ttiittrree', 'mmaatt', 'aarrttiiccllee', 'rreeff',
  'loc ', 'livr', 'ecotx', 'forfait logistique',
  'gestion des dechets', 'location mat', 'contrat', 'maintenance',
  'cmniv', 'fourn'
]

const ignorerLigne = (texte) => {
  const t = texte.toLowerCase().trim()
  if (!t || t.length < 4) return true
  return LIGNES_A_IGNORER.some(mot => t.includes(mot))
}

const devinerType = (texte) => {
  const t = texte.toLowerCase()
  if (t.includes('projecteur') || t.includes('epson') || t.includes('videopro')) return 'Videoprojecteur'
  if (t.includes('ecran') || t.includes('samsung') || t.includes('qm') || t.includes('display') || t.includes('moniteur') || t.includes('flip')) return 'TV'
  if (t.includes('matrice') || t.includes('switcher') || t.includes('selecteur')) return 'Matrice'
  if (t.includes('ampli') && !t.includes('hdmi')) return 'Amplificateur'
  if (t.includes('micro') || t.includes('sennheiser') || t.includes('enceinte') || t.includes('balun') || t.includes('audio')) return 'Autre'
  if (t.includes('visio') || t.includes('camera') || t.includes('confer') || t.includes('poly') || t.includes('teams')) return 'Visio'
  if (t.includes('dtp') || t.includes('hdbase') || t.includes('distributeur') || t.includes('recepteur') || t.includes('extron') || t.includes('switch')) return 'Switch AV'
  if (t.includes('controleur') || t.includes('control') || t.includes('automate') || t.includes('crestron') || t.includes('reservation')) return 'Controleur'
  return 'Autre'
}
const normaliserTexte = (texte) => {
  // Convertit "OOFFFFIICCEE" en "OFFICE" — double police PDF
  // Seulement si TOUTES les lettres sont doublées (pattern régulier)
  const doubles = texte.replace(/(.)\1/g, '$1')
  // Vérifie que c'est bien une double police (au moins 4 doublons consécutifs)
  if ((texte.match(/(.)\1/g) || []).length >= 3) return doubles.trim()
  return texte.trim()
}
router.post('/parse', upload.single('fichier'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier PDF requis.' })
  try {
    const texte = await extractPdfText(req.file.buffer)
	// Sauvegarder temporairement le fichier
    const fs = require('fs')
    const path = require('path')
    const tmpName = 'import_pdf_' + Date.now() + '.pdf'
const tmpPath = path.join('/opt/avtrack/backend/uploads', tmpName)
    fs.writeFileSync(tmpPath, req.file.buffer)
    const tmpInfo = { tmpName, originalName: req.file.originalname, size: req.file.size }
    const lignes = texte.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 2)

    let client = ''
    let adresse = ''
    let titre = ''

    const titreLigne = lignes.find(l =>
      l.match(/^(Travaux|Projet|Installation|Deploiement|Remplacement|Renovation|Mise en|Creation)/i)
    )
    if (titreLigne) titre = titreLigne.trim()

for (let i = 0; i < lignes.length; i++) {
      const l = lignes[i]
      const lLow = l.toLowerCase()
if (lLow.includes('adresse de facturation') || lLow.includes('aaddrreessssee') || lLow.includes('aaddrr')) {
        // Cas 1 : client sur la même ligne après "::"
        const apresDouble = l.split('::')[1] || l.split(':')[1] || ''
        const clientSurLigne = apresDouble.trim().replace(/\s{2,}.*/, '').trim()
        if (clientSurLigne.length > 2 && !clientSurLigne.includes('Page') && !clientSurLigne.includes('Break')) {
          client = normaliserTexte(clientSurLigne).replace(/,\s*(Facturation|facturation).*$/, '').trim()
// Adresse = cherche ZI, rue, avenue, CS dans les lignes suivantes AVANT "France" ou "TVA"
          for (let j = i + 1; j < Math.min(i + 8, lignes.length); j++) {
            const next = normaliserTexte(lignes[j].trim())
            if (next.match(/^France$/i) || next.match(/^TVA/) || next.includes('Break') || next.includes('Page')) break
            if (next.length > 3 &&
                !next.match(/^\d{5}\s/) &&
                !next.toLowerCase().includes('alexandre') &&
                !next.toLowerCase().includes('audio') &&
                !next.toLowerCase().includes('vaulx')) {
              adresse = next
              break
            }
          }          break
        }
        // Cas 2 : client sur la ligne suivante
        for (let j = i + 1; j < Math.min(i + 8, lignes.length); j++) {
          const next = lignes[j].trim()
          const nextNorm = normaliserTexte(next)
          if (nextNorm.length > 2 &&
              !nextNorm.match(/^France$/i) &&
              !nextNorm.match(/^TVA/) &&
              !nextNorm.match(/^\+\d/) &&
              !nextNorm.match(/^\d{5}/) &&
              !nextNorm.match(/^CS\s/i) &&
              !nextNorm.match(/^ZI\s/i) &&
              !nextNorm.toLowerCase().includes('facturation') &&
              !nextNorm.toLowerCase().includes('expedition') &&
              !nextNorm.toLowerCase().includes('alexandre') &&
              !nextNorm.toLowerCase().includes('vaulx') &&
              !nextNorm.toLowerCase().includes('audio') &&
              !nextNorm.toLowerCase().includes('integration') &&
              !nextNorm.includes('Break') &&
              !nextNorm.includes('Page')) {
            client = nextNorm.replace(/,\s*(Facturation|facturation).*$/, '').trim()
            const adresseLigne = normaliserTexte(lignes[j + 1]?.trim() || '')
            adresse = adresseLigne.match(/^(CS|ZI)\s/i) ? normaliserTexte(lignes[j + 2]?.trim() || '') : adresseLigne
            break
          }
        }
        break
      }
    }

    const SECTION_REGEX = /^[A-Z][A-Z\s\-\/]{2,39}$/
    const SECTIONS_EXCLUES = ['TVA', 'SIRET', 'IBAN', 'CGV', 'AVI', 'ARTICLE', 'TOTAL',
      'TAXES', 'DEEE', 'FRANCE', 'MATERIEL', 'FOURNITURES', 'OFFICE']

    const sections = []
    let sectionCourante = 'Salle principale'
    const articles = []
    const marqueRegex = /\[([A-Z0-9][A-Z0-9\-\/\.\s]+)\]\s+\[([^\]]+)\]\s+(.+)/

    for (let i = 0; i < lignes.length; i++) {
      const ligne = lignes[i].trim()

      if (SECTION_REGEX.test(ligne) &&
          !ignorerLigne(ligne) &&
          !SECTIONS_EXCLUES.some(s => ligne.includes(s)) &&
          !ligne.match(/^\[/) &&
          ligne.length > 4) {
const ligneNorm = normaliserTexte(ligne)
        if (!sections.includes(ligneNorm)) sections.push(ligneNorm)
        sectionCourante = ligneNorm
        continue
      }

      if (ignorerLigne(ligne)) continue

      const match = ligne.match(marqueRegex)
      if (match) {
        const marque = match[2].trim()
        const reste = match[3]
        const descBrut = reste.split(/\s{2,}/)[0].trim()
        const desc = descBrut
          .replace(/\s+[A-Z0-9][A-Z0-9\-\/\.]{5,}(\s+\d.*)?$/, '')
          .replace(/\s*\d+[,\.]\d{4}.*$/, '')
          .replace(/\s+\/\/\s+.*$/, '')
          .trim()
        const qteMatch = reste.match(/(\d+)[,\.](\d{4})/)
        const quantite = qteMatch ? Math.round(parseFloat(qteMatch[1] + '.' + qteMatch[2])) : 1

        if (!ignorerLigne(desc) && desc.length > 2 && !ignorerLigne(marque)) {
          const reference = (marque + ' ' + desc).substring(0, 80)
          if (!articles.some(a => a.reference === reference && a.section === sectionCourante)) {
            articles.push({
              reference,
              serial_number: '',
              description: desc,
              type_equipement: devinerType(desc + ' ' + marque),
              sur_reseau: false,
              quantite,
              section: sectionCourante
            })
          }
        }
      }
    }

    res.json({
      client: client.trim(),
      adresse: adresse.trim(),
      titre: titre.trim(),
      sections,
      tmpFile: tmpInfo,
      articles
    })
  } catch (err) {
    console.error('Erreur parse PDF:', err)
    res.status(500).json({ error: 'Erreur lecture PDF : ' + err.message })
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
       VALUES ($1, $2, $3, 'a_faire', 'Importe depuis BDC PDF', $4) RETURNING *`,
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
      'Chantier importe depuis BDC PDF : ' + nbProduits + ' equipement(s)',
      'chantier', chantier.id
    )
// Attacher le fichier source aux documents du chantier
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
          [chantier.id, finalName, tmpFile.originalName, '/uploads/' + finalName, tmpFile.size, 'application/pdf', req.user.id]
        )
      }
    }

    res.status(201).json({ message: 'Import reussi !', chantier_id: chantier.id, nb_articles: nbProduits })
  } catch (err) {
    console.error('Erreur creation:', err)
    res.status(500).json({ error: 'Erreur creation : ' + err.message })
  }
})

module.exports = router
