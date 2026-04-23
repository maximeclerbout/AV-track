import ImportExcel from '../components/ImportExcel'
import { useState, useEffect } from 'react'
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
  a_faire:    { label: 'A faire',    color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
  en_cours:   { label: 'En cours',   color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  a_terminer: { label: 'A terminer', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  probleme:   { label: 'Probleme',   color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  termine:    { label: 'Termine',    color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
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

const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EAF0', fontSize: 13, outline: 'none' }
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6, display: 'block' }

export default function Chantiers() {
  const [chantiers, setChantiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ nom: '', client: '', adresse: '', date_debut: '', date_fin: '', description: '' })
  const [editChantier, setEditChantier] = useState(null)
  const [editForm, setEditForm] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    axios.get('/api/chantiers')
      .then(res => setChantiers(res.data))
      .finally(() => setLoading(false))
  }, [])

  const createChantier = async () => {
    if (!form.nom) return
    setSaving(true)
    try {
      const res = await axios.post('/api/chantiers', form)
      navigate('/chantiers/' + res.data.id)
    } catch (err) {
      alert('Erreur lors de la creation')
    } finally {
      setSaving(false)
    }
  }

  const deleteChantier = async (id, nom) => {
    if (!confirm('Supprimer le chantier "' + nom + '" ? Cette action est irreversible et supprimera toutes les salles et equipements associes.')) return
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
      nom: c.nom,
      client: c.client || '',
      adresse: c.adresse || '',
      date_debut: c.date_debut?.slice(0,10) || '',
      date_fin: c.date_fin?.slice(0,10) || '',
      description: c.description || '',
      statut: c.statut
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
    .filter(c =>
      !search ||
      c.nom.toLowerCase().includes(search.toLowerCase()) ||
      (c.client || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.adresse || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => (ordre[a.statut] ?? 9) - (ordre[b.statut] ?? 9))

  return (
    <Layout chantiers={chantiers}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Chantiers</h1>
            <p style={{ color: '#6B7280', fontSize: 14 }}>Tous vos deployements AV</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setShowImport(true)}
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5" size={14} color="#10B981" /> Import Excel
            </button>
           <button onClick={() => navigate('/import-pdf')}
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              📄 Import BDC PDF
            </button>
            <button onClick={() => setShowAdd(true)}
              style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon d="M12 5v14M5 12h14" size={14} color="#fff" /> Nouveau chantier
            </button>
	  <button onClick={() => navigate('/import-xml')}
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#8B5CF6', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              🔌 Import Synoptique
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un chantier (nom, client, adresse)..."
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 16px', color: '#E8EAF0', fontSize: 13, outline: 'none' }}
          />
        </div>

        {showAdd && (
          <div style={{ background: '#13151E', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Nouveau chantier</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Nom du chantier *</label>
                <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                  placeholder="Ex: Siege Social Entreprise X" style={inputStyle} />
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
                <label style={labelStyle}>Date debut</label>
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
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>
                Annuler
              </button>
              <button onClick={createChantier} disabled={saving}
                style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                {saving ? 'Creation...' : 'Creer le chantier'}
              </button>
            </div>
          </div>
        )}

        {editChantier && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800 }}>Modifier le chantier</div>
                <button onClick={() => setEditChantier(null)} style={{ background: 'none', border: 'none', color: '#E8EAF0', cursor: 'pointer', fontSize: 20 }}>✕</button>
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
                  <label style={labelStyle}>Date debut</label>
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
                    <option value="a_faire">A faire</option>
                    <option value="en_cours">En cours</option>
                    <option value="a_terminer">A terminer</option>
                    <option value="probleme">Probleme</option>
                    <option value="termine">Termine</option>
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
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>
                  Annuler
                </button>
                <button onClick={saveEdit} disabled={saving}
                  style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: '#6B7280', padding: '40px 0' }}>Chargement...</div>
        ) : chantiersFiltres.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#4B5563', padding: '40px 0', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 12 }}>
            {search ? 'Aucun chantier ne correspond a la recherche' : 'Aucun chantier'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
            {chantiersFiltres.map(c => {
              const done = parseInt(c.nb_salles_terminees || 0)
              const total = parseInt(c.nb_salles || 0)
              const pct = total ? Math.round((done / total) * 100) : 0
              return (
                <div key={c.id} onClick={() => navigate('/chantiers/' + c.id)}
                  style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'all .25s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{c.nom}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{c.client}</div>
                    </div>
                    <Badge statut={c.statut} />
                  </div>
                  <div style={{ fontSize: 12, color: '#8B8FA8', marginBottom: 14 }}>
                    {c.nb_salles} salle(s) · {c.nb_produits} equipement(s)
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>Avancement</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? '#10B981' : '#00D4FF' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg,#00D4FF,#0066CC)', borderRadius: 4 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    onClick={e => e.stopPropagation()}>
                    <button onClick={() => startEdit(c)}
                      style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>
                      ✏️ Modifier
                    </button>
                    <button onClick={() => deleteChantier(c.id, c.nom)}
                      style={{ flex: 1, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>
                      🗑️ Supprimer
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
