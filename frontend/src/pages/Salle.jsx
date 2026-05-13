import Scanner from '../components/Scanner'
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../components/Layout'
import { useCategories } from '../context/CategoriesContext'

const icons = {
  wifi: "M5 12.5C7.5 10 10 8.5 12 8.5s4.5 1.5 7 4M8.5 15.5c1-1 2.2-1.5 3.5-1.5s2.5.5 3.5 1.5M12 19h.01",
  monitor: "M2 3h20v14H2zM8 21h8M12 17v4",
  plus: "M12 5v14M5 12h14",
  trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  network: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 1 2-2V9M9 21H5a2 2 0 0 0-2-2V9m0 0h18",
  chevronDown: "M6 9l6 6 6-6",
  barcode: "M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14M21 5v14",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 0 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  cpu: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18M3 9h18",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  xmark: "M18 6L6 18M6 6l12 12",
}

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const STATUS = {
  a_faire:    { label: 'A faire',    color: '#60A5FA' },
  en_cours:   { label: 'En cours',   color: '#F59E0B' },
  a_terminer: { label: 'A terminer', color: '#6366F1' },
  probleme:   { label: 'Problème',   color: '#EF4444' },
  termine:    { label: 'Terminé',    color: '#10B981' },
}

const TYPE_COLORS_DEFAULT = {
  'TV':              '#60A5FA',
  'Videoprojecteur': '#A855F7',
  'Matrice':         '#F97316',
  'Visio':           '#10B981',
  'Amplificateur':   '#F59E0B',
  'Switch AV':       '#06B6D4',
  'Controleur':      '#EF4444',
  'Autre':           '#7b8096',
}

const TYPES_DEFAULT = ['TV','Videoprojecteur','Matrice','Visio','Amplificateur','Switch AV','Controleur','Autre']

const Badge = ({ statut }) => {
  const cfg = STATUS[statut] || STATUS.a_faire
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 600, color: cfg.color,
      background: cfg.color + '1a', border: '1px solid ' + cfg.color + '40',
      fontFamily: "'Cousine', monospace", textTransform: 'uppercase', letterSpacing: .5
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
  padding: '10px 14px', color: '#eef0f6', fontSize: 13, outline: 'none'
}
const labelStyle = {
  fontSize: 11, fontWeight: 700, color: '#7b8096', textTransform: 'uppercase',
  letterSpacing: 1, marginBottom: 6, display: 'block'
}

export default function Salle() {
  const { cid, sid } = useParams()
  const navigate = useNavigate()
  const { categories } = useCategories()
  const TYPES = categories.length > 0 ? categories.map(c => c.nom) : TYPES_DEFAULT
  const getTypeColor = (type) => {
    const cat = categories.find(c => c.nom === type)
    return (cat?.couleur) || TYPE_COLORS_DEFAULT[type] || '#7b8096'
  }

  const [salle, setSalle] = useState(null)
  const [chantiers, setChantiers] = useState([])
  const [chantierNom, setChantierNom] = useState('')
  const [marques, setMarques] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedProduit, setExpandedProduit] = useState(null)
  const [showAddProduit, setShowAddProduit] = useState(false)
  const [scannerTarget, setScannerTarget] = useState(null)
  const [showNetworkPanel, setShowNetworkPanel] = useState(false)
  const [showProgPanel, setShowProgPanel] = useState(false)
  const [editComment, setEditComment] = useState(false)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photos, setPhotos] = useState([])
  const [lightboxPhoto, setLightboxPhoto] = useState(null)
  const [videos, setVideos] = useState([])
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [programmes, setProgrammes] = useState([])
  const [uploadingProg, setUploadingProg] = useState(false)
  const [editProduit, setEditProduit] = useState(null)
  const [editProduitForm, setEditProduitForm] = useState({})
  const [filtreReseau, setFiltreReseau] = useState('tous')
  const [searchProduit, setSearchProduit] = useState('')
  const [sallesChantier, setSallesChantier] = useState([])
  const [movingProduit, setMovingProduit] = useState(null)
  const [moveTarget, setMoveTarget] = useState('')
  const [showNic2Add, setShowNic2Add] = useState(false)
  const [showNic2Edit, setShowNic2Edit] = useState(false)
  const [newProduit, setNewProduit] = useState({
    type_equipement: TYPES[0] || 'Autre', marque: '', modele: '', serial_number: '',
    description: '', sur_reseau: false,
    ip: '', masque: '', gateway: '', dns: '', dns_alt: '', login: '', mdp: '', label_reseau1: '',
    ip2: '', masque2: '', gateway2: '', dns2: '', dns2_alt: '', login2: '', mdp2: '', label_reseau2: '',
  })

  useEffect(() => {
    if (TYPES.length > 0 && !TYPES.includes(newProduit.type_equipement)) {
      setNewProduit(p => ({ ...p, type_equipement: TYPES[0] }))
    }
  }, [categories])

  useEffect(() => {
    axios.get('/api/marques').then(res => setMarques(res.data)).catch(() => {})
    axios.get('/api/chantiers').then(res => {
      setChantiers(res.data)
      const ch = res.data.find(c => c.id === parseInt(cid))
      if (ch) setChantierNom(ch.nom)
    })
    axios.get('/api/chantiers/' + cid)
      .then(res => {
        setSallesChantier(res.data.salles || [])
        const s = res.data.salles?.find(s => s.id === parseInt(sid))
        if (s) { setSalle(s); setComment(s.commentaire || '') }
        else navigate('/chantiers/' + cid)
        axios.get('/api/salles/' + sid + '/photos').then(r => setPhotos(r.data)).catch(() => {})
        axios.get('/api/salles/' + sid + '/videos').then(r => setVideos(r.data)).catch(() => {})
        axios.get('/api/salles/' + sid + '/programmes').then(r => setProgrammes(r.data)).catch(() => {})
      })
      .finally(() => setLoading(false))
  }, [cid, sid])

  const updateStatut = async (statut) => {
    await axios.patch('/api/salles/' + sid, { statut })
    setSalle(prev => ({ ...prev, statut }))
  }

  const saveComment = async () => {
    await axios.patch('/api/salles/' + sid, { commentaire: comment })
    setSalle(prev => ({ ...prev, commentaire: comment }))
    setEditComment(false)
  }

  const applyNetwork = async () => {
    const res = await axios.post('/api/salles/' + sid + '/apply-network')
    alert(res.data.message)
  }

  const uploadPhoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      const res = await axios.post('/api/salles/' + sid + '/photos', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setPhotos(prev => [...prev, res.data])
      if (!salle.photo_url) setSalle(prev => ({ ...prev, photo_url: res.data.url }))
    } catch (err) { alert('Erreur upload photo.') }
    finally { setUploadingPhoto(false); e.target.value = '' }
  }

  const uploadVideo = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploadingVideo(true)
    try {
      const fd = new FormData(); fd.append('video', file)
      const res = await axios.post('/api/salles/' + sid + '/videos', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: () => {}
      })
      setVideos(prev => [...prev, res.data])
    } catch { alert('Erreur upload vidéo.') }
    finally { setUploadingVideo(false); e.target.value = '' }
  }

  const deleteSpecificVideo = async (videoId) => {
    if (!confirm('Supprimer cette vidéo ?')) return
    try {
      await axios.delete('/api/salles/' + sid + '/videos/' + videoId)
      setVideos(prev => prev.filter(v => v.id !== videoId))
    } catch { alert('Erreur suppression vidéo.') }
  }

  const deleteSpecificPhoto = async (photoId) => {
    if (!confirm('Supprimer cette photo ?')) return
    try {
      await axios.delete('/api/salles/' + sid + '/photos/' + photoId)
      setPhotos(prev => {
        const remaining = prev.filter(p => p.id !== photoId)
        setSalle(s => ({ ...s, photo_url: remaining[0]?.url || null }))
        return remaining
      })
    } catch (err) { alert('Erreur suppression photo.') }
  }

  const [addQuantite, setAddQuantite] = useState(1)

  const addProduit = async () => {
    if (!newProduit.modele && !newProduit.marque) return
    const reference = [newProduit.marque, newProduit.modele].filter(Boolean).join(' ')
    setSaving(true)
    try {
      const qty = Math.max(1, Math.min(50, addQuantite))
      const created = []
      for (let i = 0; i < qty; i++) {
        const payload = { ...newProduit, reference, serial_number: qty > 1 ? null : (newProduit.serial_number || null) }
        const res = await axios.post('/api/salles/' + sid + '/produits', payload)
        created.push(res.data)
      }
      setSalle(prev => ({ ...prev, produits: [...(prev.produits || []), ...created] }))
      if (newProduit.marque && !marques.find(m => m.nom.toLowerCase() === newProduit.marque.toLowerCase())) {
        axios.get('/api/marques').then(r => setMarques(r.data)).catch(() => {})
      }
      setNewProduit({ type_equipement: TYPES[0] || 'Autre', marque: '', modele: '', serial_number: '', description: '', sur_reseau: false, ip: '', masque: salle?.net_masque || '', gateway: salle?.net_gateway || '', dns: salle?.net_dns || '', dns_alt: '', login: '', mdp: '', label_reseau1: '', ip2: '', masque2: '', gateway2: '', dns2: '', dns2_alt: '', login2: '', mdp2: '', label_reseau2: '' })
      setAddQuantite(1)
      setShowNic2Add(false)
      setShowAddProduit(false)
    } catch (err) { alert('Erreur ajout.') }
    finally { setSaving(false) }
  }

  const deleteProduit = async (id) => {
    if (!confirm('Supprimer cet équipement ?')) return
    await axios.delete('/api/produits/' + id)
    setSalle(prev => ({ ...prev, produits: prev.produits.filter(p => p.id !== id) }))
  }

  const moveProduit = async (produitId, newSalleId) => {
    try {
      await axios.patch('/api/produits/' + produitId, { salle_id: parseInt(newSalleId) })
      setSalle(prev => ({ ...prev, produits: prev.produits.filter(p => p.id !== produitId) }))
      setMovingProduit(null)
      setMoveTarget('')
      setExpandedProduit(null)
    } catch (err) { alert('Erreur lors du déplacement.') }
  }

  const startEditProduit = (p) => {
    setEditProduit(p)
    setEditProduitForm({
      type_equipement: p.type_equipement,
      marque: p.marque || '',
      modele: p.modele || (p.marque ? '' : p.reference),
      serial_number: p.serial_number || '', description: p.description || '',
      sur_reseau: p.sur_reseau, ip: p.ip || '', masque: p.masque || '', gateway: p.gateway || '',
      dns: p.dns || '', dns_alt: p.dns_alt || '', login: p.login || '', mdp: p.mdp || '',
      label_reseau1: p.label_reseau1 || '', ip2: p.ip2 || '', masque2: p.masque2 || '',
      gateway2: p.gateway2 || '', dns2: p.dns2 || '', dns2_alt: p.dns2_alt || '',
      login2: p.login2 || '', mdp2: p.mdp2 || '', label_reseau2: p.label_reseau2 || ''
    })
    setShowNic2Edit(!!p.ip2)
  }

  const saveEditProduit = async () => {
    setSaving(true)
    try {
      const { marque, modele } = editProduitForm
      const reference = [marque, modele].filter(Boolean).join(' ') || modele || marque || editProduit.reference
      const res = await axios.patch('/api/produits/' + editProduit.id, { ...editProduitForm, reference, marque: marque || null, modele: modele || null })
      setSalle(prev => ({ ...prev, produits: prev.produits.map(p => p.id === editProduit.id ? { ...p, ...res.data } : p) }))
      if (marque && !marques.find(m => m.nom.toLowerCase() === marque.toLowerCase())) {
        axios.get('/api/marques').then(r => setMarques(r.data)).catch(() => {})
      }
      setEditProduit(null)
    } catch (err) { alert('Erreur modification.') }
    finally { setSaving(false) }
  }

  const exportSalle = async () => {
    try {
      const res = await axios.get('/api/salles/' + sid + '/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'AVTrack_salle_' + sid + '.xlsx')
      document.body.appendChild(link); link.click(); link.remove()
    } catch (err) { alert('Erreur export.') }
  }

  const touchStartX = useRef(null)
  const [slide, setSlide] = useState({ dir: null, key: 0 })
  const sortedSalles = [...sallesChantier].sort((a, b) => a.nom.localeCompare(b.nom, undefined, { numeric: true, sensitivity: 'base' }))
  const currentSalleIdx = sortedSalles.findIndex(s => s.id === parseInt(sid))
  const prevSalle = currentSalleIdx > 0 ? sortedSalles[currentSalleIdx - 1] : null
  const nextSalle = currentSalleIdx < sortedSalles.length - 1 ? sortedSalles[currentSalleIdx + 1] : null

  useEffect(() => {
    const dir = sessionStorage.getItem('swipeDir')
    if (dir) { sessionStorage.removeItem('swipeDir'); setSlide(s => ({ dir, key: s.key + 1 })) }
  }, [sid])

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 60) {
      if (diff > 0 && nextSalle) {
        sessionStorage.setItem('swipeDir', 'next')
        navigate('/chantiers/' + cid + '/salles/' + nextSalle.id)
      } else if (diff < 0 && prevSalle) {
        sessionStorage.setItem('swipeDir', 'prev')
        navigate('/chantiers/' + cid + '/salles/' + prevSalle.id)
      }
    }
    touchStartX.current = null
  }

  const produitsFiltres = (salle?.produits || []).filter(p => {
    const matchReseau = filtreReseau === 'tous' ||
      (filtreReseau === 'reseau' && p.sur_reseau) ||
      (filtreReseau === 'hors_reseau' && !p.sur_reseau)
    const matchSearch = !searchProduit ||
      p.reference.toLowerCase().includes(searchProduit.toLowerCase()) ||
      (p.serial_number || '').toLowerCase().includes(searchProduit.toLowerCase()) ||
      (p.type_equipement || '').toLowerCase().includes(searchProduit.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchProduit.toLowerCase())
    return matchReseau && matchSearch
  }).sort((a, b) => {
    if (b.sur_reseau !== a.sur_reseau) return b.sur_reseau ? 1 : -1
    const aAutre = (a.type_equipement || '').toLowerCase() === 'autre'
    const bAutre = (b.type_equipement || '').toLowerCase() === 'autre'
    if (aAutre !== bAutre) return aAutre ? 1 : -1
    return (a.type_equipement || '').localeCompare(b.type_equipement || '')
  })

  if (loading) return <Layout chantiers={chantiers}><div style={{ textAlign: 'center', color: '#7b8096', padding: '60px 0' }}>Chargement...</div></Layout>
  if (!salle) return null

  const salleStatusColor = STATUS[salle.statut]?.color || '#7b8096'
  const newTypeColor = getTypeColor(newProduit.type_equipement)

  const slideAnim = slide.dir === 'next'
    ? 'slideFromRight 0.28s cubic-bezier(.25,.46,.45,.94) both'
    : slide.dir === 'prev'
    ? 'slideFromLeft 0.28s cubic-bezier(.25,.46,.45,.94) both'
    : undefined

  return (
    <Layout chantiers={chantiers}>
      <style>{`
        @keyframes slideFromRight { from { transform: translateX(48px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        @keyframes slideFromLeft  { from { transform: translateX(-48px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
      `}</style>

      {/* Bandeau fixe — nom salle + navigation (visible en permanence) */}
      {sortedSalles.length > 1 && (
        <div style={{
          position: 'fixed', top: 56, left: 0, right: 0, zIndex: 60,
          background: 'rgba(13,17,23,0.92)', backdropFilter: 'blur(14px)',
          borderBottom: `2px solid ${salleStatusColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 16px', gap: 8
        }}>
          <button onClick={() => { if (prevSalle) { sessionStorage.setItem('swipeDir','prev'); navigate('/chantiers/' + cid + '/salles/' + prevSalle.id) }}}
            disabled={!prevSalle}
            style={{ background: 'none', border: 'none', color: prevSalle ? '#eef0f6' : '#3d4155', cursor: prevSalle ? 'pointer' : 'default', fontSize: 22, lineHeight: 1, padding: '2px 8px', flexShrink: 0 }}>‹</button>
          <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 13, color: '#eef0f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{salle.nom}</div>
            <div style={{ fontSize: 10, color: '#4b5063', fontFamily: "'Cousine', monospace" }}>{currentSalleIdx + 1} / {sortedSalles.length}</div>
          </div>
          <button onClick={() => { if (nextSalle) { sessionStorage.setItem('swipeDir','next'); navigate('/chantiers/' + cid + '/salles/' + nextSalle.id) }}}
            disabled={!nextSalle}
            style={{ background: 'none', border: 'none', color: nextSalle ? '#eef0f6' : '#3d4155', cursor: nextSalle ? 'pointer' : 'default', fontSize: 22, lineHeight: 1, padding: '2px 8px', flexShrink: 0 }}>›</button>
        </div>
      )}

      <div key={slide.key} style={{ maxWidth: 900, margin: '0 auto', animation: slideAnim, paddingTop: sortedSalles.length > 1 ? 40 : 0 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 12, color: '#7b8096', flexWrap: 'wrap' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Tableau de bord</span>
          <span>›</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/chantiers/' + cid)}>{chantierNom}</span>
          <span>›</span>
          <span style={{ color: '#eef0f6' }}>{salle.nom}</span>
        </div>

        {/* Hero card */}
        <div style={{ background: '#181b24', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderTop: `4px solid ${salleStatusColor}` }}>
          <div style={{ padding: 24 }}>
            <div className="salle-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

              {/* Left: photo + status */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 900, color: '#eef0f6' }}>{salle.nom}</h1>
                  <Badge statut={salle.statut} />
                </div>
                <div style={{ fontSize: 12, color: '#7b8096', marginBottom: 16 }}>{salle.etage} · {chantierNom}</div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  <select value={salle.statut} onChange={e => updateStatut(e.target.value)}
                    style={{ background: salleStatusColor + '10', border: '1px solid ' + salleStatusColor + '40', borderRadius: 10, padding: '8px 36px 8px 12px', color: salleStatusColor, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                    {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <button onClick={exportSalle}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#eef0f6', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon d={icons.download} size={14} /> Export
                  </button>
                </div>

                {/* Photo gallery */}
                {photos.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: photos.length === 1 ? '1fr auto' : 'repeat(3, 1fr)', gap: 6 }}>
                    {photos.map((photo, idx) => (
                      <div key={photo.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', height: photos.length === 1 ? 140 : 80, cursor: 'pointer' }}
                        onClick={() => setLightboxPhoto(idx)}>
                        <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <button onClick={e => { e.stopPropagation(); deleteSpecificPhoto(photo.id); }}
                          style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(239,68,68,0.85)', border: 'none', color: '#fff', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, height: photos.length === 1 ? 140 : 80, border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8, cursor: 'pointer', color: '#7b8096', background: 'rgba(255,255,255,0.02)', minWidth: photos.length === 1 ? 60 : 'auto' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}>
                      {uploadingPhoto ? <span style={{ fontSize: 10 }}>...</span> : <>
                        <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
                        <span style={{ fontSize: 10 }}>Photo</span>
                      </>}
                      <input type="file" accept="image/*" onChange={uploadPhoto} style={{ display: 'none' }} />
                    </label>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, height: 140, border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 12, cursor: 'pointer', color: '#7b8096', fontSize: 13, background: 'rgba(255,255,255,0.02)', position: 'relative', transition: 'border .2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}>
                    {uploadingPhoto ? <span>Upload en cours...</span> : (
                      <>
                        <Icon d={icons.camera} size={22} color="#3d4155" />
                        <span style={{ fontSize: 12 }}>Ajouter une photo</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={uploadPhoto} style={{ display: 'none' }} />
                  </label>
                )}

                {/* Section vidéos */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#7b8096', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Vidéos</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {videos.map((v, idx) => (
                      <div key={v.id} style={{ display: 'flex', gap: 3 }}>
                        <button onClick={() => setLightboxPhoto({ type: 'video', url: v.url })}
                          style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#8B5CF6', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>▶ {idx + 1}</button>
                        <button onClick={() => deleteSpecificVideo(v.id)}
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF4444', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                      </div>
                    ))}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: '#7b8096', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}>
                      {uploadingVideo ? '...' : '🎥 +'}
                      <input type="file" accept="video/*" onChange={uploadVideo} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Right: comment + network */}
              <div>
                {/* Commentaire */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={labelStyle}>Commentaire</div>
                    {!editComment && (
                      <button onClick={() => setEditComment(true)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#eef0f6', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}>
                        <Icon d={icons.edit} size={12} />
                      </button>
                    )}
                  </div>
                  {editComment ? (
                    <div>
                      <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
                        style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditComment(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#eef0f6', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>Annuler</button>
                        <button onClick={saveComment} style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>Sauvegarder</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: salle.commentaire ? '#eef0f6' : '#3d4155', fontStyle: !salle.commentaire ? 'italic' : 'normal', lineHeight: 1.5 }}>
                      {salle.commentaire || 'Aucun commentaire'}
                    </div>
                  )}
                </div>

                {/* Network panel */}
                <div style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 12, overflow: 'hidden' }}>
                  <button onClick={() => setShowNetworkPanel(!showNetworkPanel)}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', color: '#06B6D4', fontSize: 13, fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon d={icons.network} size={15} color="#06B6D4" />
                      Réseau salle
                      <span style={{ fontFamily: "'Cousine', monospace", fontSize: 11, color: '#3d4155', background: 'rgba(6,182,212,0.1)', borderRadius: 20, padding: '1px 7px' }}>
                        {(salle.produits || []).filter(p => p.sur_reseau).length} app.
                      </span>
                    </div>
                    <svg style={{ transform: showNetworkPanel ? 'rotate(180deg)' : 'none', transition: '.2s' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2">
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </button>
                  {showNetworkPanel && (
                    <div style={{ padding: '0 14px 14px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                        {[['net_masque','Masque'],['net_gateway','Passerelle'],['net_dns','DNS']].map(([key, label]) => (
                          <div key={key}>
                            <div style={labelStyle}>{label}</div>
                            <input defaultValue={salle[key]} style={inputStyle}
                              onChange={e => setSalle(prev => ({ ...prev, [key]: e.target.value }))}
                              onBlur={e => axios.patch('/api/salles/' + sid, { [key]: e.target.value })} />
                          </div>
                        ))}
                      </div>
                      <button onClick={applyNetwork}
                        style={{ background: 'linear-gradient(135deg,#06B6D4,#0891B2)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 3px 10px rgba(6,182,212,0.35)' }}>
                        <Icon d={icons.wifi} size={13} color="#fff" /> Appliquer à tous les équipements
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Programme Extron compact — visible si un équipement est de type Controleur */}
            {(salle?.produits || []).some(p => p.type_equipement?.toLowerCase().includes('controleur') || p.type_equipement?.toLowerCase().includes('contrôleur')) && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 4 }}>
                <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, overflow: 'hidden' }}>
                  <button onClick={() => setShowProgPanel(!showProgPanel)}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', color: '#EF4444', fontSize: 13, fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon d={icons.cpu} size={15} color="#EF4444" />
                      Programme Extron
                      <span style={{ fontFamily: "'Cousine', monospace", fontSize: 11, color: '#3d4155', background: 'rgba(239,68,68,0.1)', borderRadius: 20, padding: '1px 7px' }}>
                        {programmes.length} fichier{programmes.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label onClick={e => e.stopPropagation()} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon d={icons.upload} size={12} color="#EF4444" />
                        {uploadingProg ? '...' : 'Ajouter'}
                        <input type="file" style={{ display: 'none' }} disabled={uploadingProg}
                          onChange={async (e) => {
                            const file = e.target.files[0]; if (!file) return
                            setUploadingProg(true)
                            try {
                              const fd = new FormData(); fd.append('programme', file)
                              const res = await axios.post('/api/salles/' + sid + '/programmes', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                              setProgrammes(prev => [res.data, ...prev])
                            } catch { alert('Erreur upload.') }
                            finally { setUploadingProg(false); e.target.value = '' }
                          }} />
                      </label>
                      <svg style={{ transform: showProgPanel ? 'rotate(180deg)' : 'none', transition: '.2s' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </div>
                  </button>
                  {showProgPanel && (
                    <div style={{ padding: '0 14px 12px' }}>
                      {programmes.length === 0
                        ? <div style={{ color: '#4b5063', fontSize: 12, fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>Aucun fichier — ajoutez le premier</div>
                        : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {programmes.map(prog => {
                              const sizeKb = prog.taille_bytes ? (prog.taille_bytes / 1024).toFixed(1) : null
                              const date = new Date(prog.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                              return (
                                <div key={prog.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '7px 10px' }}>
                                  <Icon d={icons.file} size={14} color="#EF4444" />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#eef0f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prog.nom_original}</div>
                                    <div style={{ fontSize: 10, color: '#4b5063' }}>{sizeKb && <span>{sizeKb} Ko · </span>}{date}</div>
                                  </div>
                                  <button onClick={async () => {
                                    try {
                                      const res = await axios.get('/api/salles/' + sid + '/programmes/' + prog.id + '/download', { responseType: 'blob' })
                                      const url = window.URL.createObjectURL(new Blob([res.data]))
                                      const link = document.createElement('a')
                                      link.href = url; link.setAttribute('download', prog.nom_original)
                                      document.body.appendChild(link); link.click(); link.remove()
                                    } catch { alert('Erreur téléchargement.') }
                                  }} style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                    <Icon d={icons.download} size={12} color="#EF4444" /> ↓
                                  </button>
                                  <button onClick={async () => {
                                    if (!window.confirm('Supprimer ce fichier ?')) return
                                    await axios.delete('/api/salles/' + sid + '/programmes/' + prog.id)
                                    setProgrammes(prev => prev.filter(p => p.id !== prog.id))
                                  }} style={{ background: 'none', border: 'none', color: '#4b5063', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                                    <Icon d={icons.xmark} size={13} color="#4b5063" />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                      }
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Equipment section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 900, color: '#eef0f6', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon d={icons.monitor} size={18} color="#10B981" />
            Équipements
            <span style={{ fontFamily: "'Cousine', monospace", fontSize: 13, color: '#7b8096', fontWeight: 400 }}>({produitsFiltres.length}/{salle.produits?.length || 0})</span>
          </h2>
          <button onClick={() => setShowAddProduit(!showAddProduit)}
            style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}>
            <Icon d={icons.plus} size={14} color="#fff" /> Ajouter
          </button>
        </div>

        {/* Search + filter */}
        <div className="filter-row" style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#eef0f6" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input value={searchProduit} onChange={e => setSearchProduit(e.target.value)}
              placeholder="Rechercher un équipement..."
              style={{ ...inputStyle, paddingLeft: 30 }} />
          </div>
          {['tous','reseau','hors_reseau'].map(f => (
            <button key={f} onClick={() => setFiltreReseau(f)}
              style={{ background: filtreReseau === f ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (filtreReseau === f ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'), color: filtreReseau === f ? '#10B981' : '#7b8096', borderRadius: 20, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {f === 'tous' ? 'Tous' : f === 'reseau' ? 'Sur réseau' : 'Hors réseau'}
            </button>
          ))}
        </div>

        {/* Add produit form */}
        {showAddProduit && (
          <div style={{ background: '#181b24', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20, marginBottom: 16, borderTop: `3px solid ${newTypeColor}` }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, marginBottom: 14, fontSize: 15, color: '#eef0f6' }}>Nouvel équipement</div>
            <div className="add-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Type</label>
                <select value={newProduit.type_equipement} onChange={e => setNewProduit({ ...newProduit, type_equipement: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Marque</label>
                <input list="marques-list-add" value={newProduit.marque} onChange={e => setNewProduit({ ...newProduit, marque: e.target.value })} placeholder="ex: Samsung" style={inputStyle} />
                <datalist id="marques-list-add">{marques.map(m => <option key={m.id} value={m.nom} />)}</datalist>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Modèle / Référence *</label>
                <input value={newProduit.modele} onChange={e => setNewProduit({ ...newProduit, modele: e.target.value })} placeholder="ex: QM65B" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Numéro de série</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newProduit.serial_number} onChange={e => setNewProduit({ ...newProduit, serial_number: e.target.value })} placeholder="S/N" style={{ ...inputStyle, flex: 1 }} />
                <button title="Scanner" onClick={() => setScannerTarget('new')} style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 10, padding: '0 12px', cursor: 'pointer', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon d={icons.barcode} size={16} color="#06B6D4" />
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Description</label>
              <textarea value={newProduit.description} onChange={e => setNewProduit({ ...newProduit, description: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} />
            </div>
            <div style={{ marginBottom: newProduit.sur_reseau ? 10 : 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 14px' }}
                onClick={() => setNewProduit({ ...newProduit, sur_reseau: !newProduit.sur_reseau, masque: salle?.net_masque || '', gateway: salle?.net_gateway || '', dns: salle?.net_dns || '' })}>
                <div style={{ width: 40, height: 22, borderRadius: 11, background: newProduit.sur_reseau ? '#10B981' : 'rgba(255,255,255,0.1)', position: 'relative', transition: '.2s', flexShrink: 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: newProduit.sur_reseau ? 21 : 3, transition: 'left .2s' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#eef0f6' }}>Appareil sur le réseau</span>
              </div>
            </div>
            {newProduit.sur_reseau && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 12, padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#06B6D4', textTransform: 'uppercase', letterSpacing: .8, whiteSpace: 'nowrap' }}>Carte réseau 1</span>
                    <input value={newProduit.label_reseau1} onChange={e => setNewProduit({ ...newProduit, label_reseau1: e.target.value })} placeholder="ex: Management / Dante" style={{ ...inputStyle, flex: 1, fontSize: 12, padding: '5px 10px' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[['ip','Adresse IP','192.168.1.x'],['masque','Masque','255.255.255.0'],['gateway','Passerelle','192.168.1.1'],['dns','DNS Primaire','8.8.8.8'],['dns_alt','DNS Secondaire','8.8.4.4']].map(([key, label, ph]) => (
                      <div key={key}>
                        <label style={{ ...labelStyle, color: '#06B6D4' }}>{label}</label>
                        <input value={newProduit[key]} onChange={e => setNewProduit({ ...newProduit, [key]: e.target.value })} placeholder={ph} style={{ ...inputStyle, fontFamily: "'Cousine', monospace" }} />
                      </div>
                    ))}
                    <div>
                      <label style={labelStyle}>Identifiant</label>
                      <input value={newProduit.login} onChange={e => setNewProduit({ ...newProduit, login: e.target.value })} placeholder="admin / root..." style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Mot de passe</label>
                      <input type="password" value={newProduit.mdp} onChange={e => setNewProduit({ ...newProduit, mdp: e.target.value })} style={inputStyle} />
                    </div>
                  </div>
                </div>
                {!showNic2Add ? (
                  <button onClick={() => setShowNic2Add(true)}
                    style={{ background: 'rgba(139,92,246,0.08)', border: '1px dashed rgba(139,92,246,0.3)', color: '#8B5CF6', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, width: '100%' }}>
                    + Ajouter une 2ème carte réseau
                  </button>
                ) : (
                  <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: .8, whiteSpace: 'nowrap' }}>Carte réseau 2</span>
                        <input value={newProduit.label_reseau2} onChange={e => setNewProduit({ ...newProduit, label_reseau2: e.target.value })} placeholder="ex: Dante / AV LAN" style={{ ...inputStyle, flex: 1, fontSize: 12, padding: '5px 10px' }} />
                      </div>
                      <button onClick={() => { setShowNic2Add(false); setNewProduit(p => ({ ...p, ip2: '', masque2: '', gateway2: '', dns2: '', mdp2: '', label_reseau2: '' })) }}
                        style={{ background: 'none', border: 'none', color: '#7b8096', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>✕</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[['ip2','Adresse IP','192.168.2.x'],['masque2','Masque','255.255.255.0'],['gateway2','Passerelle','192.168.2.1'],['dns2','DNS Primaire','8.8.8.8'],['dns2_alt','DNS Secondaire','8.8.4.4']].map(([key, label, ph]) => (
                        <div key={key}>
                          <label style={{ ...labelStyle, color: '#8B5CF6' }}>{label}</label>
                          <input value={newProduit[key]} onChange={e => setNewProduit({ ...newProduit, [key]: e.target.value })} placeholder={ph} style={{ ...inputStyle, fontFamily: "'Cousine', monospace" }} />
                        </div>
                      ))}
                      <div>
                        <label style={labelStyle}>Identifiant</label>
                        <input value={newProduit.login2} onChange={e => setNewProduit({ ...newProduit, login2: e.target.value })} placeholder="admin / root..." style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Mot de passe</label>
                        <input type="password" value={newProduit.mdp2} onChange={e => setNewProduit({ ...newProduit, mdp2: e.target.value })} style={inputStyle} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Quantité */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#7b8096', fontWeight: 600 }}>Quantité :</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
                  <button onClick={() => setAddQuantite(q => Math.max(1, q - 1))}
                    style={{ background: 'none', border: 'none', color: '#eef0f6', cursor: 'pointer', padding: '6px 12px', fontSize: 16, lineHeight: 1 }}>−</button>
                  <input type="number" min="1" max="50" value={addQuantite}
                    onChange={e => setAddQuantite(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                    style={{ width: 40, background: 'none', border: 'none', color: '#eef0f6', textAlign: 'center', fontSize: 14, fontWeight: 700, outline: 'none', padding: '6px 0' }} />
                  <button onClick={() => setAddQuantite(q => Math.min(50, q + 1))}
                    style={{ background: 'none', border: 'none', color: '#eef0f6', cursor: 'pointer', padding: '6px 12px', fontSize: 16, lineHeight: 1 }}>+</button>
                </div>
                {addQuantite > 1 && (
                  <span style={{ fontSize: 11, color: '#F59E0B', fontStyle: 'italic' }}>
                    S/N ignorés — à renseigner individuellement
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowAddProduit(false); setAddQuantite(1) }} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#eef0f6', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
                <button onClick={addProduit} disabled={saving} style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                  {saving ? 'Ajout...' : addQuantite > 1 ? `Ajouter ${addQuantite} exemplaires` : "Ajouter l'équipement"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit produit modal */}
        {editProduit && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#181b24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 800, color: '#eef0f6' }}>Modifier l'équipement</div>
                <button onClick={() => setEditProduit(null)} style={{ background: 'none', border: 'none', color: '#eef0f6', cursor: 'pointer', fontSize: 20 }}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={editProduitForm.type_equipement || 'Autre'} onChange={e => setEditProduitForm({ ...editProduitForm, type_equipement: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Marque</label>
                  <input list="marques-list-edit" value={editProduitForm.marque || ''} onChange={e => setEditProduitForm({ ...editProduitForm, marque: e.target.value })} placeholder="ex: Samsung" style={inputStyle} />
                  <datalist id="marques-list-edit">{marques.map(m => <option key={m.id} value={m.nom} />)}</datalist>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Modèle / Référence *</label>
                  <input value={editProduitForm.modele || ''} onChange={e => setEditProduitForm({ ...editProduitForm, modele: e.target.value })} placeholder="ex: QM65B" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Numéro de série</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={editProduitForm.serial_number || ''} onChange={e => setEditProduitForm({ ...editProduitForm, serial_number: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                    <button title="Scanner" onClick={() => setScannerTarget('edit')} style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 10, padding: '0 12px', cursor: 'pointer', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon d={icons.barcode} size={16} color="#06B6D4" />
                    </button>
                  </div>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Description</label>
                  <textarea value={editProduitForm.description || ''} onChange={e => setEditProduitForm({ ...editProduitForm, description: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} />
                </div>
              </div>
              <div style={{ marginBottom: editProduitForm.sur_reseau ? 12 : 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 14px' }}
                  onClick={() => setEditProduitForm({ ...editProduitForm, sur_reseau: !editProduitForm.sur_reseau })}>
                  <div style={{ width: 40, height: 22, borderRadius: 11, background: editProduitForm.sur_reseau ? '#10B981' : 'rgba(255,255,255,0.1)', position: 'relative', transition: '.2s', flexShrink: 0 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: editProduitForm.sur_reseau ? 21 : 3, transition: 'left .2s' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#eef0f6' }}>Appareil sur le réseau</span>
                </div>
              </div>
              {editProduitForm.sur_reseau && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 12, padding: 14, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#06B6D4', textTransform: 'uppercase', letterSpacing: .8, whiteSpace: 'nowrap' }}>Carte réseau 1</span>
                      <input value={editProduitForm.label_reseau1 || ''} onChange={e => setEditProduitForm({ ...editProduitForm, label_reseau1: e.target.value })} placeholder="ex: Management / Dante" style={{ ...inputStyle, flex: 1, fontSize: 12, padding: '5px 10px' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[['ip','Adresse IP'],['masque','Masque'],['gateway','Passerelle'],['dns','DNS Primaire'],['dns_alt','DNS Secondaire']].map(([key, label]) => (
                        <div key={key}>
                          <label style={{ ...labelStyle, color: '#06B6D4' }}>{label}</label>
                          <input value={editProduitForm[key] || ''} onChange={e => setEditProduitForm({ ...editProduitForm, [key]: e.target.value })} style={{ ...inputStyle, fontFamily: "'Cousine', monospace" }} />
                        </div>
                      ))}
                      <div>
                        <label style={labelStyle}>Identifiant</label>
                        <input value={editProduitForm.login || ''} onChange={e => setEditProduitForm({ ...editProduitForm, login: e.target.value })} placeholder="admin / root..." style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Mot de passe</label>
                        <input type="password" value={editProduitForm.mdp || ''} onChange={e => setEditProduitForm({ ...editProduitForm, mdp: e.target.value })} style={inputStyle} />
                      </div>
                    </div>
                  </div>
                  {!showNic2Edit ? (
                    <button onClick={() => setShowNic2Edit(true)}
                      style={{ background: 'rgba(139,92,246,0.08)', border: '1px dashed rgba(139,92,246,0.3)', color: '#8B5CF6', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, width: '100%' }}>
                      + Ajouter une 2ème carte réseau
                    </button>
                  ) : (
                    <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: .8, whiteSpace: 'nowrap' }}>Carte réseau 2</span>
                          <input value={editProduitForm.label_reseau2 || ''} onChange={e => setEditProduitForm({ ...editProduitForm, label_reseau2: e.target.value })} placeholder="ex: Dante / AV LAN" style={{ ...inputStyle, flex: 1, fontSize: 12, padding: '5px 10px' }} />
                        </div>
                        <button onClick={() => { setShowNic2Edit(false); setEditProduitForm(f => ({ ...f, ip2: '', masque2: '', gateway2: '', dns2: '', dns2_alt: '', mdp2: '', label_reseau2: '' })) }}
                          style={{ background: 'none', border: 'none', color: '#7b8096', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>✕</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[['ip2','Adresse IP'],['masque2','Masque'],['gateway2','Passerelle'],['dns2','DNS Primaire'],['dns2_alt','DNS Secondaire']].map(([key, label]) => (
                          <div key={key}>
                            <label style={{ ...labelStyle, color: '#8B5CF6' }}>{label}</label>
                            <input value={editProduitForm[key] || ''} onChange={e => setEditProduitForm({ ...editProduitForm, [key]: e.target.value })} style={{ ...inputStyle, fontFamily: "'Cousine', monospace" }} />
                          </div>
                        ))}
                        <div>
                          <label style={labelStyle}>Identifiant</label>
                          <input value={editProduitForm.login2 || ''} onChange={e => setEditProduitForm({ ...editProduitForm, login2: e.target.value })} placeholder="admin / root..." style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Mot de passe</label>
                          <input type="password" value={editProduitForm.mdp2 || ''} onChange={e => setEditProduitForm({ ...editProduitForm, mdp2: e.target.value })} style={inputStyle} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditProduit(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#eef0f6', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
                <button onClick={saveEditProduit} disabled={saving} style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        )}

        {produitsFiltres.length === 0 && !showAddProduit && (
          <div style={{ textAlign: 'center', color: '#3d4155', padding: '40px 0', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 12 }}>
            {searchProduit || filtreReseau !== 'tous' ? 'Aucun équipement ne correspond au filtre' : 'Aucun équipement dans cette salle'}
          </div>
        )}

        {/* Equipment accordion list */}
        {produitsFiltres.map(produit => {
          const isExpanded = expandedProduit === produit.id
          const typeColor = getTypeColor(produit.type_equipement)
          return (
            <div key={produit.id} style={{ marginBottom: 8, background: '#181b24', border: '1px solid ' + (isExpanded ? typeColor + '40' : 'rgba(255,255,255,0.07)'), borderRadius: 14, overflow: 'hidden', transition: 'all .2s', position: 'relative' }}>
              {/* Type color bar */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: typeColor }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 12px 20px', cursor: 'pointer' }}
                onClick={() => setExpandedProduit(isExpanded ? null : produit.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: typeColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon d={icons.monitor} size={15} color={typeColor} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700, color: '#eef0f6' }}>{produit.reference}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: typeColor + '18', color: typeColor, border: '1px solid ' + typeColor + '35', fontFamily: "'Cousine', monospace" }}>
                        {produit.type_equipement}
                      </span>
                    </div>
                    <div style={{ fontFamily: "'Cousine', monospace", fontSize: 11, color: '#3d4155' }}>S/N: {produit.serial_number || '—'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {produit.sur_reseau ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, fontSize: 11, background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)', fontFamily: "'Cousine', monospace" }}>
                      <Icon d={icons.wifi} size={11} color="#10B981" /> {produit.ip}
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, fontSize: 11, background: 'rgba(107,114,128,0.12)', color: '#7b8096', border: '1px solid rgba(107,114,128,0.2)', fontFamily: "'Cousine', monospace" }}>
                      Hors réseau
                    </span>
                  )}
                  <svg style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '.2s' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7b8096" strokeWidth="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
              </div>

              {isExpanded && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.12)', padding: '14px 20px' }}>
                  {produit.description && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#7b8096', marginBottom: 12, lineHeight: 1.5 }}>
                      {produit.description}
                    </div>
                  )}
                  {produit.sur_reseau && (
                    <div style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.18)', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#06B6D4', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .8 }}>
                        Carte réseau 1{produit.label_reseau1 ? ` — ${produit.label_reseau1}` : ''}
                      </div>
                      <div className="equip-net-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                        {[['IP', produit.ip],['Masque', produit.masque],['Passerelle', produit.gateway],['DNS 1', produit.dns]].map(([lbl, val]) => (
                          <div key={lbl}>
                            <div style={{ fontSize: 10, color: '#7b8096', fontWeight: 600, marginBottom: 3 }}>{lbl}</div>
                            <div style={{ fontFamily: "'Cousine', monospace", fontSize: 13, color: '#eef0f6' }}>{val || '—'}</div>
                          </div>
                        ))}
                        {produit.dns_alt && (
                          <div>
                            <div style={{ fontSize: 10, color: '#7b8096', fontWeight: 600, marginBottom: 3 }}>DNS 2</div>
                            <div style={{ fontFamily: "'Cousine', monospace", fontSize: 13, color: '#eef0f6' }}>{produit.dns_alt}</div>
                          </div>
                        )}
                        {produit.login && (
                          <div>
                            <div style={{ fontSize: 10, color: '#7b8096', fontWeight: 600, marginBottom: 3 }}>Identifiant</div>
                            <div style={{ fontFamily: "'Cousine', monospace", fontSize: 13, color: '#eef0f6' }}>{produit.login}</div>
                          </div>
                        )}
                        {produit.mdp && (
                          <div>
                            <div style={{ fontSize: 10, color: '#7b8096', fontWeight: 600, marginBottom: 3 }}>Mot de passe</div>
                            <div style={{ fontFamily: "'Cousine', monospace", fontSize: 13, color: '#eef0f6' }}>{'•'.repeat(10)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {produit.ip2 && (
                    <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#8B5CF6', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .8 }}>
                        Carte réseau 2{produit.label_reseau2 ? ` — ${produit.label_reseau2}` : ''}
                      </div>
                      <div className="equip-net-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                        {[['IP', produit.ip2],['Masque', produit.masque2],['Passerelle', produit.gateway2],['DNS 1', produit.dns2]].map(([lbl, val]) => (
                          <div key={lbl}>
                            <div style={{ fontSize: 10, color: '#7b8096', fontWeight: 600, marginBottom: 3 }}>{lbl}</div>
                            <div style={{ fontFamily: "'Cousine', monospace", fontSize: 13, color: '#eef0f6' }}>{val || '—'}</div>
                          </div>
                        ))}
                        {produit.dns2_alt && (
                          <div>
                            <div style={{ fontSize: 10, color: '#7b8096', fontWeight: 600, marginBottom: 3 }}>DNS 2</div>
                            <div style={{ fontFamily: "'Cousine', monospace", fontSize: 13, color: '#eef0f6' }}>{produit.dns2_alt}</div>
                          </div>
                        )}
                        {produit.login2 && (
                          <div>
                            <div style={{ fontSize: 10, color: '#7b8096', fontWeight: 600, marginBottom: 3 }}>Identifiant</div>
                            <div style={{ fontFamily: "'Cousine', monospace", fontSize: 13, color: '#eef0f6' }}>{produit.login2}</div>
                          </div>
                        )}
                        {produit.mdp2 && (
                          <div>
                            <div style={{ fontSize: 10, color: '#7b8096', fontWeight: 600, marginBottom: 3 }}>Mot de passe</div>
                            <div style={{ fontFamily: "'Cousine', monospace", fontSize: 13, color: '#eef0f6' }}>{'•'.repeat(10)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {movingProduit === produit.id ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, padding: '8px 12px', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#8B5CF6', fontWeight: 600, whiteSpace: 'nowrap' }}>🔀 Vers :</span>
                      <select value={moveTarget} onChange={e => setMoveTarget(e.target.value)}
                        style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 10px', color: '#eef0f6', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
                        <option value="">Choisir une salle...</option>
                        {sallesChantier.filter(s => s.id !== parseInt(sid)).sort((a, b) => a.nom.localeCompare(b.nom, undefined, { numeric: true, sensitivity: 'base' })).map(s => (
                          <option key={s.id} value={s.id}>{s.nom}{s.etage ? ` — ${s.etage}` : ''}</option>
                        ))}
                      </select>
                      <button onClick={() => moveTarget && moveProduit(produit.id, moveTarget)} disabled={!moveTarget}
                        style={{ background: moveTarget ? 'linear-gradient(135deg,#8B5CF6,#6D28D9)' : 'rgba(139,92,246,0.2)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: moveTarget ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        Déplacer
                      </button>
                      <button onClick={() => { setMovingProduit(null); setMoveTarget('') }}
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#eef0f6', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 12 }}>
                        ✕
                      </button>
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setMovingProduit(produit.id); setMoveTarget('') }}
                      style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#8B5CF6', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      🔀 Déplacer
                    </button>
                    <button onClick={() => startEditProduit(produit)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#eef0f6', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon d={icons.edit} size={13} /> Modifier
                    </button>
                    <button onClick={() => deleteProduit(produit.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon d={icons.trash} size={13} color="#EF4444" /> Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {lightboxPhoto !== null && (
        <div onClick={() => setLightboxPhoto(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => setLightboxPhoto(null)}
            style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: '50%', width: 42, height: 42, cursor: 'pointer', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          {lightboxPhoto?.type === 'video' ? (
            <video src={lightboxPhoto.url} controls autoPlay onClick={e => e.stopPropagation()}
              style={{ maxWidth: '92vw', maxHeight: '88vh', borderRadius: 8, outline: 'none' }} />
          ) : (
            <>
              {lightboxPhoto > 0 && (
                <button onClick={e => { e.stopPropagation(); setLightboxPhoto(i => i - 1); }}
                  style={{ position: 'absolute', left: 16, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              )}
              <img src={photos[lightboxPhoto]?.url} alt="" onClick={e => e.stopPropagation()}
                style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }} />
              {lightboxPhoto < photos.length - 1 && (
                <button onClick={e => { e.stopPropagation(); setLightboxPhoto(i => i + 1); }}
                  style={{ position: 'absolute', right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
              )}
              {photos.length > 1 && (
                <div style={{ position: 'absolute', bottom: 20, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{lightboxPhoto + 1} / {photos.length}</div>
              )}
            </>
          )}
        </div>
      )}

      {scannerTarget && (
        <Scanner
          onResult={val => {
            if (scannerTarget === 'new') setNewProduit(prev => ({ ...prev, serial_number: val }))
            else setEditProduitForm(prev => ({ ...prev, serial_number: val }))
            setScannerTarget(null)
          }}
          onClose={() => setScannerTarget(null)}
        />
      )}
    </Layout>
  )
}
