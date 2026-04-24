import Scanner from '../components/Scanner'
import { useState, useEffect } from 'react'
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
}

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const STATUS = {
  a_faire:    { label: 'A faire',    color: '#7b8096' },
  en_cours:   { label: 'En cours',   color: '#F59E0B' },
  a_terminer: { label: 'A terminer', color: '#6366F1' },
  probleme:   { label: 'Problème',   color: '#EF4444' },
  termine:    { label: 'Terminé',    color: '#10B981' },
}

const TYPE_COLORS = {
  'TV':              '#60A5FA',
  'Videoprojecteur': '#A855F7',
  'Matrice':         '#F97316',
  'Visio':           '#10B981',
  'Amplificateur':   '#F59E0B',
  'Switch AV':       '#06B6D4',
  'Controleur':      '#EF4444',
  'Autre':           '#7b8096',
}

const getTypeColor = (type) => TYPE_COLORS[type] || '#7b8096'

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

  const [salle, setSalle] = useState(null)
  const [chantiers, setChantiers] = useState([])
  const [chantierNom, setChantierNom] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedProduit, setExpandedProduit] = useState(null)
  const [showAddProduit, setShowAddProduit] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showNetworkPanel, setShowNetworkPanel] = useState(false)
  const [editComment, setEditComment] = useState(false)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [editProduit, setEditProduit] = useState(null)
  const [editProduitForm, setEditProduitForm] = useState({})
  const [filtreReseau, setFiltreReseau] = useState('tous')
  const [searchProduit, setSearchProduit] = useState('')
  const [newProduit, setNewProduit] = useState({
    type_equipement: 'TV', reference: '', serial_number: '',
    description: '', sur_reseau: false,
    ip: '', masque: '', gateway: '', dns: '', mdp: ''
  })

  useEffect(() => {
    axios.get('/api/chantiers').then(res => {
      setChantiers(res.data)
      const ch = res.data.find(c => c.id === parseInt(cid))
      if (ch) setChantierNom(ch.nom)
    })
    axios.get('/api/chantiers/' + cid)
      .then(res => {
        const s = res.data.salles?.find(s => s.id === parseInt(sid))
        if (s) { setSalle(s); setComment(s.commentaire || '') }
        else navigate('/chantiers/' + cid)
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
      const res = await axios.post('/api/salles/' + sid + '/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSalle(prev => ({ ...prev, photo_url: res.data.photo_url }))
    } catch (err) { alert('Erreur upload photo.') }
    finally { setUploadingPhoto(false) }
  }

  const deletePhoto = async () => {
    if (!confirm('Supprimer la photo ?')) return
    try { await axios.delete('/api/salles/' + sid + '/photo'); setSalle(prev => ({ ...prev, photo_url: null })) }
    catch (err) { alert('Erreur suppression photo.') }
  }

  const addProduit = async () => {
    if (!newProduit.reference) return
    setSaving(true)
    try {
      const res = await axios.post('/api/salles/' + sid + '/produits', newProduit)
      setSalle(prev => ({ ...prev, produits: [...(prev.produits || []), res.data] }))
      setNewProduit({ type_equipement: 'TV', reference: '', serial_number: '', description: '', sur_reseau: false, ip: '', masque: salle?.net_masque || '', gateway: salle?.net_gateway || '', dns: salle?.net_dns || '', mdp: '' })
      setShowAddProduit(false)
    } catch (err) { alert('Erreur ajout.') }
    finally { setSaving(false) }
  }

  const deleteProduit = async (id) => {
    if (!confirm('Supprimer cet équipement ?')) return
    await axios.delete('/api/produits/' + id)
    setSalle(prev => ({ ...prev, produits: prev.produits.filter(p => p.id !== id) }))
  }

  const startEditProduit = (p) => {
    setEditProduit(p)
    setEditProduitForm({ type_equipement: p.type_equipement, reference: p.reference, serial_number: p.serial_number || '', description: p.description || '', sur_reseau: p.sur_reseau, ip: p.ip || '', masque: p.masque || '', gateway: p.gateway || '', dns: p.dns || '', mdp: p.mdp || '' })
  }

  const saveEditProduit = async () => {
    setSaving(true)
    try {
      const res = await axios.patch('/api/produits/' + editProduit.id, editProduitForm)
      setSalle(prev => ({ ...prev, produits: prev.produits.map(p => p.id === editProduit.id ? { ...p, ...res.data } : p) }))
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
  })

  if (loading) return <Layout chantiers={chantiers}><div style={{ textAlign: 'center', color: '#7b8096', padding: '60px 0' }}>Chargement...</div></Layout>
  if (!salle) return null

  const salleStatusColor = STATUS[salle.statut]?.color || '#7b8096'
  const newTypeColor = getTypeColor(newProduit.type_equipement)

  return (
    <Layout chantiers={chantiers}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

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

                {/* Photo zone */}
                {salle.photo_url ? (
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 140 }}>
                    <img src={salle.photo_url} alt="Photo salle"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 6 }}>
                      <label style={{ background: 'rgba(16,185,129,0.85)', color: '#fff', borderRadius: 20, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                        📷 Changer
                        <input type="file" accept="image/*" capture="environment" onChange={uploadPhoto} style={{ display: 'none' }} />
                      </label>
                      <button onClick={deletePhoto}
                        style={{ background: 'rgba(239,68,68,0.7)', border: 'none', color: '#fff', borderRadius: 20, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, height: 140, border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 12, cursor: 'pointer', color: '#7b8096', fontSize: 13, background: 'rgba(255,255,255,0.02)', position: 'relative', transition: 'border .2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}>
                    {uploadingPhoto ? <span>Upload en cours...</span> : (
                      <>
                        <Icon d={icons.camera} size={22} color="#3d4155" />
                        <span style={{ fontSize: 12 }}>Ajouter une photo</span>
                        <span style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                          📷 Prendre une photo
                        </span>
                      </>
                    )}
                    <input type="file" accept="image/*" capture="environment" onChange={uploadPhoto} style={{ display: 'none' }} />
                  </label>
                )}
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
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Type</label>
                <select value={newProduit.type_equipement} onChange={e => setNewProduit({ ...newProduit, type_equipement: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Référence *</label>
                <input value={newProduit.reference} onChange={e => setNewProduit({ ...newProduit, reference: e.target.value })} placeholder="Ex: Samsung QM65B" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Numéro de série</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newProduit.serial_number} onChange={e => setNewProduit({ ...newProduit, serial_number: e.target.value })} placeholder="S/N" style={{ ...inputStyle, flex: 1 }} />
                <button title="Scanner" onClick={() => setShowScanner(true)} style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 10, padding: '0 12px', cursor: 'pointer', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
              <div style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[['ip','Adresse IP','192.168.1.x'],['masque','Masque','255.255.255.0'],['gateway','Passerelle','192.168.1.1'],['dns','DNS','8.8.8.8']].map(([key, label, ph]) => (
                    <div key={key}>
                      <label style={{ ...labelStyle, color: '#06B6D4' }}>{label}</label>
                      <input value={newProduit[key]} onChange={e => setNewProduit({ ...newProduit, [key]: e.target.value })} placeholder={ph} style={{ ...inputStyle, fontFamily: "'Cousine', monospace" }} />
                    </div>
                  ))}
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelStyle}>Mot de passe</label>
                    <input type="password" value={newProduit.mdp} onChange={e => setNewProduit({ ...newProduit, mdp: e.target.value })} style={inputStyle} />
                  </div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddProduit(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#eef0f6', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
              <button onClick={addProduit} disabled={saving} style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                {saving ? 'Ajout...' : "Ajouter l'équipement"}
              </button>
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
                  <label style={labelStyle}>Référence *</label>
                  <input value={editProduitForm.reference || ''} onChange={e => setEditProduitForm({ ...editProduitForm, reference: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Numéro de série</label>
                  <input value={editProduitForm.serial_number || ''} onChange={e => setEditProduitForm({ ...editProduitForm, serial_number: e.target.value })} style={inputStyle} />
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
                <div style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[['ip','Adresse IP'],['masque','Masque'],['gateway','Passerelle'],['dns','DNS']].map(([key, label]) => (
                      <div key={key}>
                        <label style={{ ...labelStyle, color: '#06B6D4' }}>{label}</label>
                        <input value={editProduitForm[key] || ''} onChange={e => setEditProduitForm({ ...editProduitForm, [key]: e.target.value })} style={{ ...inputStyle, fontFamily: "'Cousine', monospace" }} />
                      </div>
                    ))}
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={labelStyle}>Mot de passe</label>
                      <input type="password" value={editProduitForm.mdp || ''} onChange={e => setEditProduitForm({ ...editProduitForm, mdp: e.target.value })} style={inputStyle} />
                    </div>
                  </div>
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
                    <div style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.18)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#06B6D4', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .8 }}>Configuration réseau</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                        {[['IP', produit.ip],['Masque', produit.masque],['Passerelle', produit.gateway],['DNS', produit.dns]].map(([lbl, val]) => (
                          <div key={lbl}>
                            <div style={{ fontSize: 10, color: '#7b8096', fontWeight: 600, marginBottom: 3 }}>{lbl}</div>
                            <div style={{ fontFamily: "'Cousine', monospace", fontSize: 13, color: '#eef0f6' }}>{val || '—'}</div>
                          </div>
                        ))}
                        {produit.mdp && (
                          <div>
                            <div style={{ fontSize: 10, color: '#7b8096', fontWeight: 600, marginBottom: 3 }}>Mot de passe</div>
                            <div style={{ fontFamily: "'Cousine', monospace", fontSize: 13, color: '#eef0f6' }}>{'•'.repeat(10)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
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

      {showScanner && (
        <Scanner
          onResult={val => { setNewProduit(prev => ({ ...prev, serial_number: val })); setShowScanner(false) }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </Layout>
  )
}
