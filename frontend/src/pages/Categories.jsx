import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../components/Layout'
import { useCategories } from '../context/CategoriesContext'
import { useAuth } from '../context/AuthContext'

const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EAF0', fontSize: 13, outline: 'none' }
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6, display: 'block' }

export default function Categories() {
  const { user } = useAuth()
  const { categories, refresh } = useCategories()
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)
  const [nom, setNom] = useState('')
  const [ordre, setOrdre] = useState(0)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editNom, setEditNom] = useState('')
  const [editOrdre, setEditOrdre] = useState(0)

  if (user?.role !== 'admin') {
    navigate('/')
    return null
  }

  const create = async () => {
    if (!nom) return
    setSaving(true)
    try {
      await axios.post('/api/categories', { nom, ordre: parseInt(ordre) })
      refresh()
      setNom('')
      setOrdre(0)
      setShowAdd(false)
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const save = async (id) => {
    setSaving(true)
    try {
      await axios.patch('/api/categories/' + id, { nom: editNom, ordre: parseInt(editOrdre) })
      refresh()
      setEditId(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (cat) => {
    await axios.patch('/api/categories/' + cat.id, { actif: !cat.actif })
    refresh()
  }

  const remove = async (id, nom) => {
    if (!confirm('Supprimer la categorie "' + nom + '" ?')) return
    await axios.delete('/api/categories/' + id)
    refresh()
  }

  return (
    <Layout chantiers={[]}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Categories equipements</h1>
            <p style={{ color: '#6B7280', fontSize: 14 }}>Gerer les types d'equipements disponibles</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            + Nouvelle categorie
          </button>
        </div>

        {showAdd && (
          <div style={{ background: '#13151E', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 14 }}>Nouvelle categorie</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Nom *</label>
                <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Ecran LED" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Ordre</label>
                <input type="number" value={ordre} onChange={e => setOrdre(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAdd(false)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}>
                Annuler
              </button>
              <button onClick={create} disabled={saving}
                style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                {saving ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {categories.map(cat => (
            <div key={cat.id} style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: cat.actif ? 1 : 0.5 }}>
              {editId === cat.id ? (
                <>
                  <input value={editNom} onChange={e => setEditNom(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }} />
                  <input type="number" value={editOrdre} onChange={e => setEditOrdre(e.target.value)}
                    style={{ ...inputStyle, width: 80 }} />
                  <button onClick={() => save(cat.id)} disabled={saving}
                    style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {saving ? '...' : 'OK'}
                  </button>
                  <button onClick={() => setEditId(null)}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12 }}>
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{cat.nom}</span>
                    <span style={{ fontSize: 11, color: '#4B5563', marginLeft: 10 }}>ordre: {cat.ordre}</span>
                    {!cat.actif && <span style={{ fontSize: 11, color: '#EF4444', marginLeft: 8 }}>desactive</span>}
                  </div>
                  <button onClick={() => { setEditId(cat.id); setEditNom(cat.nom); setEditOrdre(cat.ordre) }}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>
                    ✏️
                  </button>
                  <button onClick={() => toggle(cat)}
                    style={{ background: cat.actif ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: '1px solid ' + (cat.actif ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'), color: cat.actif ? '#F59E0B' : '#10B981', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>
                    {cat.actif ? 'Desactiver' : 'Activer'}
                  </button>
                  <button onClick={() => remove(cat.id, cat.nom)}
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>
                    🗑️
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}

