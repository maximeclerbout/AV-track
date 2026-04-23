import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

export default function ImportExcel({ onClose }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [nomChantier, setNomChantier] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = (f) => {
    if (!f) return
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      setError('Seuls les fichiers Excel (.xlsx, .xls) sont acceptés.')
      return
    }
    setFile(f)
    setError('')
    // Proposer le nom du fichier comme nom de chantier
    const name = f.name.replace(/\.(xlsx|xls)$/i, '').replace(/_/g, ' ')
    setNomChantier(name)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('fichier', file)
      if (nomChantier) formData.append('nom_chantier', nomChantier)

      const res = await axios.post('/api/import/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'import.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 500 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 2 }}>
              Import depuis Excel
            </div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              Créer un chantier automatiquement depuis votre fichier
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 4 }}>
            <Icon d="M18 6L6 18M6 6l12 12" size={20} />
          </button>
        </div>

        {result ? (
          <div>
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: '#10B981', marginBottom: 12 }}>
                Import réussi !
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
                <div style={{ background: 'rgba(0,212,255,0.08)', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#00D4FF', fontFamily: "'Syne',sans-serif" }}>
                    {result.nb_salles}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>Salle(s) créée(s)</div>
                </div>
                <div style={{ background: 'rgba(139,92,246,0.08)', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#8B5CF6', fontFamily: "'Syne',sans-serif" }}>
                    {result.nb_produits}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>Équipement(s) importé(s)</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Fermer
              </button>
              <button onClick={() => { navigate('/chantiers/' + result.chantier_id); onClose() }}
                style={{ flex: 2, background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                Voir le chantier →
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              style={{ border: '2px dashed ' + (dragOver ? '#00D4FF' : file ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'), borderRadius: 14, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s', marginBottom: 16, background: dragOver ? 'rgba(0,212,255,0.05)' : file ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)' }}>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                accept=".xlsx,.xls" onChange={e => handleFile(e.target.files[0])} />
              <div style={{ fontSize: 32, marginBottom: 8 }}>
                {file ? '✅' : '📊'}
              </div>
              {file ? (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#10B981', marginBottom: 4 }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    {(file.size / 1024).toFixed(0)} Ko — Cliquer pour changer
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EAF0', marginBottom: 4 }}>
                    Glisser-déposer ou cliquer
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    Fichiers Excel .xlsx ou .xls
                  </div>
                </div>
              )}
            </div>

            {file && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6 }}>
                  Nom du chantier
                </div>
                <input value={nomChantier} onChange={e => setNomChantier(e.target.value)}
                  placeholder="Nom du chantier à créer"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EAF0', fontSize: 13, outline: 'none' }} />
              </div>
            )}

            <div style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
              <strong style={{ color: '#00D4FF' }}>Format attendu :</strong> Colonnes Site, Salle, Nom Equipement, Etat, Marque, Modèle, S/N, Réseau, IP, Masque, Passerelle, DNS, MDP
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#EF4444' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Annuler
              </button>
              <button onClick={handleImport} disabled={!file || loading}
                style={{ flex: 2, background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', cursor: file && !loading ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700, opacity: file && !loading ? 1 : 0.5 }}>
                {loading ? 'Import en cours...' : 'Importer le chantier'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
