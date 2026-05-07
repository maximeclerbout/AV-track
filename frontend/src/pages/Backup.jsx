import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const icons = {
  save:     "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  upload:   "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  trash:    "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  refresh:  "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  check:    "M20 6L9 17l-5-5",
  alert:    "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  database: "M12 3C7 3 3 5.24 3 8s4 5 9 5 9-2.24 9-5-4-5-9-5zM3 8v4c0 2.76 4 5 9 5s9-2.24 9-5V8M3 12v4c0 2.76 4 5 9 5s9-2.24 9-5v-4",
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko'
  return (bytes / (1024 * 1024)).toFixed(2) + ' Mo'
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function Backup() {
  const { user } = useAuth()
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [msg, setMsg] = useState(null)
  const [chantiers, setChantiers] = useState([])
  const fileRef = useRef()

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    fetchBackups()
    axios.get('/api/chantiers').then(r => setChantiers(r.data)).catch(() => {})
  }, [])

  async function fetchBackups() {
    setLoading(true)
    try {
      const r = await axios.get('/api/backup/list')
      setBackups(r.data)
    } catch {
      setMsg({ type: 'error', text: 'Impossible de charger les sauvegardes.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    setCreating(true)
    setMsg(null)
    try {
      const r = await axios.post('/api/backup/create')
      setMsg({ type: 'success', text: `Sauvegarde créée : ${r.data.filename}` })
      await fetchBackups()
    } catch {
      setMsg({ type: 'error', text: 'Erreur lors de la création.' })
    } finally {
      setCreating(false)
    }
  }

  async function handleDownload(filename) {
    const token = localStorage.getItem('avtrack_token')
    try {
      const res = await fetch(`/api/backup/download/${filename}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setMsg({ type: 'error', text: 'Erreur lors du téléchargement.' })
    }
  }

  async function handleDelete(filename) {
    if (!window.confirm(`Supprimer la sauvegarde "${filename}" ?`)) return
    try {
      await axios.delete(`/api/backup/${filename}`)
      setMsg({ type: 'success', text: 'Sauvegarde supprimée.' })
      await fetchBackups()
    } catch {
      setMsg({ type: 'error', text: 'Erreur lors de la suppression.' })
    }
  }

  async function handleRestore(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!window.confirm(`Importer "${file.name}" ?\n\nLes chantiers de cette sauvegarde seront ajoutés à la base existante.`)) {
      fileRef.current.value = ''
      return
    }
    setRestoring(true)
    setMsg(null)
    try {
      const form = new FormData()
      form.append('backup', file)
      const r = await axios.post('/api/backup/restore', form)
      setMsg({ type: 'success', text: r.data.message })
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Erreur lors de la restauration.' })
    } finally {
      setRestoring(false)
      fileRef.current.value = ''
    }
  }

  const card = {
    background: '#181b24',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: '20px 24px',
    marginBottom: 20,
  }

  const btn = (color = '#10B981') => ({
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '9px 18px', borderRadius: 10, border: 'none',
    background: color + '1a', color, cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
    border: `1px solid ${color}30`,
    transition: 'all .2s',
  })

  return (
    <Layout chantiers={chantiers}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#eef0f6', fontFamily: "'Outfit', sans-serif" }}>
              Sauvegardes
            </div>
            <div style={{ fontSize: 13, color: '#7b8096', marginTop: 3 }}>
              Sauvegarde automatique chaque jour à 2h — conservez et restaurez vos données
            </div>
          </div>
          <button style={btn()} onClick={handleCreate} disabled={creating}>
            <Icon d={icons.save} size={15} color="#10B981" />
            {creating ? 'En cours…' : 'Créer une sauvegarde'}
          </button>
        </div>

        {/* Message */}
        {msg && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px', borderRadius: 10, marginBottom: 20,
            background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${msg.type === 'success' ? '#10B98140' : '#EF444440'}`,
            color: msg.type === 'success' ? '#10B981' : '#EF4444',
            fontSize: 13, fontWeight: 500,
          }}>
            <Icon d={msg.type === 'success' ? icons.check : icons.alert} size={15} color={msg.type === 'success' ? '#10B981' : '#EF4444'} />
            {msg.text}
          </div>
        )}

        {/* Liste des sauvegardes */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#eef0f6' }}>
              <Icon d={icons.database} size={15} color="#10B981" style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Sauvegardes disponibles
            </div>
            <button onClick={fetchBackups} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7b8096', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
              <Icon d={icons.refresh} size={13} /> Actualiser
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#7b8096', fontSize: 13 }}>Chargement…</div>
          ) : backups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#7b8096', fontSize: 13 }}>
              Aucune sauvegarde disponible.<br />
              <span style={{ fontSize: 12 }}>La première sauvegarde automatique sera créée cette nuit à 2h.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {backups.map(b => (
                <div key={b.filename} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 10,
                  background: '#13151c', border: '1px solid rgba(255,255,255,0.05)',
                  flexWrap: 'wrap',
                }}>
                  <div style={{
                    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: .5,
                    background: b.auto ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.12)',
                    color: b.auto ? '#6366F1' : '#10B981',
                    border: `1px solid ${b.auto ? '#6366F140' : '#10B98140'}`,
                    flexShrink: 0,
                  }}>
                    {b.auto ? 'Auto' : 'Manuel'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#eef0f6', fontFamily: "'Cousine', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.filename}
                    </div>
                    <div style={{ fontSize: 11, color: '#7b8096', marginTop: 2 }}>
                      {formatDate(b.mtime)} — {formatSize(b.size)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button style={btn('#00D4FF')} onClick={() => handleDownload(b.filename)}>
                      <Icon d={icons.download} size={13} color="#00D4FF" />
                      Télécharger
                    </button>
                    {isAdmin && (
                      <button style={btn('#EF4444')} onClick={() => handleDelete(b.filename)}>
                        <Icon d={icons.trash} size={13} color="#EF4444" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Restaurer / Injecter */}
        {isAdmin && (
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#eef0f6', marginBottom: 6 }}>
              Injecter une sauvegarde
            </div>
            <div style={{ fontSize: 12, color: '#7b8096', marginBottom: 16 }}>
              Sélectionnez un fichier <code style={{ color: '#10B981' }}>.json</code> AVTrack Pro.
              Les chantiers seront ajoutés à la base existante (aucune donnée supprimée).
            </div>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(245,158,11,0.1)', color: '#F59E0B',
              border: '1px solid rgba(245,158,11,0.3)',
              fontSize: 13, fontWeight: 600,
              opacity: restoring ? .6 : 1,
              pointerEvents: restoring ? 'none' : 'auto',
            }}>
              <Icon d={icons.upload} size={15} color="#F59E0B" />
              {restoring ? 'Import en cours…' : 'Choisir un fichier .json'}
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleRestore}
                disabled={restoring}
              />
            </label>
          </div>
        )}

      </div>
    </Layout>
  )
}
