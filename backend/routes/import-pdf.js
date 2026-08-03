const express = require('express')
const multer = require('multer')
const PDFParser = require('pdf2json')
const { query } = require('../db/pool')
const { auth } = require('../middleware/auth')
const { audit } = require('../middleware/audit')
const { matchOrCreateClient } = require('../utils/clientMatcher')

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

const extractPdfData = (buffer) => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1)
    pdfParser.on('pdfParser_dataError', err => reject(err))
    pdfParser.on('pdfParser_dataReady', () => {
      resolve({ texte: pdfParser.getRawTextContent(), pages: pdfParser.data?.Pages || [] })
    })
    pdfParser.parseBuffer(buffer)
  })
}

// ── Extraction par coordonnees (colonnes) ───────────────────────────────────
// Le BDC AVI affiche des tableaux 2-3 colonnes cote a cote (Adresse du client /
// facturation / expedition, ou Produit & Description / Ref. Constr.). Le texte
// brut ligne par ligne (getRawTextContent) fusionne ces colonnes sans espace de
// separation quand leur contenu se touche visuellement (ex: la reference
// constructeur collee a la fin de la description). On reconstruit donc les
// lignes colonne par colonne a partir de la position x/y de chaque caractere,
// ce qui permet de separer proprement les colonnes independamment des espaces.
const COL1_MAX = 12.5  // Adresse du client / Produit & Description
const REF_MIN  = 12.5  // Reference constructeur (colonne "Ref. Constr.")
const REF_MAX  = 21.8
const QTE_MIN  = 21.8  // Quantite (colonne "Qte")
const QTE_MAX  = 24.3

const decodeChar = (t) => {
  let raw = ''
  for (const r of t.R) {
    try { raw += decodeURIComponent(r.T) } catch { raw += r.T }
  }
  // Anomalie de police recontree sur certains BDC : certaines lettres majuscules
  // (ex: C, G) sont decodees encadrees d'espaces (" C ") au lieu du caractere seul.
  return raw.replace(/^ ([A-Za-zÀ-ÿ]) $/, '$1')
}

const columnRows = (page, xMin, xMax) => {
  const chars = page.Texts
    .filter(t => t.x >= xMin && t.x < xMax)
    .map(t => ({ x: t.x, y: t.y, txt: decodeChar(t) }))
  chars.sort((a, b) => a.y - b.y || a.x - b.x)
  const rows = []
  for (const c of chars) {
    let row = rows[rows.length - 1]
    if (!row || Math.abs(row.y - c.y) > 0.15) { row = { y: c.y, chars: [] }; rows.push(row) }
    const prev = row.chars[row.chars.length - 1]
    if (prev && prev.txt === c.txt && Math.abs(prev.x - c.x) < 0.1) continue // glyphe double (rendu gras)
    row.chars.push(c)
  }
  return rows.map(r => ({ y: r.y, text: r.chars.map(c => c.txt).join('').trim() })).filter(r => r.text)
}

// "Adresse du client" -> ligne suivante = nom, 3 lignes suivantes = adresse complete
const findClientAdresseCoord = (pages) => {
  for (const page of pages) {
    const col1 = columnRows(page, 0, COL1_MAX)
    const idx = col1.findIndex(r => /adresse du client/i.test(r.text))
    if (idx === -1) continue
    const nom = col1[idx + 1]?.text || ''
    const adresse = col1.slice(idx + 2, idx + 5).map(r => r.text).filter(Boolean).join(', ')
    if (nom) return { client: nom, adresse }
  }
  return null
}

// "Titre du devis" -> ligne suivante = nom du chantier
const findTitreCoord = (pages) => {
  for (const page of pages) {
    const col1 = columnRows(page, 0, COL1_MAX)
    const idx = col1.findIndex(r => /titre du devis/i.test(r.text))
    if (idx !== -1 && col1[idx + 1]) return col1[idx + 1].text
  }
  return ''
}

// Lignes de la colonne "Produit & Description" avec, pour chaque ligne, la
// valeur "Ref. Constr." et "Qte" correspondantes (meme y) si presentes.
// On ignore tout ce qui precede l'en-tete du tableau ("Produit & Description")
// pour ne pas confondre l'entete du BDC (adresses, references, titre du devis)
// avec des sections/articles.
const buildDescRefRows = (pages) => {
  const rows = []
  let tableauDemarre = false
  for (const page of pages) {
    const desc = columnRows(page, 0, COL1_MAX)
    const refs = columnRows(page, REF_MIN, REF_MAX)
    const qtes = columnRows(page, QTE_MIN, QTE_MAX)
    for (const d of desc) {
      if (!tableauDemarre) {
        if (/^produit\b/i.test(d.text)) tableauDemarre = true
        continue
      }
      const refRow = refs.find(r => Math.abs(r.y - d.y) < 0.15)
      const qteRow = qtes.find(r => Math.abs(r.y - d.y) < 0.15)
      rows.push({ text: d.text, ref: refRow ? refRow.text : '', qte: qteRow ? qteRow.text : '' })
    }
  }
  return rows
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
    const { texte, pages } = await extractPdfData(req.file.buffer)
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

    // "Titre du devis" -> ligne suivante = nom du chantier (nouveau format BDC AVI)
    titre = findTitreCoord(pages)
    if (!titre) {
      const titreLigne = lignes.find(l =>
        l.match(/^(Travaux|Projet|Installation|Deploiement|Remplacement|Renovation|Mise en|Creation)/i)
      )
      if (titreLigne) titre = titreLigne.trim()
    }

    // "Adresse du client" -> ligne suivante = nom, 3 lignes suivantes = adresse (nouveau format BDC AVI)
    const clientAdresseCoord = findClientAdresseCoord(pages)
    if (clientAdresseCoord) {
      client = clientAdresseCoord.client
      adresse = clientAdresseCoord.adresse
    }

    if (!client) {
      // Fallback (ancien format) : recherche heuristique autour de "Adresse de facturation"
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
    }

    const SECTION_REGEX = /^[A-Z][A-Z\s\-\/]{2,39}$/
    const SECTIONS_EXCLUES = ['TVA', 'SIRET', 'IBAN', 'CGV', 'AVI', 'ARTICLE', 'TOTAL',
      'TAXES', 'DEEE', 'FRANCE', 'MATERIEL', 'FOURNITURES', 'OFFICE']

    const sections = []
    let sectionCourante = 'Salle principale'
    const articles = []
    // Reference + marque toujours entre crochets ; la description peut continuer
    // sur la meme ligne ou, si elle est vide ici, sur la ligne suivante (retour a
    // la ligne visuel avant que le prix/la reference ne soit imprime).
    const marqueRegex = /^\[([A-Z0-9][A-Z0-9\-\/\.\s]+)\]\s+\[([^\]]+)\]\s*(.*)$/

    // Lignes "Produit & Description" en ordre naturel (haut en bas, page par page),
    // avec la reference constructeur correspondante extraite de la colonne voisine.
    const descRefRows = buildDescRefRows(pages)

    for (let i = 0; i < descRefRows.length; i++) {
      const ligne = descRefRows[i].text

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
        let desc = match[3].trim()
        // Description vide sur cette ligne (retour a la ligne) -> on prend la suivante,
        // sauf si elle demarre elle-meme un nouvel article.
        if (!desc && descRefRows[i + 1] && !marqueRegex.test(descRefRows[i + 1].text)) {
          desc = descRefRows[i + 1].text.trim()
        }
        const refConstructeur = descRefRows[i].ref || ''
        const qteMatch = (descRefRows[i].qte || '').match(/(\d+)[,\.](\d+)/)
        const quantite = qteMatch ? Math.round(parseFloat(qteMatch[1] + '.' + qteMatch[2])) : 1

        if (!ignorerLigne(desc) && desc.length > 2 && !ignorerLigne(marque)) {
          const reference = (marque + ' ' + desc).substring(0, 80)
          if (!articles.some(a => a.reference === reference && a.section === sectionCourante)) {
            articles.push({
              reference,
              serial_number: '',
              ref_constructeur: refConstructeur,
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

    // Apprentissage automatique des types depuis les produits existants
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length >= 2)
    const jaccard = (a, b) => {
      const wa = new Set(normalize(a))
      const wb = new Set(normalize(b))
      if (!wa.size || !wb.size) return 0
      let common = 0
      wa.forEach(w => { if (wb.has(w)) common++ })
      return common / (wa.size + wb.size - common)
    }

    let articlesFinaux = articles
    try {
      const prodRefs = await query(
        `SELECT DISTINCT ON (reference) reference, type_equipement
         FROM produits
         WHERE reference IS NOT NULL AND reference != '' AND type_equipement IS NOT NULL
         ORDER BY reference, id DESC`
      )
      if (prodRefs.rows.length > 0) {
        articlesFinaux = articles.map(art => {
          let bestSim = 0
          let bestType = null
          for (const prod of prodRefs.rows) {
            const sim = jaccard(art.reference, prod.reference)
            if (sim > bestSim) { bestSim = sim; bestType = prod.type_equipement }
          }
          if (bestSim >= 0.8 && bestType) {
            return { ...art, type_equipement: bestType, type_auto: true, type_sim: Math.round(bestSim * 100) }
          }
          return art
        })
      }
    } catch (e) {
      // Si la requête échoue, on continue sans apprentissage
    }

    res.json({
      client: client.trim(),
      adresse: adresse.trim(),
      titre: titre.trim(),
      sections,
      tmpFile: tmpInfo,
      articles: articlesFinaux
    })
  } catch (err) {
    console.error('Erreur parse PDF:', err)
    res.status(500).json({ error: 'Erreur lecture PDF : ' + err.message })
  }
})

router.post('/create', async (req, res) => {
  const { nom_chantier, client, adresse, nom_contact, telephone, salles_config, articles, chantier_id } = req.body
  const { tmpFile } = req.body
  if ((!chantier_id && !nom_chantier) || !articles?.length) {
    return res.status(400).json({ error: 'Donnees incompletes.' })
  }
  try {
    let chantier
    if (chantier_id) {
      const existant = await query('SELECT * FROM chantiers WHERE id = $1', [chantier_id])
      if (existant.rows.length === 0) return res.status(404).json({ error: 'Chantier introuvable.' })
      chantier = existant.rows[0]
    } else {
      const { clientId, photoUrl } = await matchOrCreateClient(client, { adresse, nom_contact, telephone })
      const chRes = await query(
        `INSERT INTO chantiers (nom, client, adresse, nom_contact, telephone, statut, description, created_by, client_id, photo_url)
         VALUES ($1, $2, $3, $4, $5, 'a_faire', 'Importe depuis BDC PDF', $6, $7, $8) RETURNING *`,
        [nom_chantier, client, adresse, nom_contact || null, telephone || null, req.user.id, clientId, photoUrl]
      )
      chantier = chRes.rows[0]
    }

    // Si on rattache a un chantier existant, on reutilise les salles portant deja
    // le meme nom au lieu d'en creer des doublons.
    const sallesExistantes = chantier_id
      ? (await query('SELECT id, nom FROM salles WHERE chantier_id = $1', [chantier.id])).rows
      : []
    const trouverSalleExistante = (nom) =>
      sallesExistantes.find(s => s.nom.trim().toLowerCase() === (nom || '').trim().toLowerCase())

    const salleIds = {}
    if (salles_config && salles_config.length > 0) {
      for (const sc of salles_config) {
        const existante = trouverSalleExistante(sc.nom)
        if (existante) {
          salleIds[sc.section] = existante.id
          continue
        }
        const sRes = await query(
          `INSERT INTO salles (chantier_id, nom, statut) VALUES ($1, $2, 'a_faire') RETURNING id`,
          [chantier.id, sc.nom]
        )
        salleIds[sc.section] = sRes.rows[0].id
      }
    } else {
      const nomDefaut = 'Salle principale'
      const existante = trouverSalleExistante(nomDefaut)
      if (existante) {
        salleIds['default'] = existante.id
      } else {
        const sRes = await query(
          `INSERT INTO salles (chantier_id, nom, statut) VALUES ($1, $2, 'a_faire') RETURNING id`,
          [chantier.id, nomDefaut]
        )
        salleIds['default'] = sRes.rows[0].id
      }
    }

    let nbProduits = 0
    for (const art of articles.filter(a => a.reference)) {
      const salleId = salleIds[art.section] || salleIds['default'] || Object.values(salleIds)[0]
      const qty = parseInt(art.quantite) || 1
      for (let q = 0; q < qty; q++) {
        await query(
          `INSERT INTO produits (salle_id, type_equipement, reference, ref_constructeur, description, sur_reseau, created_by)
           VALUES ($1, $2, $3, $4, $5, false, $6)`,
          [salleId, art.type_equipement || 'Autre', art.reference, art.ref_constructeur || null, art.description || '', req.user.id]
        )
        nbProduits++
      }
    }

    await audit(chantier.id, req.user,
      (chantier_id ? 'BDC PDF ajoute au chantier : ' : 'Chantier importe depuis BDC PDF : ') + nbProduits + ' equipement(s)',
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

    res.status(201).json({
      message: chantier_id ? 'Equipements ajoutes au chantier !' : 'Import reussi !',
      chantier_id: chantier.id,
      nb_articles: nbProduits
    })
  } catch (err) {
    console.error('Erreur creation:', err)
    res.status(500).json({ error: 'Erreur creation : ' + err.message })
  }
})

module.exports = router
