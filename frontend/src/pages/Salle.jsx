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
  a_faire:    { label: 'A faire',    color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
  en_cours:   { label: 'En cours',   color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  a_terminer: { label: 'A terminer', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  probleme:   { label: 'Probleme',   color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  termine:    { label: 'Termine',    color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
}

const TYPES_DEFAULT = ['TV','Videoprojecteur','Matrice','Visio','Amplificateur','Switch AV','Controleur','Autre']

const Badge = ({ statut }) => {
  const cfg = STATUS[statut] || STATUS.a_faire
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, border: '1px solid ' + cfg.color + '40' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color }} />
      {cfg.label}
    </span>
  )
}

const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EAF0', fontSize: 13, outline: 'none' }
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6, display: 'block' }

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
      const res = await axios.post('/api/salles/' + sid + '/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSalle(prev => ({ ...prev, photo_url: res.data.photo_url }))
    } catch (err) {
      alert('Erreur upload photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const deletePhoto = async () => {
    if (!confirm('Supprimer la photo ?')) return
    try {
      await axios.delete('/api/salles/' + sid + '/photo')
      setSalle(prev => ({ ...prev, photo_url: null }))
    } catch (err) {
      alert('Erreur suppression photo.')
    }
  }

  const addProduit = async () => {
    if (!newProduit.reference) return
    setSaving(true)
    try {
      const res = await axios.post('/api/salles/' + sid + '/produits', newProduit)
      setSalle(prev => ({ ...prev, produits: [...(prev.produits || []), res.data] }))
      setNewProduit({ type_equipement: 'TV', reference: '', serial_number: '', description: '', sur_reseau: false, ip: '', masque: salle?.net_masque || '', gateway: salle?.net_gateway || '', dns: salle?.net_dns || '', mdp: '' })
      setShowAddProduit(false)
    } catch (err) {
      alert('Erreur ajout.')
    } finally {
      setSaving(false)
    }
  }

  const deleteProduit = async (id) => {
    if (!confirm('Supprimer cet equipement ?')) return
    await axios.delete('/api/produits/' + id)
    setSalle(prev => ({ ...prev, produits: prev.produits.filter(p => p.id !== id) }))
  }

  const startEditProduit = (p) => {
    setEditProduit(p)
    setEditProduitForm({
      type_equipement: p.type_equipement, reference: p.reference,
      serial_number: p.serial_number || '', description: p.description || '',
      sur_reseau: p.sur_reseau, ip: p.ip || '', masque: p.masque || '',
      gateway: p.gateway || '', dns: p.dns || '', mdp: p.mdp || ''
    })
  }

  const saveEditProduit = async () => {
    setSaving(true)
    try {
      const res = await axios.patch('/api/produits/' + editProduit.id, editProduitForm)
      setSalle(prev => ({ ...prev, produits: prev.produits.map(p => p.id === editProduit.id ? { ...p, ...res.data } : p) }))
      setEditProduit(null)
    } catch (err) {
      alert('Erreur modification.')
    } finally {
      setSaving(false)
    }
  }

  const exportSalle = async () => {
    try {
      const res = await axios.get('/api/salles/' + sid + '/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'AVTrack_salle_' + sid + '.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Erreur export.')
    }
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

  if (loading) return <Layout chantiers={chantiers}><div style={{ textAlign: 'center', color: '#6B7280', padding: '60px 0' }}>Chargement...</div></Layout>
  if (!salle) return null

  return (
    <Layout chantiers={chantiers}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 12, color: '#6B7280', flexWrap: 'wrap' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Tableau de bord</span>
          <span>›</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/chantiers/' + cid)}>{chantierNom}</span>
          <span>›</span>
          <span style={{ color: '#E8EAF0' }}>{salle.nom}</span>
        </div>

        <div style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800 }}>{salle.nom}</h1>
                <Badge statut={salle.statut} />
              </div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{salle.etage} · {chantierNom}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={salle.statut} onChange={e => updateStatut(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: '#E8EAF0', fontSize: 12, cursor: 'pointer' }}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button onClick={exportSalle}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon d={icons.download} size={14} /> Export
              </button>
            </div>
          </div>

          {salle.photo_url ? (
            <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
              <img src={salle.photo_url} alt="Photo salle"
                style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block', borderRadius: 12 }} />
              <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', gap: 6 }}>
                <label style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon d={icons.camera} size={13} color="#fff" /> Changer
                  <input type="file" accept="image/*" capture="environment" onChange={uploadPhoto} style={{ display: 'none' }} />
                </label>
                <button onClick={deletePhoto}
                  style={{ background: 'rgba(239,68,68,0.7)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>
                  Supprimer
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '20px', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 12, cursor: 'pointer', color: '#6B7280', fontSize: 13 }}>
                {uploadingPhoto ? <span>Upload en cours...</span> : <><Icon d={icons.camera} size={16} /> Ajouter une photo de la salle</>}
                <input type="file" accept="image/*" capture="environment" onChange={uploadPhoto} style={{ display: 'none' }} />
              </label>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Commentaire</div>
            {editComment ? (
              <div>
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditComment(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 12 }}>Annuler</button>
                  <button onClick={saveComment} style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>Sauvegarder</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 13, color: salle.commentaire ? '#E8EAF0' : '#4B5563', flex: 1, fontStyle: !salle.commentaire ? 'italic' : 'normal' }}>
                  {salle.commentaire || 'Aucun commentaire'}
                </div>
                <button onClick={() => setEditComment(true)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 8, padding: '5px 8px', cursor: 'pointer' }}>
                  <Icon d={icons.edit} size={13} />
                </button>
              </div>
            )}
          </div>

          <div>
            <button onClick={() => setShowNetworkPanel(!showNetworkPanel)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#00D4FF', fontSize: 13, fontWeight: 600, padding: 0 }}>
              <Icon d={icons.network} size={15} color="#00D4FF" /> Reseau salle
              <Icon d={icons.chevronDown} size={14} color="#00D4FF" />
            </button>
            {showNetworkPanel && (
              <div style={{ marginTop: 12, padding: 14, background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 10 }}>
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
                  style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon d={icons.wifi} size={13} color="#fff" /> Appliquer a tous les equipements
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon d={icons.monitor} size={18} color="#00D4FF" />
            Equipements ({produitsFiltres.length}/{salle.produits?.length || 0})
          </h2>
          <button onClick={() => setShowAddProduit(!showAddProduit)}
            style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon d={icons.plus} size={14} color="#fff" /> Ajouter
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <input value={searchProduit} onChange={e => setSearchProduit(e.target.value)}
            placeholder="Rechercher un equipement..."
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 14px', color: '#E8EAF0', fontSize: 13, outline: 'none', minWidth: 180 }} />
          {['tous','reseau','hors_reseau'].map(f => (
            <button key={f} onClick={() => setFiltreReseau(f)}
              style={{ background: filtreReseau === f ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.05)', border: '1px solid ' + (filtreReseau === f ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.1)'), color: filtreReseau === f ? '#00D4FF' : '#8B8FA8', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {f === 'tous' ? 'Tous' : f === 'reseau' ? 'Sur reseau' : 'Hors reseau'}
            </button>
          ))}
        </div>

        {showAddProduit && (
          <div style={{ background: '#13151E', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>Nouvel equipement</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Type</label>
                <select value={newProduit.type_equipement} onChange={e => setNewProduit({ ...newProduit, type_equipement: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Reference *</label>
                <input value={newProduit.reference} onChange={e => setNewProduit({ ...newProduit, reference: e.target.value })} placeholder="Ex: Samsung QM65B" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Numero de serie</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newProduit.serial_number} onChange={e => setNewProduit({ ...newProduit, serial_number: e.target.value })} placeholder="S/N" style={{ ...inputStyle, flex: 1 }} />
                <button title="Scanner" onClick={() => setShowScanner(true)} style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>
                  <Icon d={icons.barcode} size={16} color="#00D4FF" />
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Description</label>
              <textarea value={newProduit.description} onChange={e => setNewProduit({ ...newProduit, description: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} />
            </div>
            <div style={{ marginBottom: newProduit.sur_reseau ? 10 : 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onClick={() => setNewProduit({ ...newProduit, sur_reseau: !newProduit.sur_reseau, masque: salle?.net_masque || '', gateway: salle?.net_gateway || '', dns: salle?.net_dns || '' })}>
                <div style={{ width: 36, height: 20, borderRadius: 10, background: newProduit.sur_reseau ? '#00D4FF' : 'rgba(255,255,255,0.1)', position: 'relative', transition: '.2s', flexShrink: 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: newProduit.sur_reseau ? 18 : 2, transition: '.2s' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Appareil sur le reseau</span>
              </div>
            </div>
            {newProduit.sur_reseau && (
              <div style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[['ip','Adresse IP','192.168.1.x'],['masque','Masque','255.255.255.0'],['gateway','Passerelle','192.168.1.1'],['dns','DNS','8.8.8.8']].map(([key, label, ph]) => (
                    <div key={key}>
                      <label style={labelStyle}>{label}</label>
                      <input value={newProduit[key]} onChange={e => setNewProduit({ ...newProduit, [key]: e.target.value })} placeholder={ph} style={inputStyle} />
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
              <button onClick={() => setShowAddProduit(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
              <button onClick={addProduit} disabled={saving} style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                {saving ? 'Ajout...' : "Ajouter l'equipement"}
              </button>
            </div>
          </div>
        )}

        {editProduit && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800 }}>Modifier</div>
                <button onClick={() => setEditProduit(null)} style={{ background: 'none', border: 'none', color: '#E8EAF0', cursor: 'pointer', fontSize: 20 }}>x</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={editProduitForm.type_equipement || 'Autre'} onChange={e => setEditProduitForm({ ...editProduitForm, type_equipement: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Reference *</label>
                  <input value={editProduitForm.reference || ''} onChange={e => setEditProduitForm({ ...editProduitForm, reference: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Numero de serie</label>
                  <input value={editProduitForm.serial_number || ''} onChange={e => setEditProduitForm({ ...editProduitForm, serial_number: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Description</label>
                  <textarea value={editProduitForm.description || ''} onChange={e => setEditProduitForm({ ...editProduitForm, description: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} />
                </div>
              </div>
              <div style={{ marginBottom: editProduitForm.sur_reseau ? 12 : 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                  onClick={() => setEditProduitForm({ ...editProduitForm, sur_reseau: !editProduitForm.sur_reseau })}>
                  <div style={{ width: 36, height: 20, borderRadius: 10, background: editProduitForm.sur_reseau ? '#00D4FF' : 'rgba(255,255,255,0.1)', position: 'relative', transition: '.2s', flexShrink: 0 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: editProduitForm.sur_reseau ? 18 : 2, transition: '.2s' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Appareil sur le reseau</span>
                </div>
              </div>
              {editProduitForm.sur_reseau && (
                <div style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[['ip','Adresse IP'],['masque','Masque'],['gateway','Passerelle'],['dns','DNS']].map(([key, label]) => (
                      <div key={key}>
                        <label style={labelStyle}>{label}</label>
                        <input value={editProduitForm[key] || ''} onChange={e => setEditProduitForm({ ...editProduitForm, [key]: e.target.value })} style={inputStyle} />
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
                <button onClick={() => setEditProduit(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
                <button onClick={saveEditProduit} disabled={saving} style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        )}

        {produitsFiltres.length === 0 && !showAddProduit && (
          <div style={{ textAlign: 'center', color: '#4B5563', padding: '40px 0', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 12 }}>
            {searchProduit || filtreReseau !== 'tous' ? 'Aucun equipement ne correspond au filtre' : 'Aucun equipement dans cette salle'}
          </div>
        )}

        {produitsFiltres.map(produit => {
          const isExpanded = expandedProduit === produit.id
          return (
            <div key={produit.id} style={{ marginBottom: 10, background: '#13151E', border: '1px solid ' + (isExpanded ? 'rgba(0,212,255,0.25)' : 'rgba(255,255,255,0.07)'), borderRadius: 14, overflow: 'hidden', transition: '.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer' }}
                onClick={() => setExpandedProduit(isExpanded ? null : produit.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,212,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon d={icons.monitor} size={15} color="#00D4FF" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{produit.reference}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(0,212,255,0.1)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.2)' }}>
                        {produit.type_equipement}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280', fontFamily: 'monospace' }}>S/N: {produit.serial_number || '—'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {produit.sur_reseau ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, fontSize: 11, background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <Icon d={icons.wifi} size={11} color="#10B981" /> {produit.ip}
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, fontSize: 11, background: 'rgba(107,114,128,0.12)', color: '#6B7280', border: '1px solid rgba(107,114,128,0.2)' }}>
                      Hors reseau
                    </span>
                  )}
                  <Icon d={icons.chevronDown} size={14} color="#6B7280" />
                </div>
              </div>
              {isExpanded && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px' }}>
                  {produit.description && <div style={{ fontSize: 13, color: '#8B8FA8', marginBottom: 12 }}>{produit.description}</div>}
                  {produit.sur_reseau && (
                    <div style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#00D4FF', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .8 }}>Reseau</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8 }}>
                        {[['IP', produit.ip],['Masque', produit.masque],['Passerelle', produit.gateway],['DNS', produit.dns]].map(([lbl, val]) => (
                          <div key={lbl}>
                            <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 600, marginBottom: 2 }}>{lbl}</div>
                            <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#E8EAF0' }}>{val || '—'}</div>
                          </div>
                        ))}
                        {produit.mdp && (
                          <div>
                            <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 600, marginBottom: 2 }}>Mot de passe</div>
                            <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#E8EAF0' }}>{'•'.repeat(8)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => startEditProduit(produit)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
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
