import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../components/Layout'
import Documents from '../components/Documents'

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

const icons = {
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  monitor: "M2 3h20v14H2zM8 21h8M12 17v4",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  history: "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  plus: "M12 5v14M5 12h14",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  truck: "M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  pen: "M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z",
  check: "M20 6L9 17l-5-5",
  trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
}

const Badge = ({ statut }) => {
  const cfg = STATUS[statut] || STATUS.a_faire
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, border: '1px solid ' + cfg.color + '40' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color }} />
      {cfg.label}
    </span>
  )
}

function BLSignatureModal({ bl, onClose, onSigned }) {
  const canvasRef = useRef(null)
  const [nomSignataire, setNomSignataire] = useState('')
  const [dateSignature, setDateSignature] = useState(new Date().toISOString().slice(0, 10))
  const [commentaire, setCommentaire] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.offsetWidth || 500
    canvas.height = 200

    let isDown = false

    const getP = (e) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const touch = e.touches ? e.touches[0] : e
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY }
    }

    const start = (e) => {
      e.preventDefault()
      const ctx = canvas.getContext('2d')
      const pos = getP(e)
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
      isDown = true
    }

    const move = (e) => {
      e.preventDefault()
      if (!isDown) return
      const ctx = canvas.getContext('2d')
      const pos = getP(e)
      ctx.lineTo(pos.x, pos.y)
      ctx.strokeStyle = '#00D4FF'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.stroke()
      setHasSignature(true)
    }

    const stop = () => { isDown = false }

    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', move)
    canvas.addEventListener('mouseup', stop)
    canvas.addEventListener('mouseleave', stop)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove', move, { passive: false })
    canvas.addEventListener('touchend', stop, { passive: false })

    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', move)
      canvas.removeEventListener('mouseup', stop)
      canvas.removeEventListener('mouseleave', stop)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', move)
      canvas.removeEventListener('touchend', stop)
    }
  }, [])

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const handleSave = async () => {
    if (!nomSignataire) { alert('Nom du signataire requis.'); return }
    if (!hasSignature) { alert('Veuillez signer.'); return }
    setSaving(true)
    try {
      const canvas = canvasRef.current
      const signatureBase64 = canvas.toDataURL('image/png').split(',')[1]
      const res = await axios.post('/api/bons-livraison/' + bl.id + '/signer', {
        signatureBase64,
        nom_signataire: nomSignataire,
        commentaire,
        date_signature: dateSignature
      })
      onSigned(res.data)
      onClose()
    } catch (err) {
      alert('Erreur lors de la signature.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EAF0', fontSize: 13, outline: 'none' }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 16, width: '100%', maxWidth: 560, maxHeight: '95vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800 }}>Signer le bon de livraison</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#E8EAF0', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>{decodeURIComponent(escape(bl.nom_original))}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Nom du signataire *</label>
            <input value={nomSignataire} onChange={e => setNomSignataire(e.target.value)} placeholder="Prénom Nom" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Date *</label>
            <input type="date" value={dateSignature} onChange={e => setDateSignature(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }} />
          </div>
          <div>
            <label style={labelStyle}>Commentaire</label>
            <input value={commentaire} onChange={e => setCommentaire(e.target.value)} placeholder="Optionnel" style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={labelStyle}>Signature *</label>
            <button onClick={clearSignature} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>Effacer</button>
          </div>
          <canvas ref={canvasRef}
            style={{ width: '100%', height: 200, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, cursor: 'crosshair', touchAction: 'none', display: 'block' }}
          />
          <div style={{ fontSize: 11, color: '#4B5563', marginTop: 4, textAlign: 'center' }}>Signez avec votre doigt ou la souris</div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon d={icons.check} size={14} color="#fff" /> {saving ? 'Signature...' : 'Valider la signature'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Chantier() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [chantier, setChantier] = useState(null)
  const [chantiers, setChantiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('salles')
  const [showAddSalle, setShowAddSalle] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editSalle, setEditSalle] = useState(null)
  const [editSalleForm, setEditSalleForm] = useState({})
  const [newSalle, setNewSalle] = useState({ nom: '', etage: '', net_masque: '255.255.255.0', net_gateway: '', net_dns: '' })
  const [bls, setBls] = useState([])
  const [uploadingBL, setUploadingBL] = useState(false)
  const [signingBL, setSigningBL] = useState(null)
  const [viewingBL, setViewingBL] = useState(null)
  const [blObjectUrl, setBlObjectUrl] = useState(null)

  useEffect(() => {
    axios.get('/api/chantiers').then(res => setChantiers(res.data))
    axios.get('/api/chantiers/' + id)
      .then(res => setChantier(res.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (tab === 'bl') {
      axios.get('/api/bons-livraison/chantier/' + id).then(res => setBls(res.data))
    }
  }, [tab, id])

  const updateStatut = async (statut) => {
    await axios.patch('/api/chantiers/' + id, { statut })
    setChantier(prev => ({ ...prev, statut }))
  }

  const addSalle = async () => {
    if (!newSalle.nom) return
    setSaving(true)
    try {
      const res = await axios.post('/api/chantiers/' + id + '/salles', newSalle)
      setChantier(prev => ({ ...prev, salles: [...prev.salles, res.data] }))
      setNewSalle({ nom: '', etage: '', net_masque: '255.255.255.0', net_gateway: '', net_dns: '' })
      setShowAddSalle(false)
    } catch (err) { alert('Erreur lors de la creation de la salle') }
    finally { setSaving(false) }
  }

  const deleteSalle = async (salleId, nom) => {
    if (!confirm('Supprimer la salle "' + nom + '" ?')) return
    try {
      await axios.delete('/api/salles/' + salleId)
      setChantier(prev => ({ ...prev, salles: prev.salles.filter(s => s.id !== salleId) }))
    } catch (err) { alert('Erreur lors de la suppression.') }
  }

  const startEditSalle = (s) => {
    setEditSalle(s)
    setEditSalleForm({ nom: s.nom, etage: s.etage || '', statut: s.statut, net_masque: s.net_masque || '', net_gateway: s.net_gateway || '', net_dns: s.net_dns || '' })
  }

  const saveEditSalle = async () => {
    setSaving(true)
    try {
      const res = await axios.patch('/api/salles/' + editSalle.id, editSalleForm)
      setChantier(prev => ({ ...prev, salles: prev.salles.map(s => s.id === editSalle.id ? { ...s, ...res.data } : s) }))
      setEditSalle(null)
    } catch (err) { alert('Erreur lors de la modification.') }
    finally { setSaving(false) }
  }

  const exportExcel = async () => {
    try {
      const res = await axios.get('/api/chantiers/' + id + '/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'AVTrack_chantier_' + id + '.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) { alert('Erreur lors de l\'export') }
  }

  const uploadBL = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingBL(true)
    try {
      const formData = new FormData()
      formData.append('fichier', file)
      const res = await axios.post('/api/bons-livraison/chantier/' + id, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setBls(prev => [res.data, ...prev])
    } catch (err) { alert('Erreur upload BL.') }
    finally { setUploadingBL(false) }
  }

  const downloadBL = async (bl, signe = false) => {
    try {
      const url = '/api/bons-livraison/' + bl.id + (signe ? '/download-signe' : '/download')
      const res = await axios.get(url, { responseType: 'blob' })
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = blobUrl
      const nom = signe ? bl.nom_original.replace('.pdf', '_signe.pdf') : bl.nom_original
      link.setAttribute('download', nom)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) { alert('Erreur lors du téléchargement.') }
  }

  const viewBL = async (bl) => {
    try {
      const res = await axios.get('/api/bons-livraison/' + bl.id + '/download', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      setBlObjectUrl(url)
      setViewingBL(bl)
    } catch (err) { alert('Erreur lors de la lecture du BL.') }
  }

  const deleteBL = async (bl) => {
    if (!confirm('Supprimer ce bon de livraison ?')) return
    try {
      await axios.delete('/api/bons-livraison/' + bl.id)
      setBls(prev => prev.filter(b => b.id !== bl.id))
    } catch (err) { alert('Erreur suppression BL.') }
  }

  if (loading) return <Layout chantiers={chantiers}><div style={{ textAlign: 'center', color: '#6B7280', padding: '60px 0' }}>Chargement...</div></Layout>
  if (!chantier) return null

  const done = chantier.salles ? chantier.salles.filter(s => s.statut === 'termine').length : 0
  const total = chantier.salles ? chantier.salles.length : 0
  const pct = total ? Math.round((done / total) * 100) : 0

  const tabStyle = (t) => ({
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '10px 16px', fontSize: 13, fontWeight: 600,
    color: tab === t ? '#00D4FF' : '#6B7280',
    borderBottom: tab === t ? '2px solid #00D4FF' : '2px solid transparent',
    display: 'flex', alignItems: 'center', gap: 6,
    transition: '.2s', marginBottom: -1
  })

  const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EAF0', fontSize: 13, outline: 'none' }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6, display: 'block' }

  const BL_STATUT = {
    en_attente: { label: 'En attente', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
    signe: { label: 'Signe', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  }

  return (
    <Layout chantiers={chantiers}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 12, color: '#6B7280', flexWrap: 'wrap' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Tableau de bord</span>
          <span>›</span>
          <span style={{ color: '#E8EAF0' }}>{chantier.nom}</span>
        </div>

        <div style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800 }}>{chantier.nom}</h1>
                <Badge statut={chantier.statut} />
              </div>
              <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>{chantier.client} · {chantier.adresse}</div>
              <div style={{ fontSize: 12, color: '#4B5563' }}>{chantier.date_debut} - {chantier.date_fin}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={chantier.statut} onChange={e => updateStatut(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: '#E8EAF0', fontSize: 12, cursor: 'pointer' }}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button onClick={exportExcel}
                style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon d={icons.download} size={14} color="#fff" /> Export Excel
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>{done}/{total} salles terminees</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? '#10B981' : '#00D4FF' }}>{pct}%</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg,#00D4FF,#0066CC)', borderRadius: 6, transition: '.5s' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap' }}>
          <button onClick={() => setTab('salles')} style={tabStyle('salles')}>
            <Icon d={icons.layers} size={14} color={tab === 'salles' ? '#00D4FF' : '#6B7280'} /> Salles
          </button>
          <button onClick={() => setTab('bl')} style={tabStyle('bl')}>
            <Icon d={icons.truck} size={14} color={tab === 'bl' ? '#00D4FF' : '#6B7280'} /> Bons de livraison
            {bls.filter(b => b.statut === 'en_attente').length > 0 && (
              <span style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
                {bls.filter(b => b.statut === 'en_attente').length}
              </span>
            )}
          </button>
          <button onClick={() => setTab('docs')} style={tabStyle('docs')}>
            <Icon d={icons.file} size={14} color={tab === 'docs' ? '#00D4FF' : '#6B7280'} /> Documents
          </button>
          <button onClick={() => setTab('historique')} style={tabStyle('historique')}>
            <Icon d={icons.history} size={14} color={tab === 'historique' ? '#00D4FF' : '#6B7280'} /> Historique
          </button>
        </div>

        {tab === 'salles' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, color: '#8B8FA8' }}>{chantier.salles ? chantier.salles.length : 0} salle(s)</div>
              <button onClick={() => setShowAddSalle(!showAddSalle)}
                style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon d={icons.plus} size={14} color="#fff" /> Ajouter salle
              </button>
            </div>

            {showAddSalle && (
              <div style={{ background: '#13151E', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>Nouvelle salle</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={labelStyle}>Nom *</label>
                    <input value={newSalle.nom} onChange={e => setNewSalle({ ...newSalle, nom: e.target.value })} placeholder="Ex: Salle Conference A" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Etage / Zone</label>
                    <input value={newSalle.etage} onChange={e => setNewSalle({ ...newSalle, etage: e.target.value })} placeholder="Ex: 2eme" style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {[['net_masque','Masque','255.255.255.0'],['net_gateway','Passerelle','192.168.1.1'],['net_dns','DNS','8.8.8.8']].map(([key, label, ph]) => (
                    <div key={key}>
                      <label style={labelStyle}>{label}</label>
                      <input value={newSalle[key]} onChange={e => setNewSalle({ ...newSalle, [key]: e.target.value })} placeholder={ph} style={inputStyle} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowAddSalle(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
                  <button onClick={addSalle} disabled={saving} style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    {saving ? 'Creation...' : 'Creer la salle'}
                  </button>
                </div>
              </div>
            )}

            {editSalle && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <div style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800 }}>Modifier la salle</div>
                    <button onClick={() => setEditSalle(null)} style={{ background: 'none', border: 'none', color: '#E8EAF0', cursor: 'pointer', fontSize: 20 }}>✕</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div><label style={labelStyle}>Nom *</label><input value={editSalleForm.nom || ''} onChange={e => setEditSalleForm({ ...editSalleForm, nom: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Etage / Zone</label><input value={editSalleForm.etage || ''} onChange={e => setEditSalleForm({ ...editSalleForm, etage: e.target.value })} style={inputStyle} /></div>
                    <div>
                      <label style={labelStyle}>Statut</label>
                      <select value={editSalleForm.statut || 'a_faire'} onChange={e => setEditSalleForm({ ...editSalleForm, statut: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="a_faire">A faire</option>
                        <option value="en_cours">En cours</option>
                        <option value="a_terminer">A terminer</option>
                        <option value="probleme">Probleme</option>
                        <option value="termine">Termine</option>
                      </select>
                    </div>
                    <div><label style={labelStyle}>Masque</label><input value={editSalleForm.net_masque || ''} onChange={e => setEditSalleForm({ ...editSalleForm, net_masque: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Passerelle</label><input value={editSalleForm.net_gateway || ''} onChange={e => setEditSalleForm({ ...editSalleForm, net_gateway: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>DNS</label><input value={editSalleForm.net_dns || ''} onChange={e => setEditSalleForm({ ...editSalleForm, net_dns: e.target.value })} style={inputStyle} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditSalle(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
                    <button onClick={saveEditSalle} disabled={saving} style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                      {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
              {chantier.salles && chantier.salles.map(salle => (
                <div key={salle.id}
                  onClick={() => navigate('/chantiers/' + id + '/salles/' + salle.id)}
                  style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 18, cursor: 'pointer', transition: 'all .25s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{salle.nom}</div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>{salle.etage}</div>
                    </div>
                    <Badge statut={salle.statut} />
                  </div>
                  <div style={{ fontSize: 12, color: '#8B8FA8' }}>{salle.produits ? salle.produits.length : 0} equipement(s)</div>
                  {salle.commentaire && (
                    <div style={{ fontSize: 11, color: '#6B7280', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, marginTop: 8 }}>
                      "{salle.commentaire}"
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    onClick={e => e.stopPropagation()}>
                    <button onClick={() => startEditSalle(salle)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>✏️ Modifier</button>
                    <button onClick={() => deleteSalle(salle.id, salle.nom)} style={{ flex: 1, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>🗑️ Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'bl' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: '#8B8FA8' }}>{bls.length} bon(s) de livraison</div>
              <label style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon d={icons.plus} size={14} color="#fff" /> {uploadingBL ? 'Upload...' : 'Ajouter un BL'}
                <input type="file" accept="application/pdf" onChange={uploadBL} style={{ display: 'none' }} />
              </label>
            </div>

            {bls.length === 0 && (
              <div style={{ textAlign: 'center', color: '#4B5563', padding: '40px 0', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 12 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Aucun bon de livraison</div>
                <div style={{ fontSize: 13 }}>Ajoutez le BL PDF pour permettre la signature electronique</div>
              </div>
            )}

            {bls.map(bl => {
              const cfg = BL_STATUT[bl.statut] || BL_STATUT.en_attente
              return (
                <div key={bl.id} style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>📄 {bl.nom_original}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg }}>
                          {cfg.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>
                        Uploade le {new Date(bl.created_at).toLocaleDateString('fr-FR')}
                        {bl.uploaded_by_name && ' par ' + bl.uploaded_by_name}
                      </div>
                      {bl.statut === 'signe' && (
                        <div style={{ fontSize: 12, color: '#10B981', marginTop: 4 }}>
                          ✓ Signe par {bl.nom_signataire} le {new Date(bl.date_signature).toLocaleDateString('fr-FR')}
                          {bl.commentaire && ' — ' + bl.commentaire}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button onClick={() => viewBL(bl)}
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        👁️ Voir
                      </button>
                      <button onClick={() => downloadBL(bl)}
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon d={icons.download} size={12} />
                      </button>
                      {bl.statut === 'signe' && (
                        <button onClick={() => downloadBL(bl, true)}
                          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icon d={icons.download} size={12} color="#10B981" /> BL signe
                        </button>
                      )}
                      {bl.statut === 'en_attente' && (
                        <button onClick={() => setSigningBL(bl)}
                          style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icon d={icons.pen} size={12} color="#fff" /> Signer
                        </button>
                      )}
                      <button onClick={() => deleteBL(bl)}
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>
                        <Icon d={icons.trash} size={12} color="#EF4444" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'docs' && (
          <Documents
            chantierId={parseInt(id)}
            documents={chantier.documents || []}
            onDocumentsChange={docs => setChantier(prev => ({ ...prev, documents: docs }))}
          />
        )}

        {tab === 'historique' && (
          <div>
            {chantier.historique && chantier.historique.map((h, i) => (
              <div key={h.id} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,212,255,0.1)', border: '2px solid rgba(0,212,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon d={icons.history} size={12} color="#00D4FF" />
                  </div>
                  {i < chantier.historique.length - 1 && <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.06)', marginTop: 4 }} />}
                </div>
                <div style={{ paddingTop: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{h.action}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{h.user_nom} · {new Date(h.created_at).toLocaleString('fr-FR')}</div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {signingBL && (
        <BLSignatureModal
          bl={signingBL}
          onClose={() => setSigningBL(null)}
          onSigned={(data) => {
            setBls(prev => prev.map(b => b.id === signingBL.id ? {
              ...b, statut: 'signe',
              nom_signataire: data.nom_signataire,
              date_signature: data.date_signature,
              commentaire: data.commentaire,
              chemin_signe: data.chemin_signe
            } : b))
            setSigningBL(null)
          }}
        />
      )}

      {viewingBL && blObjectUrl && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#13151E', borderBottom: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>📄 {viewingBL.nom_original}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {viewingBL.statut === 'en_attente' && (
                <button onClick={() => { const bl = viewingBL; setViewingBL(null); setBlObjectUrl(null); setTimeout(() => setSigningBL(bl), 50) }}
                  style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ✍️ Signer ce BL
                </button>
              )}
              <button onClick={() => { setViewingBL(null); setBlObjectUrl(null) }}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
                ✕ Fermer
              </button>
            </div>
          </div>
          <object data={blObjectUrl} type="application/pdf" style={{ flex: 1, width: '100%', minHeight: '80vh' }}>
            <div style={{ padding: 20, textAlign: 'center' }}>
              <p style={{ color: '#6B7280', marginBottom: 16 }}>Le PDF ne peut pas être affiché directement sur mobile.</p>
              <a href={blObjectUrl} download={viewingBL.nom_original}
                style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', borderRadius: 10, padding: '10px 20px', textDecoration: 'none', fontWeight: 600 }}>
                Télécharger le BL
              </a>
            </div>
          </object>
        </div>
      )}

    </Layout>
  )
}
