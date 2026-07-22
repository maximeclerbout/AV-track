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
  a_faire:    { label: 'A faire',    color: 'var(--status-a_faire)'    },
  en_cours:   { label: 'En cours',   color: 'var(--status-en_cours)'   },
  a_terminer: { label: 'A terminer', color: 'var(--status-a_terminer)' },
  probleme:   { label: 'Problème',   color: 'var(--status-probleme)'   },
  termine:    { label: 'Terminé',    color: 'var(--status-termine)'    },
}

const icons = {
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  monitor: "M2 3h20v14H2zM8 21h8M12 17v4",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  history: "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  plus: "M12 5v14M5 12h14",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 0 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  truck: "M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  pen: "M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z",
  check: "M20 6L9 17l-5-5",
  trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  clipCheck: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4",
  network: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 1 2-2V9M9 21H5a2 2 0 0 0-2-2V9m0 0h18",
  wifi: "M5 12.5C7.5 10 10 8.5 12 8.5s4.5 1.5 7 4M8.5 15.5c1-1 2.2-1.5 3.5-1.5s2.5.5 3.5 1.5M12 19h.01",
}

const Badge = ({ statut }) => {
  const cfg = STATUS[statut] || STATUS.a_faire
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 600, color: cfg.color,
      background: cfg.color + '1a', border: '1px solid ' + cfg.color + '40',
      fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: .5
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

function PDFViewer({ url, title, canSign, onSign, onClose }) {
  const [pageImages, setPageImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        if (!window.pdfjsLib) {
          await new Promise((res, rej) => {
            const s = document.createElement('script')
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
            s.onload = res; s.onerror = rej
            document.head.appendChild(s)
          })
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        }
        const pdf = await window.pdfjsLib.getDocument({ url }).promise
        const images = []
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return
          const page = await pdf.getPage(i)
          const scale = window.devicePixelRatio >= 2 ? 2 : 1.5
          const vp = page.getViewport({ scale })
          const canvas = document.createElement('canvas')
          canvas.width = vp.width
          canvas.height = vp.height
          await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
          images.push(canvas.toDataURL())
        }
        if (!cancelled) { setPageImages(images); setLoading(false) }
      } catch (e) {
        if (!cancelled) { setError('Impossible de charger le PDF.'); setLoading(false) }
      }
    }
    init()
    return () => { cancelled = true }
  }, [url])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#0d0f14', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
          📄 {title}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {canSign && (
            <button onClick={onSign} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
              ✍️ Signer
            </button>
          )}
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
            ✕ Fermer
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', background: '#1a1d27' }}>
        {loading && (
          <div style={{ color: 'var(--fg-3)', fontSize: 14, paddingTop: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            Chargement du PDF...
          </div>
        )}
        {error && (
          <div style={{ color: '#EF4444', fontSize: 14, paddingTop: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>❌</div>
            {error}
          </div>
        )}
        {pageImages.map((src, i) => (
          <img key={i} src={src} alt={`Page ${i + 1}`}
            style={{ maxWidth: '100%', borderRadius: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.6)' }} />
        ))}
      </div>
    </div>
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
    const start = (e) => { e.preventDefault(); const ctx = canvas.getContext('2d'); const pos = getP(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); isDown = true }
    const move = (e) => {
      e.preventDefault()
      if (!isDown) return
      const ctx = canvas.getContext('2d')
      const pos = getP(e)
      ctx.lineTo(pos.x, pos.y)
      ctx.strokeStyle = 'var(--accent)'
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
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
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
        signatureBase64, nom_signataire: nomSignataire, commentaire, date_signature: dateSignature
      })
      onSigned(res.data)
      onClose()
    } catch (err) {
      alert('Erreur lors de la signature.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: 'var(--fg)', fontSize: 13, outline: 'none' }
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 16, width: '100%', maxWidth: 560, maxHeight: '95vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--fg)' }}>Signer le bon de livraison</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 16 }}>{decodeURIComponent(escape(bl.nom_original))}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <div><label style={labelStyle}>Nom du signataire *</label><input value={nomSignataire} onChange={e => setNomSignataire(e.target.value)} placeholder="Prénom Nom" style={inputStyle} /></div>
          <div><label style={labelStyle}>Date *</label><input type="date" value={dateSignature} onChange={e => setDateSignature(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }} /></div>
          <div><label style={labelStyle}>Commentaire</label><input value={commentaire} onChange={e => setCommentaire(e.target.value)} placeholder="Optionnel" style={inputStyle} /></div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={labelStyle}>Signature *</label>
            <button onClick={clearSignature} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>Effacer</button>
          </div>
          <canvas ref={canvasRef}
            style={{ width: '100%', height: 200, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, cursor: 'crosshair', touchAction: 'none', display: 'block' }}
          />
          <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 4, textAlign: 'center' }}>Signez avec votre doigt ou la souris</div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon d={icons.check} size={14} color="#fff" /> {saving ? 'Signature...' : 'Valider la signature'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ValidationSignModal({ validationId, type, onClose, onSigned }) {
  const canvasRef = useRef(null)
  const [nom, setNom] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.offsetWidth || 500
    canvas.height = 180
    let isDown = false
    const getP = (e) => {
      const rect = canvas.getBoundingClientRect()
      const sx = canvas.width / rect.width, sy = canvas.height / rect.height
      const t = e.touches ? e.touches[0] : e
      return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy }
    }
    const start = (e) => { e.preventDefault(); const ctx = canvas.getContext('2d'); const p = getP(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); isDown = true }
    const move = (e) => {
      e.preventDefault(); if (!isDown) return
      const ctx = canvas.getContext('2d'); const p = getP(e)
      ctx.lineTo(p.x, p.y); ctx.strokeStyle = 'var(--accent)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke()
      setHasSignature(true)
    }
    const stop = () => { isDown = false }
    canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); canvas.addEventListener('mouseup', stop); canvas.addEventListener('mouseleave', stop)
    canvas.addEventListener('touchstart', start, { passive: false }); canvas.addEventListener('touchmove', move, { passive: false }); canvas.addEventListener('touchend', stop, { passive: false })
    return () => {
      canvas.removeEventListener('mousedown', start); canvas.removeEventListener('mousemove', move); canvas.removeEventListener('mouseup', stop); canvas.removeEventListener('mouseleave', stop)
      canvas.removeEventListener('touchstart', start); canvas.removeEventListener('touchmove', move); canvas.removeEventListener('touchend', stop)
    }
  }, [])

  const clear = () => { canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); setHasSignature(false) }

  const handleSave = async () => {
    if (!nom.trim()) { alert('Nom requis.'); return }
    if (!hasSignature) { alert('Veuillez signer.'); return }
    setSaving(true)
    try {
      const signatureBase64 = canvasRef.current.toDataURL('image/png').split(',')[1]
      await axios.post(`/api/validations/${validationId}/signer`, { type, signatureBase64, nom_signataire: nom, date_signature: date })
      onSigned()
      onClose()
    } catch { alert('Erreur lors de la signature.') }
    finally { setSaving(false) }
  }

  const isClient = type === 'client'
  const accentColor = isClient ? 'var(--accent)' : '#818CF8'
  const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: 'var(--fg)', fontSize: 13, outline: 'none' }
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(6px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: `1px solid ${accentColor}40`, borderRadius: 20, padding: 20, width: '100%', maxWidth: 520, maxHeight: '95vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--fg)' }}>
            Signature — {isClient ? 'Client' : 'Technicien AVI'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <div><label style={labelStyle}>Nom *</label><input value={nom} onChange={e => setNom(e.target.value)} placeholder="Prénom Nom" style={inputStyle} /></div>
          <div><label style={labelStyle}>Date *</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }} /></div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={labelStyle}>Signature *</label>
            <button onClick={clear} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>Effacer</button>
          </div>
          <canvas ref={canvasRef} style={{ width: '100%', height: 180, background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}40`, borderRadius: 10, cursor: 'crosshair', touchAction: 'none', display: 'block' }} />
          <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 4, textAlign: 'center' }}>Signez avec votre doigt ou la souris</div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{ background: accentColor, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon d={icons.check} size={14} color="#fff" /> {saving ? 'Signature...' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ValidationModal({ chantier, onClose }) {
  const [validation, setValidation] = useState(null)
  const [articles, setArticles] = useState({}) // { produit_id: { valide, commentaire } }
  const [filterSalle, setFilterSalle] = useState('toutes')
  const [commentOpen, setCommentOpen] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [autoSaveStatus, setAutoSaveStatus] = useState('') // '' | 'saving' | 'saved'
  const [sigModal, setSigModal] = useState(null) // 'client' | 'tech'
  const saveTimerRef = useRef(null)
  const validationRef = useRef(null)
  const allProduitsRef = useRef([])

  const sallesAvecProduits = (chantier.salles || [])
    .filter(s => (s.produits || []).length > 0)
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true }))

  const allProduits = sallesAvecProduits.flatMap(s => s.produits || [])
  allProduitsRef.current = allProduits
  const total = allProduits.length
  const done = Object.values(articles).filter(a => a.valide).length
  const pct = total ? Math.round((done / total) * 100) : 0

  useEffect(() => {
    axios.get(`/api/validations/chantier/${chantier.id}`)
      .then(res => {
        setValidation(res.data)
        validationRef.current = res.data
        const map = {}
        res.data.articles.forEach(a => { map[a.produit_id] = { valide: a.valide, commentaire: a.commentaire || '' } })
        setArticles(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [chantier.id])

  // Auto-save déclenché 800ms après chaque modification
  useEffect(() => {
    if (loading || !validationRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setAutoSaveStatus('saving')
    saveTimerRef.current = setTimeout(async () => {
      try {
        const payload = allProduitsRef.current.map(p => ({
          produit_id: p.id,
          valide: articles[p.id]?.valide || false,
          commentaire: articles[p.id]?.commentaire || ''
        }))
        await axios.patch(`/api/validations/${validationRef.current.id}/articles`, { articles: payload })
        setAutoSaveStatus('saved')
        setTimeout(() => setAutoSaveStatus(''), 2000)
      } catch { setAutoSaveStatus('') }
    }, 800)
  }, [articles])

  const getArt = (pid) => articles[pid] || { valide: false, commentaire: '' }

  const toggle = (pid) => {
    setArticles(prev => ({ ...prev, [pid]: { ...getArt(pid), valide: !getArt(pid).valide } }))
  }

  const setComment = (pid, val) => {
    setArticles(prev => ({ ...prev, [pid]: { ...getArt(pid), commentaire: val } }))
  }

  const toggleSalle = (salle) => {
    const ids = (salle.produits || []).map(p => p.id)
    const allOk = ids.every(id => getArt(id).valide)
    setArticles(prev => {
      const next = { ...prev }
      ids.forEach(id => { next[id] = { ...getArt(id), valide: !allOk } })
      return next
    })
  }

  const reloadValidation = async () => {
    try {
      const res = await axios.get(`/api/validations/chantier/${chantier.id}`)
      setValidation(res.data)
      validationRef.current = res.data
    } catch {}
  }

  const downloadPDF = async () => {
    if (!validation) return
    try {
      const res = await axios.get(`/api/validations/${validation.id}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Validation_${chantier.nom.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`)
      document.body.appendChild(link); link.click(); link.remove()
    } catch { alert('Erreur génération PDF.') }
  }

  const SIG_STATUS = {
    en_cours:      { label: 'Non signé',          color: 'var(--fg-3)' },
    signe_client:  { label: 'Signé (client)',      color: '#F59E0B' },
    signe_tech:    { label: 'Signé (technicien)',  color: '#818CF8' },
    signe_complet: { label: 'Signé complet',       color: 'var(--accent)' },
  }
  const statut = SIG_STATUS[validation?.statut] || SIG_STATUS.en_cours

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 800, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--fg)', marginBottom: 4 }}>Validation client</div>
              <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>
                {chantier.client
                  ? <>👤 {chantier.client}{chantier.nom_contact ? ' — ' + chantier.nom_contact : ''}</>
                  : <span style={{ fontStyle: 'italic' }}>Client non renseigné</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {validation && (
                <span style={{ fontSize: 11, fontWeight: 700, color: statut.color, background: statut.color + '1a', padding: '3px 10px', borderRadius: 20, border: '1px solid ' + statut.color + '40' }}>
                  {statut.label}
                </span>
              )}
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
          </div>

          {/* Barre progression */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{done}/{total} équipement{total > 1 ? 's' : ''} validé{done > 1 ? 's' : ''}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: pct === 100 ? 'var(--accent)' : 'var(--fg)' }}>{pct}%</span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: pct + '%', background: pct === 100 ? 'var(--accent)' : '#F59E0B', borderRadius: 99, transition: '.4s' }} />
            </div>
          </div>

          {/* Filtre salle — menu déroulant */}
          <select value={filterSalle} onChange={e => setFilterSalle(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px', color: 'var(--fg)', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
            <option value="toutes">Toutes les salles ({done}/{total})</option>
            {sallesAvecProduits.map(s => {
              const nb = (s.produits || []).filter(p => getArt(p.id).valide).length
              return <option key={s.id} value={String(s.id)}>{s.nom}{s.etage ? ' — ' + s.etage : ''} ({nb}/{(s.produits || []).length})</option>
            })}
          </select>
        </div>

        {/* Liste */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
          {loading && <div style={{ textAlign: 'center', color: 'var(--fg-3)', padding: '40px 0', fontSize: 13 }}>Chargement...</div>}
          {!loading && total === 0 && <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '40px 0', fontSize: 13 }}>Aucun équipement dans ce chantier</div>}

          {!loading && (() => {
            const sallesFiltrees = filterSalle === 'toutes'
              ? sallesAvecProduits
              : sallesAvecProduits.filter(s => String(s.id) === filterSalle)

            return sallesFiltrees.map(salle => {
              const ids = (salle.produits || []).map(p => p.id)
              const nbOk = ids.filter(id => getArt(id).valide).length
              const allOk = ids.length > 0 && nbOk === ids.length
              return (
                <div key={salle.id} style={{ marginTop: 14 }}>
                  {/* Bandeau salle */}
                  <div onClick={() => toggleSalle(salle)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 14px', background: allOk ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (allOk ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.1)'), borderRadius: 10, marginBottom: 4, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{salle.nom}</span>
                      {salle.etage && <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{salle.etage}</span>}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: allOk ? 'var(--accent)' : 'var(--fg-3)', background: allOk ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 10 }}>{nbOk}/{ids.length}</span>
                    </div>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: '2px solid ' + (allOk ? 'var(--accent)' : 'rgba(255,255,255,0.2)'), background: allOk ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                      {allOk && <Icon d={icons.check} size={10} color="#fff" />}
                    </div>
                  </div>

                  {/* Liste articles */}
                  {(salle.produits || []).map((p, i) => {
                    const art = getArt(p.id)
                    const ok = art.valide
                    const hasCmt = commentOpen.has(p.id)
                    const nomArticle = p.reference || p.type_equipement
                    return (
                      <div key={p.id} style={{ marginBottom: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: ok ? 'rgba(16,185,129,0.06)' : i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent', borderRadius: 8, borderLeft: '3px solid ' + (ok ? 'var(--accent)' : 'transparent') }}>
                          {/* Checkbox */}
                          <div onClick={() => toggle(p.id)} style={{ width: 20, height: 20, borderRadius: 6, border: '2px solid ' + (ok ? 'var(--accent)' : 'rgba(255,255,255,0.25)'), background: ok ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all .15s' }}>
                            {ok && <Icon d={icons.check} size={11} color="#fff" />}
                          </div>

                          {/* Infos */}
                          <div onClick={() => toggle(p.id)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: ok ? 'var(--accent)' : 'var(--fg)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {nomArticle}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{p.type_equipement}</span>
                              {(p.marque || p.modele) && <span style={{ fontSize: 11, color: 'var(--fg-3)', fontStyle: 'italic' }}>{[p.marque, p.modele].filter(Boolean).join(' ')}</span>}
                              {p.serial_number && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-mute)' }}>S/N: {p.serial_number}</span>}
                            </div>
                            {art.commentaire && !hasCmt && <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 2 }}>💬 {art.commentaire}</div>}
                          </div>

                          {ok && <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>✓</span>}

                          <button onClick={() => setCommentOpen(prev => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n })}
                            title="Commentaire"
                            style={{ background: art.commentaire ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (art.commentaire ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'), color: art.commentaire ? '#F59E0B' : 'var(--fg-3)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>
                            💬
                          </button>
                        </div>

                        {hasCmt && (
                          <div style={{ padding: '5px 12px 5px 46px', background: 'rgba(245,158,11,0.03)' }}>
                            <input value={art.commentaire} onChange={e => setComment(p.id, e.target.value)}
                              placeholder="Commentaire sur cet article..." autoFocus
                              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '6px 10px', color: 'var(--fg)', fontSize: 12, outline: 'none' }} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })
          })()}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          {/* Signatures */}
          {validation && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <button onClick={() => setSigModal('client')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: validation.signature_client ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (validation.signature_client ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'), color: validation.signature_client ? 'var(--accent)' : 'var(--fg-3)' }}>
                <Icon d={icons.pen} size={12} color={validation.signature_client ? 'var(--accent)' : 'var(--fg-3)'} />
                {validation.signature_client ? `Client : ${validation.nom_signataire_client}` : 'Signer (client)'}
              </button>
              <button onClick={() => setSigModal('tech')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: validation.signature_tech ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (validation.signature_tech ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'), color: validation.signature_tech ? '#818CF8' : 'var(--fg-3)' }}>
                <Icon d={icons.pen} size={12} color={validation.signature_tech ? '#818CF8' : 'var(--fg-3)'} />
                {validation.signature_tech ? `Technicien : ${validation.nom_signataire_tech}` : 'Signer (technicien)'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setArticles(Object.fromEntries(allProduits.map(p => [p.id, { ...getArt(p.id), valide: false }])))}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--fg-3)', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontSize: 12 }}>
                Tout décocher
              </button>
              {done < total && (
                <button onClick={() => setArticles(Object.fromEntries(allProduits.map(p => [p.id, { ...getArt(p.id), valide: true }])))}
                  style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--accent)', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  Tout valider
                </button>
              )}
              {autoSaveStatus === 'saving' && <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>Sauvegarde...</span>}
              {autoSaveStatus === 'saved'  && <span style={{ fontSize: 11, color: 'var(--accent)' }}>✓ Sauvegardé</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {validation && (
                <button onClick={downloadPDF}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  <Icon d={icons.download} size={13} color="#EF4444" /> PDF
                </button>
              )}
              <button onClick={onClose}
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '7px 22px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon d={icons.check} size={13} color="#fff" /> OK
              </button>
            </div>
          </div>
        </div>
      </div>

      {sigModal && validation && (
        <ValidationSignModal
          validationId={validation.id}
          type={sigModal}
          onClose={() => setSigModal(null)}
          onSigned={async () => { setSigModal(null); await reloadValidation() }}
        />
      )}
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
  const [showMapsMenu, setShowMapsMenu] = useState(false)
  const [searchSalle, setSearchSalle] = useState('')
  const [filtreEtage, setFiltreEtage] = useState('tous')
  const [editInfo, setEditInfo] = useState(false)
  const [editInfoForm, setEditInfoForm] = useState({})
  const [uploadingChantierPhoto, setUploadingChantierPhoto] = useState(false)
  const [lightboxChantier, setLightboxChantier] = useState(false)
  const [duplicateSalle, setDuplicateSalle] = useState(null)
  const [duplicateSalleNom, setDuplicateSalleNom] = useState('')
  const [showValidation, setShowValidation] = useState(false)
  const [showNetworkPanel, setShowNetworkPanel] = useState(false)
  const [chantierNetwork, setChantierNetwork] = useState({ net_masque: '255.255.255.0', net_gateway: '', net_dns: '' })
  const [applyingNetwork, setApplyingNetwork] = useState(false)

  useEffect(() => {
    axios.get('/api/chantiers').then(res => setChantiers(res.data))
    axios.get('/api/chantiers/' + id)
      .then(res => setChantier(res.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (tab === 'bl') axios.get('/api/bons-livraison/chantier/' + id).then(res => setBls(res.data))
  }, [tab, id])

  const updateStatut = async (statut) => {
    await axios.patch('/api/chantiers/' + id, { statut })
    setChantier(prev => ({ ...prev, statut }))
  }

  const uploadChantierPhoto = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploadingChantierPhoto(true)
    try {
      const fd = new FormData(); fd.append('photo', file)
      const res = await axios.post('/api/chantiers/' + id + '/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setChantier(prev => ({ ...prev, photo_url: res.data.photo_url }))
    } catch { alert('Erreur upload photo.') }
    finally { setUploadingChantierPhoto(false); e.target.value = '' }
  }

  const deleteChantierPhoto = async () => {
    if (!confirm('Supprimer la photo d\'en-tête ?')) return
    try { await axios.delete('/api/chantiers/' + id + '/photo'); setChantier(prev => ({ ...prev, photo_url: null })) }
    catch { alert('Erreur suppression.') }
  }

  const openEditInfo = () => {
    setEditInfoForm({
      nom: chantier.nom || '',
      client: chantier.client || '',
      adresse: chantier.adresse || '',
      nom_contact: chantier.nom_contact || '',
      telephone: chantier.telephone || '',
      date_debut: chantier.date_debut?.slice(0, 10) || '',
      date_fin: chantier.date_fin?.slice(0, 10) || '',
      description: chantier.description || '',
    })
    setEditInfo(true)
  }

  const saveEditInfo = async () => {
    setSaving(true)
    try {
      const res = await axios.patch('/api/chantiers/' + id, editInfoForm)
      setChantier(prev => ({ ...prev, ...res.data }))
      setEditInfo(false)
    } catch (err) { alert('Erreur lors de la modification.') }
    finally { setSaving(false) }
  }

  const addSalle = async () => {
    if (!newSalle.nom) return
    setSaving(true)
    try {
      const res = await axios.post('/api/chantiers/' + id + '/salles', newSalle)
      setChantier(prev => ({ ...prev, salles: [...prev.salles, res.data] }))
      setNewSalle({ nom: '', etage: '', net_masque: '255.255.255.0', net_gateway: '', net_dns: '' })
      setShowAddSalle(false)
    } catch (err) { alert('Erreur lors de la création de la salle') }
    finally { setSaving(false) }
  }

  const deleteSalle = async (salleId, nom) => {
    if (!confirm('Supprimer la salle "' + nom + '" ?')) return
    try {
      await axios.delete('/api/salles/' + salleId)
      setChantier(prev => ({ ...prev, salles: prev.salles.filter(s => s.id !== salleId) }))
    } catch (err) { alert('Erreur lors de la suppression.') }
  }

  const handleDuplicateSalle = async () => {
    if (!duplicateSalleNom.trim()) return
    setSaving(true)
    try {
      const res = await axios.post('/api/salles/' + duplicateSalle.id + '/duplicate', { nom: duplicateSalleNom })
      setChantier(prev => ({ ...prev, salles: [...prev.salles, res.data] }))
      setDuplicateSalle(null)
      setDuplicateSalleNom('')
    } catch (err) { alert('Erreur lors de la duplication.') }
    finally { setSaving(false) }
  }

  const applyNetworkChantier = async () => {
    if (!confirm('Appliquer ces informations réseau à toutes les salles et à tous les équipements sur le réseau de ce chantier ?')) return
    setApplyingNetwork(true)
    try {
      const res = await axios.post('/api/chantiers/' + id + '/apply-network', chantierNetwork)
      setChantier(prev => ({
        ...prev,
        salles: prev.salles.map(s => ({
          ...s,
          net_masque: chantierNetwork.net_masque, net_gateway: chantierNetwork.net_gateway, net_dns: chantierNetwork.net_dns,
          produits: (s.produits || []).map(p => p.sur_reseau
            ? { ...p, masque: chantierNetwork.net_masque, gateway: chantierNetwork.net_gateway, dns: chantierNetwork.net_dns }
            : p)
        }))
      }))
      alert(res.data.message)
    } catch (err) { alert('Erreur lors de l\'application du réseau.') }
    finally { setApplyingNetwork(false) }
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
      document.body.appendChild(link); link.click(); link.remove()
    } catch (err) { alert('Erreur lors de l\'export') }
  }

  const exportTemplate = async () => {
    try {
      const res = await axios.get('/api/chantiers/' + id + '/export-template', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'AVTrack_export_' + (chantier?.nom || id) + '.xlsx')
      document.body.appendChild(link); link.click(); link.remove()
    } catch (err) { alert('Erreur lors de l\'export') }
  }

  const exportComplet = async () => {
    try {
      const res = await axios.get('/api/chantiers/' + id + '/export-complet', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', (chantier?.nom || id) + '_complet.zip')
      document.body.appendChild(link); link.click(); link.remove()
    } catch { alert('Erreur lors de l\'export complet.') }
  }

  const downloadPhotos = async () => {
    try {
      const res = await axios.get('/api/chantiers/' + id + '/photos-zip', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'Photos_' + (chantier?.nom || id) + '.zip')
      document.body.appendChild(link); link.click(); link.remove()
    } catch { alert('Erreur téléchargement photos.') }
  }

  const uploadBL = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingBL(true)
    try {
      const formData = new FormData()
      formData.append('fichier', file)
      const res = await axios.post('/api/bons-livraison/chantier/' + id, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
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
      document.body.appendChild(link); link.click(); link.remove()
    } catch (err) { alert('Erreur lors du téléchargement.') }
  }

  const viewBL = (bl) => {
    const token = localStorage.getItem('avtrack_token')
    setBlObjectUrl('/api/bons-livraison/' + bl.id + '/inline?token=' + token)
    setViewingBL(bl)
  }

  const deleteBL = async (bl) => {
    if (!confirm('Supprimer ce bon de livraison ?')) return
    try {
      await axios.delete('/api/bons-livraison/' + bl.id)
      setBls(prev => prev.filter(b => b.id !== bl.id))
    } catch (err) { alert('Erreur suppression BL.') }
  }

  if (loading) return <Layout chantiers={chantiers}><div style={{ textAlign: 'center', color: 'var(--fg-3)', padding: '60px 0' }}>Chargement...</div></Layout>
  if (!chantier) return null

  const done = chantier.salles ? chantier.salles.filter(s => s.statut === 'termine').length : 0
  const total = chantier.salles ? chantier.salles.length : 0
  const score = chantier.salles ? chantier.salles.reduce((acc, s) => {
    if (s.statut === 'termine') return acc + 1
    if (s.statut === 'a_terminer') return acc + 0.8
    return acc
  }, 0) : 0
  const pct = total ? Math.round((score / total) * 100) : 0
  const statusColor = STATUS[chantier.statut]?.color || 'var(--fg-3)'

  const tabStyle = (t) => ({
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '10px 16px', fontSize: 13, fontWeight: 600,
    color: tab === t ? 'var(--accent)' : 'var(--fg-3)',
    borderBottom: tab === t ? '2px solid #10B981' : '2px solid transparent',
    display: 'flex', alignItems: 'center', gap: 6,
    transition: '.2s', marginBottom: -1
  })

  const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: 'var(--fg)', fontSize: 13, outline: 'none' }
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }

  const BL_STATUT = {
    en_attente: { label: 'En attente', color: '#F59E0B' },
    signe: { label: 'Signé', color: 'var(--accent)' },
  }

  return (
    <Layout chantiers={chantiers}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 12, color: 'var(--fg-3)', flexWrap: 'wrap' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Tableau de bord</span>
          <span>›</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/chantiers')}>Chantiers</span>
          <span>›</span>
          <span style={{ color: 'var(--fg)' }}>{chantier.nom}</span>
        </div>

        {/* Hero card */}
        <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderTop: `4px solid ${statusColor}` }}>
          {chantier.photo_url ? (
            <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
              <img src={chantier.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div onClick={() => setLightboxChantier(true)} style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(24,27,36,0.1) 40%, rgba(24,27,36,0.85) 100%)', cursor: 'zoom-in' }} />
              <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', gap: 6 }}>
                <label style={{ background: 'rgba(16,185,129,0.85)', color: '#fff', borderRadius: 20, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                  {uploadingChantierPhoto ? '...' : '📷 Changer'}
                  <input type="file" accept="image/*" onChange={uploadChantierPhoto} style={{ display: 'none' }} />
                </label>
                <button onClick={deleteChantierPhoto} style={{ background: 'rgba(239,68,68,0.75)', border: 'none', color: '#fff', borderRadius: 20, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>Supprimer</button>
              </div>
            </div>
          ) : (
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderBottom: '1px dashed rgba(255,255,255,0.07)', cursor: 'pointer', color: 'var(--fg-mute)', fontSize: 12, transition: 'background .2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {uploadingChantierPhoto ? 'Upload...' : <><span>📷</span><span>Ajouter une photo d'en-tête</span></>}
              <input type="file" accept="image/*" onChange={uploadChantierPhoto} style={{ display: 'none' }} />
            </label>
          )}
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, color: 'var(--fg)' }}>{chantier.nom}</h1>
                  <Badge statut={chantier.statut} />
                  <button onClick={openEditInfo} title="Modifier les informations"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', color: 'var(--fg-3)', display: 'flex', alignItems: 'center' }}>
                    <Icon d={icons.pen} size={13} color="#7b8096" />
                  </button>
                </div>
                {chantier.client && <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 4 }}>{chantier.client}</div>}
                {(chantier.nom_contact || chantier.telephone) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    {chantier.nom_contact && <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>👤 {chantier.nom_contact}</span>}
                    {chantier.telephone && (
                      <a href={'tel:' + chantier.telephone} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                        📞 {chantier.telephone}
                      </a>
                    )}
                  </div>
                )}
                {chantier.adresse && (
                  <div style={{ position: 'relative', marginBottom: 4 }}>
                    <div onClick={() => setShowMapsMenu(v => !v)}
                      style={{ fontSize: 12, color: 'var(--fg-mute)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      📍 {chantier.adresse}
                    </div>
                    {showMapsMenu && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 30, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 8, display: 'flex', gap: 6, marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>
                        <a href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(chantier.adresse)}
                          target="_blank" rel="noopener noreferrer"
                          onClick={() => setShowMapsMenu(false)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: 'var(--fg)', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                          🗺️ Google Maps
                        </a>
                        <a href={'https://waze.com/ul?q=' + encodeURIComponent(chantier.adresse)}
                          target="_blank" rel="noopener noreferrer"
                          onClick={() => setShowMapsMenu(false)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(51,204,255,0.1)', color: '#33CCFF', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                          🚗 Waze
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {(chantier.date_debut || chantier.date_fin) && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-mute)' }}>
                    {chantier.date_debut?.slice(0, 10)} {chantier.date_debut && chantier.date_fin ? '→' : ''} {chantier.date_fin?.slice(0, 10)}
                  </div>
                )}
              </div>
              <div className="hero-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <select value={chantier.statut} onChange={e => updateStatut(e.target.value)}
                  style={{ background: statusColor + '10', border: '1px solid ' + statusColor + '40', borderRadius: 10, padding: '8px 36px 8px 12px', color: statusColor, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <button onClick={exportExcel}
                  style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}>
                  <Icon d={icons.download} size={14} color="#fff" /> Récap chantier
                </button>
                <button onClick={exportTemplate}
                  title="Export complet équipements + état, réimportable"
                  style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.3)', color: '#00D4FF', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon d={icons.download} size={14} color="#00D4FF" /> Rapport client
                </button>
                <button onClick={exportComplet}
                  title="ZIP complet : rapport client + photos + programmes par salle"
                  style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: '#A855F7', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon d={icons.download} size={14} color="#A855F7" /> Dossier complet
                </button>
                <button onClick={downloadPhotos}
                  title="Télécharger toutes les photos des salles en ZIP"
                  style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon d={icons.camera} size={14} color="#F59E0B" /> Photos ZIP
                </button>
                <button onClick={() => setShowValidation(true)}
                  title="Valider les équipements avec le client"
                  style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#818CF8', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon d={icons.clipCheck} size={14} color="#818CF8" /> Validation client
                </button>
              </div>
            </div>

            {/* Stats mini grid */}
            <div className="chantier-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              {[
                { label: 'Salles', val: total },
                { label: 'Équipements', val: chantier.salles?.reduce((a, s) => a + (s.produits?.length || 0), 0) || '—' },
                { label: 'Terminées', val: done },
              ].map(s => (
                <div key={s.label} style={{ padding: '12px 16px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, color: 'var(--fg)' }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{done}/{total} salles terminées</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: pct === 100 ? 'var(--accent)' : statusColor }}>{pct}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: pct + '%', background: statusColor, borderRadius: 99, transition: '.5s', opacity: 0.9 }} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-bar" style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap' }}>
          <button onClick={() => setTab('salles')} style={tabStyle('salles')}>
            <Icon d={icons.layers} size={14} color={tab === 'salles' ? 'var(--accent)' : 'var(--fg-3)'} /> Salles
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: tab === 'salles' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)', color: tab === 'salles' ? 'var(--accent)' : 'var(--fg-3)', borderRadius: 20, padding: '1px 7px', fontWeight: 700 }}>
              {chantier.salles?.length || 0}
            </span>
          </button>
          <button onClick={() => setTab('bl')} style={tabStyle('bl')}>
            <Icon d={icons.truck} size={14} color={tab === 'bl' ? 'var(--accent)' : 'var(--fg-3)'} /> Bons de livraison
            {bls.filter(b => b.statut === 'en_attente').length > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(245,158,11,0.2)', color: '#F59E0B', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
                {bls.filter(b => b.statut === 'en_attente').length}
              </span>
            )}
          </button>
          <button onClick={() => setTab('docs')} style={tabStyle('docs')}>
            <Icon d={icons.file} size={14} color={tab === 'docs' ? 'var(--accent)' : 'var(--fg-3)'} /> Documents
          </button>
          <button onClick={() => setTab('historique')} style={tabStyle('historique')}>
            <Icon d={icons.history} size={14} color={tab === 'historique' ? 'var(--accent)' : 'var(--fg-3)'} /> Historique
          </button>
        </div>

        {/* Salles tab */}
        {tab === 'salles' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, color: 'var(--fg-3)' }}>{chantier.salles ? chantier.salles.length : 0} salle(s)</div>
              <button onClick={() => setShowAddSalle(!showAddSalle)}
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}>
                <Icon d={icons.plus} size={14} color="#fff" /> Ajouter salle
              </button>
            </div>

            {/* Réseau chantier — applique masque/passerelle/DNS à toutes les salles + équipements */}
            <div style={{ background: 'var(--accent-soft)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              <button onClick={() => setShowNetworkPanel(!showNetworkPanel)}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', color: '#06B6D4', fontSize: 13, fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon d={icons.network} size={15} color="#06B6D4" />
                  Réseau chantier
                </div>
                <svg style={{ transform: showNetworkPanel ? 'rotate(180deg)' : 'none', transition: '.2s' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              {showNetworkPanel && (
                <div style={{ padding: '0 14px 14px' }}>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 10 }}>
                    Applique ces informations à toutes les salles de ce chantier et à tous les équipements marqués "sur le réseau".
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                    {[['net_masque','Masque','255.255.255.0'],['net_gateway','Passerelle','192.168.1.1'],['net_dns','DNS','8.8.8.8']].map(([key, label, ph]) => (
                      <div key={key}>
                        <div style={labelStyle}>{label}</div>
                        <input value={chantierNetwork[key]} onChange={e => setChantierNetwork(prev => ({ ...prev, [key]: e.target.value }))} placeholder={ph} style={inputStyle} />
                      </div>
                    ))}
                  </div>
                  <button onClick={applyNetworkChantier} disabled={applyingNetwork}
                    style={{ background: 'linear-gradient(135deg,#06B6D4,#0891B2)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 3px 10px rgba(6,182,212,0.35)' }}>
                    <Icon d={icons.wifi} size={13} color="#fff" /> {applyingNetwork ? 'Application...' : 'Appliquer à tout le chantier'}
                  </button>
                </div>
              )}
            </div>

            {showAddSalle && (
              <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20, marginBottom: 16, borderTop: '3px solid #10B981' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 14, fontSize: 15, color: 'var(--fg)' }}>Nouvelle salle</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div><label style={labelStyle}>Nom *</label><input value={newSalle.nom} onChange={e => setNewSalle({ ...newSalle, nom: e.target.value })} placeholder="Ex: Salle Conférence A" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Étage / Zone</label><input value={newSalle.etage} onChange={e => setNewSalle({ ...newSalle, etage: e.target.value })} placeholder="Ex: 2ème" style={inputStyle} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {[['net_masque','Masque','255.255.255.0'],['net_gateway','Passerelle','192.168.1.1'],['net_dns','DNS','8.8.8.8']].map(([key, label, ph]) => (
                    <div key={key}><label style={labelStyle}>{label}</label><input value={newSalle[key]} onChange={e => setNewSalle({ ...newSalle, [key]: e.target.value })} placeholder={ph} style={inputStyle} /></div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowAddSalle(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
                  <button onClick={addSalle} disabled={saving} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                    {saving ? 'Création...' : 'Créer la salle'}
                  </button>
                </div>
              </div>
            )}

            {editSalle && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--fg)' }}>Modifier la salle</div>
                    <button onClick={() => setEditSalle(null)} style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div><label style={labelStyle}>Nom *</label><input value={editSalleForm.nom || ''} onChange={e => setEditSalleForm({ ...editSalleForm, nom: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Étage / Zone</label><input value={editSalleForm.etage || ''} onChange={e => setEditSalleForm({ ...editSalleForm, etage: e.target.value })} style={inputStyle} /></div>
                    <div>
                      <label style={labelStyle}>Statut</label>
                      <select value={editSalleForm.statut || 'a_faire'} onChange={e => setEditSalleForm({ ...editSalleForm, statut: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                        {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div><label style={labelStyle}>Masque</label><input value={editSalleForm.net_masque || ''} onChange={e => setEditSalleForm({ ...editSalleForm, net_masque: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Passerelle</label><input value={editSalleForm.net_gateway || ''} onChange={e => setEditSalleForm({ ...editSalleForm, net_gateway: e.target.value })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>DNS</label><input value={editSalleForm.net_dns || ''} onChange={e => setEditSalleForm({ ...editSalleForm, net_dns: e.target.value })} style={inputStyle} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditSalle(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
                    <button onClick={saveEditSalle} disabled={saving} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                      {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(() => {
              const allSalles = chantier.salles || []
              const etages = ['tous', ...Array.from(new Set(allSalles.map(s => s.etage || '').filter(Boolean))).sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))]
              const sallesFiltrees = allSalles
                .filter(s => {
                  const matchSearch = !searchSalle || s.nom.toLowerCase().includes(searchSalle.toLowerCase()) || (s.etage || '').toLowerCase().includes(searchSalle.toLowerCase())
                  const matchEtage = filtreEtage === 'tous' || (s.etage || '') === filtreEtage
                  return matchSearch && matchEtage
                })
                .sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true, sensitivity: 'base' }))
              return (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                      <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#eef0f6" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                      <input value={searchSalle} onChange={e => setSearchSalle(e.target.value)}
                        placeholder="Rechercher une salle..."
                        style={{ ...inputStyle, paddingLeft: 30 }} />
                    </div>
                    {etages.length > 1 && etages.map(e => (
                      <button key={e} onClick={() => setFiltreEtage(e)}
                        style={{ background: filtreEtage === e ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (filtreEtage === e ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'), color: filtreEtage === e ? 'var(--accent)' : 'var(--fg-3)', borderRadius: 20, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {e === 'tous' ? 'Tous les étages' : e}
                      </button>
                    ))}
                  </div>
                  {sallesFiltrees.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '30px 0', fontSize: 13 }}>
                      Aucune salle ne correspond à la recherche
                    </div>
                  )}
            <div className="salles-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 12 }}>
              {sallesFiltrees.map(salle => {
                const sc = STATUS[salle.statut]?.color || 'var(--fg-3)'
                return (
                  <div key={salle.id}
                    onClick={() => navigate('/chantiers/' + id + '/salles/' + salle.id)}
                    style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'all .2s', borderTop: `3px solid ${sc}` }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = sc + '45'; e.currentTarget.style.background = 'var(--surface-elev)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.transform = 'none' }}>
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, marginBottom: 2, color: 'var(--fg)' }}>{salle.nom}</div>
                          <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{salle.etage}</div>
                        </div>
                        <Badge statut={salle.statut} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: salle.commentaire ? 8 : 0 }}>
                        {salle.produits ? salle.produits.length : 0} équipement(s)
                      </div>
                      {salle.commentaire && (
                        <div style={{ fontSize: 11, color: 'var(--fg-3)', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                          "{salle.commentaire}"
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, padding: '0 12px 10px', justifyContent: 'flex-end' }}
                      onClick={e => e.stopPropagation()}>
                      <button onClick={() => startEditSalle(salle)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg-3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>✏️</button>
                      <button onClick={() => { setDuplicateSalle(salle); setDuplicateSalleNom(salle.nom + ' - Copie') }} style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', color: '#818CF8', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }} title="Dupliquer">⧉</button>
                      <button onClick={() => deleteSalle(salle.id, salle.nom)} style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF4444', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>🗑️</button>
                    </div>
                  </div>
                )
              })}
            </div>
                </>
              )
            })()}
          </div>
        )}

        {/* BL tab */}
        {tab === 'bl' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: 'var(--fg-3)' }}>{bls.length} bon(s) de livraison</div>
              <label style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon d={icons.plus} size={14} color="#fff" /> {uploadingBL ? 'Upload...' : 'Ajouter un BL'}
                <input type="file" accept="application/pdf" onChange={uploadBL} style={{ display: 'none' }} />
              </label>
            </div>

            {bls.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '40px 0', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 12 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--fg-3)' }}>Aucun bon de livraison</div>
                <div style={{ fontSize: 13 }}>Ajoutez le BL PDF pour permettre la signature électronique</div>
              </div>
            )}

            {bls.map(bl => {
              const cfg = BL_STATUT[bl.statut] || BL_STATUT.en_attente
              const blBorderColor = bl.statut === 'signe' ? 'var(--accent)' : '#F59E0B'
              return (
                <div key={bl.id} style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', marginBottom: 10, borderLeft: `3px solid ${blBorderColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>📄 {bl.nom_original}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.color + '1a', fontFamily: 'var(--font-mono)' }}>
                          {cfg.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                        Uploadé le {new Date(bl.created_at).toLocaleDateString('fr-FR')}
                        {bl.uploaded_by_name && ' par ' + bl.uploaded_by_name}
                      </div>
                      {bl.statut === 'signe' && (
                        <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>
                          ✓ Signé par {bl.nom_signataire} le {new Date(bl.date_signature).toLocaleDateString('fr-FR')}
                          {bl.commentaire && ' — ' + bl.commentaire}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button onClick={() => viewBL(bl)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>👁️ Voir</button>
                      <button onClick={() => downloadBL(bl)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>
                        <Icon d={icons.download} size={12} />
                      </button>
                      {bl.statut === 'signe' && (
                        <button onClick={() => downloadBL(bl, true)} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--accent)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>
                          <Icon d={icons.download} size={12} color="#10B981" /> BL signé
                        </button>
                      )}
                      {bl.statut === 'en_attente' && (
                        <button onClick={() => setSigningBL(bl)} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icon d={icons.pen} size={12} color="#fff" /> Signer
                        </button>
                      )}
                      <button onClick={() => deleteBL(bl)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>
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

        {/* Historique tab */}
        {tab === 'historique' && (
          <div>
            {chantier.historique && chantier.historique.map((h, i) => (
              <div key={h.id} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon d={icons.history} size={13} color="#10B981" />
                  </div>
                  {i < chantier.historique.length - 1 && <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.06)', marginTop: 4 }} />}
                </div>
                <div style={{ paddingTop: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2, color: 'var(--fg)' }}>{h.action}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>{h.user_nom} · {new Date(h.created_at).toLocaleString('fr-FR')}</div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {editInfo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--fg)' }}>Modifier le chantier</div>
              <button onClick={() => setEditInfo(false)} style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={labelStyle}>Nom du chantier *</label><input value={editInfoForm.nom} onChange={e => setEditInfoForm(f => ({ ...f, nom: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Client</label><input value={editInfoForm.client} onChange={e => setEditInfoForm(f => ({ ...f, client: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Adresse</label><input value={editInfoForm.adresse} onChange={e => setEditInfoForm(f => ({ ...f, adresse: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Nom du contact</label><input value={editInfoForm.nom_contact} onChange={e => setEditInfoForm(f => ({ ...f, nom_contact: e.target.value }))} placeholder="Ex: Jean Dupont" style={inputStyle} /></div>
              <div><label style={labelStyle}>Téléphone contact</label><input value={editInfoForm.telephone} onChange={e => setEditInfoForm(f => ({ ...f, telephone: e.target.value }))} placeholder="Ex: 06 12 34 56 78" style={inputStyle} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={labelStyle}>Date début</label><input type="date" value={editInfoForm.date_debut} onChange={e => setEditInfoForm(f => ({ ...f, date_debut: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Date fin</label><input type="date" value={editInfoForm.date_fin} onChange={e => setEditInfoForm(f => ({ ...f, date_fin: e.target.value }))} style={inputStyle} /></div>
              </div>
              <div><label style={labelStyle}>Description</label><textarea value={editInfoForm.description} onChange={e => setEditInfoForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setEditInfo(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
              <button onClick={saveEditInfo} disabled={saving} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {signingBL && (
        <BLSignatureModal
          bl={signingBL}
          onClose={() => setSigningBL(null)}
          onSigned={(data) => {
            setBls(prev => prev.map(b => b.id === signingBL.id ? { ...b, statut: 'signe', nom_signataire: data.nom_signataire, date_signature: data.date_signature, commentaire: data.commentaire, chemin_signe: data.chemin_signe } : b))
            setSigningBL(null)
          }}
        />
      )}

      {lightboxChantier && chantier.photo_url && (
        <div onClick={() => setLightboxChantier(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => setLightboxChantier(false)}
            style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: '50%', width: 42, height: 42, cursor: 'pointer', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          <img src={chantier.photo_url} alt="" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }} />
        </div>
      )}

      {viewingBL && blObjectUrl && (
        <PDFViewer
          url={blObjectUrl}
          title={viewingBL.nom_original}
          canSign={viewingBL.statut === 'en_attente'}
          onSign={() => { const bl = viewingBL; setViewingBL(null); setBlObjectUrl(null); setTimeout(() => setSigningBL(bl), 50) }}
          onClose={() => { setViewingBL(null); setBlObjectUrl(null) }}
        />
      )}

      {showValidation && (
        <ValidationModal chantier={chantier} onClose={() => setShowValidation(false)} />
      )}

      {duplicateSalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--fg)' }}>Dupliquer la salle</div>
              <button onClick={() => setDuplicateSalle(null)} style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ color: 'var(--fg-3)', fontSize: 13, marginBottom: 16 }}>Copie de "{duplicateSalle.nom}" avec tous ses équipements.</div>
            <label style={labelStyle}>Nom de la nouvelle salle</label>
            <input
              value={duplicateSalleNom}
              onChange={e => setDuplicateSalleNom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDuplicateSalle()}
              autoFocus
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setDuplicateSalle(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
              <button onClick={handleDuplicateSalle} disabled={saving || !duplicateSalleNom.trim()} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                {saving ? 'Duplication...' : 'Dupliquer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  )
}
