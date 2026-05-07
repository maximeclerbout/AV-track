import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const icons = {
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  pdf: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6M9 9h1",
  image: "M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21",
  excel: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h2m4 0h2M8 17h2m4 0h2",
  word: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 12m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
}

const FILE_ICONS = {
  'application/pdf': { icon: icons.pdf, color: '#EF4444' },
  'image/jpeg':      { icon: icons.image, color: '#8B5CF6' },
  'image/png':       { icon: icons.image, color: '#8B5CF6' },
  'image/gif':       { icon: icons.image, color: '#8B5CF6' },
  'image/webp':      { icon: icons.image, color: '#8B5CF6' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: icons.excel, color: '#10B981' },
  'application/vnd.ms-excel': { icon: icons.excel, color: '#10B981' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: icons.word, color: '#3B82F6' },
  'application/msword': { icon: icons.word, color: '#3B82F6' },
}

const getFileIcon = (mimeType) => FILE_ICONS[mimeType] || { icon: icons.file, color: '#6B7280' }

const isViewable = (mimeType) =>
  mimeType === 'application/pdf' || (mimeType || '').startsWith('image/')

const formatSize = (bytes) => {
  if (!bytes) return ''
  if (bytes > 1048576) return (bytes / 1048576).toFixed(1) + ' Mo'
  return Math.round(bytes / 1024) + ' Ko'
}

function DocViewer({ doc, url, onDownload, onClose }) {
  const [pageImages, setPageImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isPdfDoc = doc.mime_type === 'application/pdf'
  const isImageDoc = (doc.mime_type || '').startsWith('image/')

  useEffect(() => {
    if (!isPdfDoc) { setLoading(false); return }
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
          canvas.width = vp.width; canvas.height = vp.height
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
  }, [url, isPdfDoc])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#0d0f14', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#181b24', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#eef0f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
          📄 {doc.nom_original}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onDownload}
            style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00D4FF', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <Icon d={icons.download} size={13} color="#00D4FF" /> Télécharger
          </button>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#eef0f6', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
            ✕ Fermer
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: isImageDoc ? 20 : '12px 8px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: isImageDoc ? 'center' : 'flex-start', background: '#1a1d27' }}>
        {isImageDoc && (
          <img src={url} alt={doc.nom_original}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
        )}
        {isPdfDoc && loading && (
          <div style={{ color: '#7b8096', fontSize: 14, paddingTop: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            Chargement du PDF...
          </div>
        )}
        {isPdfDoc && error && (
          <div style={{ color: '#EF4444', fontSize: 14, paddingTop: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>❌</div>
            {error}
          </div>
        )}
        {isPdfDoc && pageImages.map((src, i) => (
          <img key={i} src={src} alt={`Page ${i + 1}`}
            style={{ maxWidth: '100%', borderRadius: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.6)' }} />
        ))}
      </div>
    </div>
  )
}

export default function Documents({ chantierId, salleId = null, documents = [], onDocumentsChange }) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [viewingDoc, setViewingDoc] = useState(null)
  const [viewObjectUrl, setViewObjectUrl] = useState(null)
  const fileInputRef = useRef(null)

  const uploadFile = async (file) => {
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('fichier', file)
      formData.append('chantier_id', chantierId)
      formData.append('nom_original', file.name)
      if (salleId) formData.append('salle_id', salleId)

      const res = await axios.post('/api/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      onDocumentsChange([...documents, res.data])
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'upload.')
    } finally {
      setUploading(false)
    }
  }

  const handleFiles = (files) => {
    Array.from(files).forEach(file => uploadFile(file))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const isImage = (mimeType) => (mimeType || '').startsWith('image/')
  const isPdf = (mimeType) => mimeType === 'application/pdf'

  const downloadDoc = async (doc) => {
    try {
      const res = await axios.get('/api/documents/' + doc.id, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', doc.nom_original)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Erreur lors du téléchargement.')
    }
  }

  const viewDoc = (doc) => {
    const token = localStorage.getItem('avtrack_token')
    setViewObjectUrl('/api/documents/' + doc.id + '/inline?token=' + token)
    setViewingDoc(doc)
  }

  const closeViewer = () => {
    setViewingDoc(null)
    setViewObjectUrl(null)
  }

  const deleteDoc = async (docId) => {
    if (!confirm('Supprimer ce document ?')) return
    try {
      await axios.delete('/api/documents/' + docId)
      onDocumentsChange(documents.filter(d => d.id !== docId))
    } catch (err) {
      alert('Erreur lors de la suppression.')
    }
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed ' + (dragOver ? '#00D4FF' : 'rgba(255,255,255,0.1)'),
          borderRadius: 12, padding: '28px 20px', textAlign: 'center',
          cursor: 'pointer', transition: 'all .2s', marginBottom: 16,
          background: dragOver ? 'rgba(0,212,255,0.05)' : 'rgba(255,255,255,0.02)'
        }}>
        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.xlsx,.xls,.docx,.doc,.zip,.txt,.csv" />
        <div style={{ fontSize: 28, marginBottom: 8 }}>
          {uploading ? '⏳' : '📎'}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EAF0', marginBottom: 4 }}>
          {uploading ? 'Upload en cours...' : 'Glisser-deposer ou cliquer pour joindre'}
        </div>
        <div style={{ fontSize: 12, color: '#6B7280' }}>
          PDF, Word, Excel, Images — Max 50 Mo
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#EF4444' }}>
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#4B5563', fontSize: 13, padding: '20px 0' }}>
          Aucun document joint
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {documents.map(doc => {
            const { icon, color } = getFileIcon(doc.mime_type)
            return (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon d={icon} size={16} color={color} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.nom_original}
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>
                      {formatSize(doc.taille_bytes)} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                      {doc.uploaded_by_nom && ' · ' + doc.uploaded_by_nom}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {isViewable(doc.mime_type) && (
                    <button onClick={() => viewDoc(doc)}
                      style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: '#8B5CF6', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      <Icon d={icons.eye} size={13} color="#8B5CF6" />
                    </button>
                  )}
                  <button onClick={() => downloadDoc(doc)}
                    style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00D4FF', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <Icon d={icons.download} size={13} color="#00D4FF" />
                  </button>
                  <button onClick={() => deleteDoc(doc.id)}
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <Icon d={icons.trash} size={13} color="#EF4444" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewingDoc && viewObjectUrl && (
        <DocViewer
          doc={viewingDoc}
          url={viewObjectUrl}
          onDownload={() => downloadDoc(viewingDoc)}
          onClose={closeViewer}
        />
      )}
    </div>
  )
}
