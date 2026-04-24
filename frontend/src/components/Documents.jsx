import { useState, useRef } from 'react'
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
  xmark: "M18 6L6 18M6 6l12 12",
  plus: "M12 5v14M5 12h14",
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

const formatSize = (bytes) => {
  if (!bytes) return ''
  if (bytes > 1048576) return (bytes / 1048576).toFixed(1) + ' Mo'
  return Math.round(bytes / 1024) + ' Ko'
}

export default function Documents({ chantierId, salleId = null, documents = [], onDocumentsChange }) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
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
      alert('Erreur lors du telechargement.')
    }
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
    </div>
  )
}
