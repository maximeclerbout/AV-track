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
        let nomTrouve = ''
        let rueTrouvee = ''
        let cpTrouve = ''

        const estLigneRue = (s) =>
          /^(\d+\s+)?(rue|avenue|boulevard|impasse|allée|chemin|place|route|voie|zone)\s/i.test(s) ||
          /^CS\s+\d/i.test(s) || /^ZI\s/i.test(s)
        const estCP = (s) => /^\d{5}\s+\S/.test(s)
        const estExclu = (s) => {
          if (!s || s.length < 2) return true
          const sl = s.toLowerCase()
          return /^\+\d/.test(s) ||
            /^France\s/i.test(s) || /^France$/i.test(s) ||
            /^TVA/i.test(s) ||
            sl.includes('facturation') || sl.includes('expedition') ||
            sl.includes('alexandre') || sl.includes('vaulx') ||
            sl.includes('audio') || sl.includes('integration') ||
            sl.includes('siret') || sl.includes('tva') ||
            sl.includes('contrat') || sl.includes('maintenance') ||
            s.includes('Break') || s.includes('Page')
        }

        for (let j = i + 1; j < Math.min(i + 14, lignes.length); j++) {
          // Split on 3+ spaces to handle two-column merges ("IESEG   IESEG" → "IESEG")
          const col1 = lignes[j].trim().split(/\s{3,}/)[0].trim()
          const norm = normaliserTexte(col1)
          // Strip billing label suffix BEFORE exclusion check so "MC CAIN, Facturation" → "MC CAIN"
          const normClean = norm.replace(/,\s*(Facturation|facturation|Expédition|expedition).*$/, '').trim()

          if (estExclu(normClean)) continue
          if (estCP(normClean) && !cpTrouve) { cpTrouve = normClean; continue }
          if (estLigneRue(normClean) && !rueTrouvee) { rueTrouvee = normClean; continue }
          if (!estCP(normClean) && !estLigneRue(normClean) && !nomTrouve && /[a-zA-ZÀ-ÿ]{2,}/.test(normClean)) {
            nomTrouve = normClean
          }
        }

        if (nomTrouve) client = nomTrouve
        if (rueTrouvee || cpTrouve) adresse = [rueTrouvee, cpTrouve].filter(Boolean).join(', ')
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

    // Fallback : format BDC AVI — pdf2json extrait à l'envers
    // Après "Commande #" : France → CP+Ville → Rue → NomClient → (infos AVI)
    if (!client) {
      const aviExclus = ['69120', 'vaulx', 'alexandre dumas', '105 rue', 'tva fr', 'siret', 'audio vid', 'avi (']
      const estAvi = (s) => aviExclus.some(m => s.toLowerCase().includes(m))

      const cmdIdx = lignes.findIndex(l => /commande\s*#/i.test(l))
      if (cmdIdx >= 0) {
        for (let i = cmdIdx + 1; i < Math.min(cmdIdx + 15, lignes.length); i++) {
          const l = normaliserTexte(lignes[i])
          // Trouver le code postal client (5 chiffres + ville, pas AVI)
          if (/^\d{5}\s+\S/.test(l) && !estAvi(l)) {
            const cp = l
            const rue = normaliserTexte(lignes[i + 1] || '')
            const nomCandidat = normaliserTexte(lignes[i + 2] || '')

            adresse = (rue.length > 2 ? rue + ', ' : '') + cp
            if (nomCandidat.length > 1 && !estAvi(nomCandidat) &&
                !/^France$/i.test(nomCandidat) &&
                !/^(TVA|SIRET|Page)/i.test(nomCandidat)) {
              client = nomCandidat
            }
            break
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
