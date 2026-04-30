import ImportExcel from '../components/ImportExcel'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../components/Layout'

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

export default function Chantiers() {
  const [chantiers, setChantiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showImportMenu, setShowImportMenu] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [form, setForm] = useState({ nom: '', client: '', adresse: '', telephone: '', nom_contact: '', date_debut: '', date_fin: '', description: '' })
  const [editChantier, setEditChantier] = useState(null)
  const [editForm, setEditForm] = useState({})
  const navigate = useNavigate()
  const importMenuRef = useRef(null)

  useEffect(() => {
    axios.get('/api/chantiers')
      .then(res => setChantiers(res.data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (importMenuRef.current && !importMenuRef.current.contains(e.target)) {
        setShowImportMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const createChantier = async () => {
    if (!form.nom) return
    setSaving(true)
    try {
      const res = await axios.post('/api/chantiers', form)
      navigate('/chantiers/' + res.data.id)
    } catch (err) {
      alert('Erreur lors de la création')
    } finally {
      setSaving(false)
    }
  }

  const deleteChantier = async (id, nom) => {
    if (!confirm('Supprimer le chantier "' + nom + '" ? Cette action est irréversible et supprimera toutes les salles et équipements associés.')) return
    try {
      await axios.delete('/api/chantiers/' + id)
      setChantiers(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      alert('Erreur lors de la suppression.')
    }
  }

  const startEdit = (c) => {
    setEditChantier(c)
    setEditForm({
      nom: c.nom, client: c.client || '', adresse: c.adresse || '',
      telephone: c.telephone || '', nom_contact: c.nom_contact || '',
      date_debut: c.date_debut?.slice(0, 10) || '', date_fin: c.date_fin?.slice(0, 10) || '',
      description: c.description || '', statut: c.statut
    })
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const res = await axios.patch('/api/chantiers/' + editChantier.id, editForm)
      setChantiers(prev => prev.map(c => c.id === editChantier.id ? { ...c, ...res.data } : c))
      setEditChantier(null)
    } catch (err) {
      alert('Erreur lors de la modification.')
    } finally {
      setSaving(false)
    }
  }

  const ordre = { en_cours: 0, probleme: 1, a_terminer: 2, a_faire: 3, termine: 4 }

  const chantiersFiltres = chantiers
    .filter(c => {
      const matchSearch = !search ||
        c.nom.toLowerCase().includes(search.toLowerCase()) ||
        (c.client || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.adresse || '').toLowerCase().includes(search.toLowerCase())
      const matchStatut = filterStatut === 'tous' || c.statut === filterStatut
      return matchSearch && matchStatut
    })
    .sort((a, b) => (ordre[a.statut] ?? 9) - (ordre[b.statut] ?? 9))

  return (
    <Layout chantiers={chantiers}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 900, marginBottom: 4, color: '#eef0f6' }}>Chantiers</h1>
            <p style={{ color: '#7b8096', fontSize: 14 }}>
              {loading ? '…' : chantiers.length} chantier{chantiers.length !== 1 ? 's' : ''} au total
            </p>
          </div>
          <div className="header-btns" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Import dropdown */}
            <div ref={importMenuRef} style={{ position: 'relative' }}>
              <button onClick={() => setShowImportMenu(v => !v)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#eef0f6', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" size={14} /> Importer ▾
              </button>
              {showImportMenu && (
                <div className="import-dropdown" style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#1d2030', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', padding: 6, zIndex: 20, minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                  <div onClick={() => { setShowImportMenu(false); setShowImport(true) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#10B981' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5" size={14} color="#10B981" />
                    Import Excel
                  </div>
                  <div onClick={() => { setShowImportMenu(false); navigate('/import-pdf') }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#F59E0B' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" size={14} color="#F59E0B" />
                    Import BDC PDF
                  </div>
                  <div onClick={() => { setShowImportMenu(false); navigate('/import-xml') }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#A855F7' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <Icon d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 1 2-2V9M9 21H5a2 2 0 0 0-2-2V9m0 0h18" size={14} color="#A855F7" />
                    Import Synoptique XML
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setShowAdd(true)}
              style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 18px rgba(16,185,129,0.40)' }}>
              <Icon d="M12 5v14M5 12h14" size={14} color="#fff" /> Nouveau chantier
            </button>
          </div>
        </div>

        {/* Search + filter chips */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eef0f6" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un chantier (nom, client, adresse)..."
              style={{ ...inputStyle, paddingLeft: 34 }}
            />
          </div>
          <div className="filter-row" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[{ key: 'tous', label: 'Tous' }, ...Object.entries(STATUS).map(([k, v]) => ({ key: k, label: v.label, color: v.color }))].map(f => {
              const isActive = filterStatut === f.key
              const col = f.color || '#7b8096'
              return (
                <button key={f.key} onClick={() => setFilterStatut(f.key)}
                  style={{
                    background: isActive ? col + '18' : 'rgba(255,255,255,0.04)',
                    border: '1px solid ' + (isActive ? col + '60' : 'rgba(255,255,255,0.1)'),
                    color: isActive ? col : '#7b8096',
                    borderRadius: 20, padding: '5px 14px', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, transition: 'all .15s'
                  }}>
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Inline add form */}
        {showAdd && (
          <div style={{ background: '#181b24', borderRadius: 16, padding: 24, marginBottom: 24, borderTop: '3px solid #10B981', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 800, marginBottom: 20, color: '#eef0f6' }}>Nouveau chantier</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Nom du chantier *</label>
                <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                  placeholder="Ex: Siège Social Entreprise X" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Client</label>
                <input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })}
                  placeholder="Nom du client" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Adresse</label>
                <input value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })}
                  placeholder="Adresse du site" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nom du contact</label>
                <input value={form.nom_contact} onChange={e => setForm({ ...form, nom_contact: e.target.value })}
                  placeholder="Ex: Jean Dupont" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Téléphone contact</label>
                <input value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })}
                  placeholder="Ex: 06 12 34 56 78" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Date début</label>
                <input type="date" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })}
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Date fin</label>
                <input type="date" value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })}
                  style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3} placeholder="Description du chantier..."
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAdd(false)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#eef0f6', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>
                Annuler
              </button>
              <button onClick={createChantier} disabled={saving}
                style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13, boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}>
                {saving ? 'Création...' : 'Créer le chantier'}
              </button>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editChantier && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#181b24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 800, color: '#eef0f6' }}>Modifier le chantier</div>
                <button onClick={() => setEditChantier(null)} style={{ background: 'none', border: 'none', color: '#eef0f6', cursor: 'pointer', fontSize: 20 }}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Nom du chantier *</label>
                  <input value={editForm.nom || ''} onChange={e => setEditForm({ ...editForm, nom: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Client</label>
                  <input value={editForm.client || ''} onChange={e => setEditForm({ ...editForm, client: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Adresse</label>
                  <input value={editForm.adresse || ''} onChange={e => setEditForm({ ...editForm, adresse: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Nom du contact</label>
                  <input value={editForm.nom_contact || ''} onChange={e => setEditForm({ ...editForm, nom_contact: e.target.value })} placeholder="Ex: Jean Dupont" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Téléphone contact</label>
                  <input value={editForm.telephone || ''} onChange={e => setEditForm({ ...editForm, telephone: e.target.value })} placeholder="Ex: 06 12 34 56 78" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Date début</label>
                  <input type="date" value={editForm.date_debut || ''} onChange={e => setEditForm({ ...editForm, date_debut: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Date fin</label>
                  <input type="date" value={editForm.date_fin || ''} onChange={e => setEditForm({ ...editForm, date_fin: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Statut</label>
                  <select value={editForm.statut || 'a_faire'} onChange={e => setEditForm({ ...editForm, statut: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Description</label>
                  <textarea value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditChantier(null)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#eef0f6', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>
                  Annuler
                </button>
                <button onClick={saveEdit} disabled={saving}
                  style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cards list */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#7b8096', padding: '40px 0' }}>Chargement...</div>
        ) : chantiersFiltres.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#3d4155', padding: '40px 0', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 12 }}>
            {search || filterStatut !== 'tous' ? 'Aucun chantier ne correspond à la recherche' : 'Aucun chantier'}
          </div>
        ) : (
          <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
            {chantiersFiltres.map(c => {
              const done = parseInt(c.nb_salles_terminees || 0)
              const total = parseInt(c.nb_salles || 0)
              const pct = total ? Math.round((done / total) * 100) : 0
              const statusColor = STATUS[c.statut]?.color || '#7b8096'
              return (
                <div key={c.id}
                  style={{ background: '#181b24', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'all .2s', borderTop: `3px solid ${statusColor}` }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = statusColor + '45'; e.currentTarget.style.background = '#1d2030'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = '#181b24'; e.currentTarget.style.transform = 'none' }}>

                  <div style={{ padding: '16px 18px 14px' }} onClick={() => navigate('/chantiers/' + c.id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 15, marginBottom: 2, color: '#eef0f6' }}>{c.nom}</div>
                        <div style={{ fontSize: 12, color: '#7b8096' }}>{c.client}</div>
                      </div>
                      <Badge statut={c.statut} />
                    </div>

                    {c.adresse && (
                      <div style={{ fontSize: 12, color: '#3d4155', marginBottom: 10 }}>📍 {c.adresse}</div>
                    )}

                    {(c.date_debut || c.date_fin) && (
                      <div style={{ fontFamily: "'Cousine', monospace", fontSize: 11, color: '#3d4155', marginBottom: 10 }}>
                        {c.date_debut?.slice(0, 10)} {c.date_debut && c.date_fin ? '→' : ''} {c.date_fin?.slice(0, 10)}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                      {[
                        { label: 'Salles', val: c.nb_salles || 0 },
                        { label: 'Équip.', val: c.nb_produits || 0 },
                        { label: 'Avancement', val: pct + '%' },
                      ].map(s => (
                        <div key={s.label} style={{ padding: '8px 10px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ fontFamily: "'Cousine', monospace", fontSize: 13, fontWeight: 700, color: '#eef0f6' }}>{s.val}</div>
                          <div style={{ fontSize: 10, color: '#7b8096', marginTop: 2 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
                      <div style={{ height: '100%', width: pct + '%', background: `linear-gradient(90deg,${statusColor},${statusColor}bb)`, borderRadius: 99 }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, padding: '0 18px 14px' }}
                    onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate('/chantiers/' + c.id)}
                      style={{ flex: 1, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      Ouvrir
                    </button>
                    <button onClick={() => startEdit(c)}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#eef0f6', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12 }}>
                      ✏️
                    </button>
                    <button onClick={() => deleteChantier(c.id, c.nom)}
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12 }}>
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {showImport && <ImportExcel onClose={() => setShowImport(false)} />}
    </Layout>
  )
}
