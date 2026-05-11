import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../context/CategoriesContext'

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const icons = {
  user:   "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  users:  "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  tag:    "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01",
  mail:   "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  cog:    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  plus:   "M12 5v14M5 12h14",
  edit:   "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  check:  "M20 6L9 17l-5-5",
  xmark:  "M18 6L6 18M6 6l12 12",
  send:   "M22 2L11 13M22 2l-7 20-4-9-9-4z",
  save:   "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
}

const ROLES = {
  admin:      { label: 'Admin',      color: '#EF4444' },
  chef:       { label: 'Chef',       color: '#F59E0B' },
  technicien: { label: 'Technicien', color: '#00D4FF' },
}

const CAT_PALETTE = [
  '#10B981', '#00D4FF', '#60A5FA', '#6366F1', '#8B5CF6', '#EC4899',
  '#EF4444', '#F59E0B', '#EAB308', '#84CC16', '#14B8A6', '#A855F7',
  '#F97316', '#06B6D4', '#22C55E', '#F43F5E', '#0EA5E9', '#D946EF',
]

const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10,
  padding: '10px 14px', color: '#eef0f6', fontSize: 13, outline: 'none'
}
const labelStyle = {
  fontSize: 10, fontWeight: 700, color: '#7b8096',
  textTransform: 'uppercase', letterSpacing: '.1em',
  marginBottom: 6, display: 'block', fontFamily: "'Cousine', monospace"
}
const ghostBtn = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
  color: '#eef0f6', borderRadius: 10, padding: '9px 14px',
  cursor: 'pointer', fontSize: 13, fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', gap: 6
}
const primaryBtn = {
  background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff',
  border: 'none', borderRadius: 10, padding: '10px 16px',
  cursor: 'pointer', fontWeight: 700, fontSize: 13,
  display: 'inline-flex', alignItems: 'center', gap: 6,
  boxShadow: '0 4px 18px rgba(16,185,129,0.30)'
}

const formatDate = (iso) => {
  if (!iso) return null
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const RoleBadge = ({ role }) => {
  const cfg = ROLES[role] || ROLES.technicien
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      color: cfg.color, background: cfg.color + '18',
      border: '1px solid ' + cfg.color + '40',
      fontFamily: "'Cousine', monospace", textTransform: 'uppercase', letterSpacing: .5
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color }} />
      {cfg.label}
    </span>
  )
}

const CountChip = ({ label, value, color }) => (
  <div style={{
    background: '#181b24', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10, padding: '8px 14px',
    display: 'flex', alignItems: 'center', gap: 8
  }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
    <span style={{ fontSize: 11, color: '#7b8096', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600 }}>{label}</span>
    <span style={{ fontFamily: "'Cousine', monospace", fontSize: 13, color: '#eef0f6', fontWeight: 700 }}>{value}</span>
  </div>
)

const Field = ({ label, children }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
)

const ErrorBox = ({ text }) => (
  <div style={{
    background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#EF4444'
  }}>{text}</div>
)

const Swatches = ({ value, onPick }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
    {CAT_PALETTE.map(c => {
      const active = (value || '').toLowerCase() === c.toLowerCase()
      return (
        <button key={c} type="button" onClick={() => onPick(c)} title={c}
          style={{
            width: 22, height: 22, borderRadius: '50%', background: c,
            border: active ? '2px solid #fff' : '2px solid rgba(255,255,255,0.15)',
            boxShadow: active ? `0 0 0 2px ${c}` : 'none',
            cursor: 'pointer', padding: 0, transition: 'all .12s'
          }} />
      )
    })}
  </div>
)

function UserRow({ u, currentUser, onEdit, onToggle }) {
  const [hover, setHover] = useState(false)
  const isMe = u.id === currentUser?.id
  const roleColor = (ROLES[u.role] || ROLES.technicien).color
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? '#1d2030' : '#181b24',
        border: '1px solid ' + (hover ? roleColor + '35' : 'rgba(255,255,255,0.07)'),
        borderLeft: '3px solid ' + roleColor,
        borderRadius: 12, padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 14, opacity: u.actif ? 1 : 0.55, transition: 'all .15s', flexWrap: 'wrap'
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: `linear-gradient(135deg,${roleColor},${roleColor}88)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: '#fff',
          fontFamily: "'Outfit', sans-serif", flexShrink: 0,
          boxShadow: `0 4px 14px ${roleColor}40`
        }}>
          {u.prenom?.[0]}{u.nom?.[0]}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700 }}>
              {u.prenom} {u.nom}
            </span>
            <RoleBadge role={u.role} />
            {isMe && (
              <span style={{ fontSize: 10, color: '#10B981', background: 'rgba(16,185,129,0.10)', padding: '2px 8px', borderRadius: 20, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', fontFamily: "'Cousine', monospace" }}>Vous</span>
            )}
            {!u.actif && (
              <span style={{ fontSize: 10, color: '#7b8096', background: 'rgba(123,128,150,0.10)', padding: '2px 8px', borderRadius: 20, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', fontFamily: "'Cousine', monospace" }}>Désactivé</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#7b8096', flexWrap: 'wrap' }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>{u.email}</span>
            {u.poste && (<><span style={{ color: '#3d4155' }}>•</span><span>{u.poste}</span></>)}
            {u.last_login && (
              <>
                <span style={{ color: '#3d4155' }}>•</span>
                <span style={{ fontFamily: "'Cousine', monospace", fontSize: 11, color: '#4b5063' }}>
                  vu {formatDate(u.last_login)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {(currentUser?.role === 'admin' || isMe) && (
          <button onClick={onEdit} style={{ ...ghostBtn, padding: '7px 12px', fontSize: 12 }}>
            <Icon d={icons.edit} size={13} /> {isMe ? 'Mon profil' : 'Modifier'}
          </button>
        )}
        {currentUser?.role === 'admin' && !isMe && (
          <button onClick={onToggle}
            style={{
              ...ghostBtn, padding: '7px 12px', fontSize: 12,
              background: u.actif ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.10)',
              borderColor: u.actif ? 'rgba(239,68,68,0.22)' : 'rgba(16,185,129,0.25)',
              color: u.actif ? '#EF4444' : '#10B981'
            }}>
            <Icon d={u.actif ? icons.xmark : icons.check} size={13} color={u.actif ? '#EF4444' : '#10B981'} />
            {u.actif ? 'Désactiver' : 'Réactiver'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Parametres() {
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const { categories, refresh: refreshCats } = useCategories()

  const [tab, setTab] = useState('users')
  const [chantiers, setChantiers] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', role: 'technicien', poste: 'Technicien AV' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState({})

  const [newCat, setNewCat] = useState('')
  const [newCatCouleur, setNewCatCouleur] = useState('#10B981')
  const [pendingColors, setPendingColors] = useState({})
  const [openPicker, setOpenPicker] = useState(null)
  const [editCatId, setEditCatId] = useState(null)
  const [editCatNom, setEditCatNom] = useState('')
  const [editCatOrdre, setEditCatOrdre] = useState(0)
  const [catSaving, setCatSaving] = useState(false)

  const [mailSettings, setMailSettings] = useState({})
  const [mailSaving, setMailSaving] = useState(false)
  const [mailMsg, setMailMsg] = useState('')

  useEffect(() => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'chef') {
      navigate('/')
      return
    }
    axios.get('/api/chantiers').then(res => setChantiers(res.data))
    if (currentUser?.role === 'admin') {
      axios.get('/api/settings').then(res => setMailSettings(res.data)).catch(() => {})
    }
    axios.get('/api/users')
      .then(res => setUsers(res.data))
      .finally(() => setLoading(false))
  }, [])

  const createUser = async () => {
    if (!form.nom || !form.prenom || !form.email || !form.password) {
      setError('Tous les champs sont requis.'); return
    }
    if (form.password.length < 8) {
      setError('Mot de passe : 8 caractères minimum.'); return
    }
    setSaving(true); setError('')
    try {
      const res = await axios.post('/api/users', form)
      setUsers(prev => [...prev, res.data])
      setForm({ nom: '', prenom: '', email: '', password: '', role: 'technicien', poste: 'Technicien AV' })
      setShowAdd(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création.')
    } finally { setSaving(false) }
  }

  const updateUser = async () => {
    setSaving(true); setError('')
    try {
      const res = await axios.patch('/api/users/' + editUser.id, editForm)
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...res.data } : u))
      setEditUser(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la modification.')
    } finally { setSaving(false) }
  }

  const toggleActif = async (u) => {
    try {
      await axios.patch('/api/users/' + u.id, { actif: !u.actif })
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, actif: !x.actif } : x))
    } catch { alert('Erreur lors de la modification.') }
  }

  const addCategorie = async () => {
    if (!newCat.trim()) return
    try {
      await axios.post('/api/categories', { nom: newCat.trim(), ordre: categories.length, couleur: newCatCouleur })
      refreshCats(); setNewCat(''); setNewCatCouleur('#10B981')
    } catch (err) { alert(err.response?.data?.error || 'Erreur') }
  }

  const updateCouleurCat = async (id, couleur) => {
    try {
      await axios.patch('/api/categories/' + id, { couleur })
      setPendingColors(prev => { const n = { ...prev }; delete n[id]; return n })
      refreshCats()
    } catch { alert('Erreur lors de la sauvegarde.') }
  }

  const saveEditCat = async (id) => {
    setCatSaving(true)
    try {
      await axios.patch('/api/categories/' + id, { nom: editCatNom, ordre: parseInt(editCatOrdre) })
      refreshCats(); setEditCatId(null)
    } catch { alert('Erreur lors de la modification.') }
    finally { setCatSaving(false) }
  }

  const toggleActiveCat = async (cat) => {
    try {
      await axios.patch('/api/categories/' + cat.id, { actif: !cat.actif })
      refreshCats()
    } catch { alert('Erreur.') }
  }

  const deleteCategorie = async (id, nom) => {
    if (!confirm('Supprimer le type "' + nom + '" ?')) return
    try { await axios.delete('/api/categories/' + id); refreshCats() }
    catch { alert('Erreur lors de la suppression.') }
  }

  const saveMailSettings = async () => {
    setMailSaving(true); setMailMsg('')
    try {
      await axios.patch('/api/settings', mailSettings)
      setMailMsg('✅ Paramètres sauvegardés.')
    } catch (err) {
      setMailMsg('❌ ' + (err.response?.data?.error || 'Erreur.'))
    } finally { setMailSaving(false) }
  }

  const testEmail = async () => {
    setMailSaving(true); setMailMsg('')
    try {
      const res = await axios.post('/api/settings/test-email')
      setMailMsg('✅ ' + res.data.message)
    } catch (err) {
      setMailMsg('❌ ' + (err.response?.data?.error || 'Erreur envoi.'))
    } finally { setMailSaving(false) }
  }

  const tabs = [
    { id: 'users', label: 'Utilisateurs',        icon: icons.users, count: users.length,      color: '#10B981' },
    { id: 'cats',  label: "Types d'équipements",  icon: icons.tag,   count: categories.length, color: '#8B5CF6' },
    ...(currentUser?.role === 'admin'
      ? [{ id: 'mail', label: 'Notifications email', icon: icons.mail, count: null, color: '#F59E0B' }]
      : [])
  ]

  return (
    <Layout chantiers={chantiers}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ marginBottom: 26, display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.22), rgba(16,185,129,0.08))',
            border: '1px solid rgba(16,185,129,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Icon d={icons.cog} size={20} color="#10B981" />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{
              fontFamily: "'Outfit', sans-serif", fontSize: 30, fontWeight: 900,
              lineHeight: 1.05, color: '#eef0f6', marginBottom: 6, letterSpacing: '-.01em'
            }}>Paramètres</h1>
            <p style={{ color: '#7b8096', fontSize: 14 }}>
              Comptes, types d'équipements et notifications — administration de la plateforme.
            </p>
          </div>
          {currentUser?.role === 'admin' && (
            <div style={{
              fontFamily: "'Cousine', monospace", fontSize: 10, color: '#4b5063',
              border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6,
              padding: '5px 9px', textTransform: 'uppercase', letterSpacing: '.1em',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <Icon d={icons.shield} size={11} color="#EF4444" /> Admin
            </div>
          )}
        </div>

        {/* TABS */}
        <div style={{
          display: 'flex', gap: 2, borderBottom: '1px solid rgba(255,255,255,0.07)',
          marginBottom: 24, flexWrap: 'wrap'
        }}>
          {tabs.map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '12px 18px', fontSize: 13, fontWeight: 600,
                  color: active ? t.color : '#7b8096',
                  borderBottom: active ? `2px solid ${t.color}` : '2px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: -1, transition: 'all .15s'
                }}>
                <Icon d={t.icon} size={14} color={active ? t.color : '#7b8096'} />
                {t.label}
                {t.count !== null && (
                  <span style={{
                    background: active ? t.color + '22' : 'rgba(255,255,255,0.06)',
                    color: active ? t.color : '#7b8096',
                    borderRadius: 20, padding: '1px 9px',
                    fontSize: 11, fontWeight: 700, fontFamily: "'Cousine', monospace"
                  }}>{t.count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── TAB UTILISATEURS ── */}
        {tab === 'users' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <CountChip label="Total"  value={users.length}                                      color="#eef0f6" />
              <CountChip label="Actifs" value={users.filter(u => u.actif).length}                 color="#10B981" />
              <CountChip label="Admin"  value={users.filter(u => u.role === 'admin').length}      color="#EF4444" />
              <CountChip label="Chef"   value={users.filter(u => u.role === 'chef').length}       color="#F59E0B" />
              <CountChip label="Tech."  value={users.filter(u => u.role === 'technicien').length} color="#00D4FF" />
              <div style={{ flex: 1 }} />
              {currentUser?.role === 'admin' && (
                <button onClick={() => { setShowAdd(v => !v); setError('') }} style={primaryBtn}>
                  <Icon d={showAdd ? icons.xmark : icons.plus} size={14} color="#fff" />
                  {showAdd ? 'Fermer' : 'Nouveau compte'}
                </button>
              )}
            </div>

            {showAdd && (
              <div style={{ background: '#13151E', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 16, padding: 22, marginBottom: 16 }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 800, marginBottom: 16 }}>
                  Nouveau compte
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <Field label="Prénom *"><input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} placeholder="Ex: Marc" style={inputStyle} /></Field>
                  <Field label="Nom *"><input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Dupont" style={inputStyle} /></Field>
                  <Field label="Email *"><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="marc.dupont@votreentreprise.fr" style={inputStyle} /></Field>
                  <Field label="Mot de passe * (min. 8 car.)"><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" style={inputStyle} /></Field>
                  <Field label="Rôle">
                    <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="technicien">Technicien</option>
                      <option value="chef">Chef d'équipe</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </Field>
                  <Field label="Poste">
                    <select value={form.poste} onChange={e => setForm({ ...form, poste: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option>Technicien AV</option>
                      <option>Technicien réseau</option>
                      <option>Chef de projet</option>
                      <option>Commercial</option>
                      <option>SAV</option>
                      <option>Autre</option>
                    </select>
                  </Field>
                </div>
                {error && <ErrorBox text={error} />}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setShowAdd(false); setError('') }} style={ghostBtn}>Annuler</button>
                  <button onClick={createUser} disabled={saving} style={primaryBtn}>
                    {saving ? 'Création...' : 'Créer le compte'}
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', color: '#7b8096', padding: '40px 0' }}>Chargement...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {users.map(u => (
                  <UserRow key={u.id} u={u} currentUser={currentUser}
                    onEdit={() => { setEditUser(u); setEditForm({ nom: u.nom, prenom: u.prenom, email: u.email, role: u.role, poste: u.poste }); setError('') }}
                    onToggle={() => toggleActif(u)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB TYPES D'ÉQUIPEMENTS ── */}
        {tab === 'cats' && (
          <div style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 22 }}>
            {/* Ajouter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
              <label style={{ cursor: 'pointer', position: 'relative', flexShrink: 0 }} title="Choisir une couleur">
                <div style={{
                  width: 42, height: 42, borderRadius: 11,
                  background: newCatCouleur + '22', border: '2px solid ' + newCatCouleur,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: newCatCouleur, fontFamily: "'Cousine', monospace", fontSize: 10, fontWeight: 700
                }}>{newCatCouleur.replace('#', '')}</div>
                <input type="color" value={newCatCouleur} onChange={e => setNewCatCouleur(e.target.value)}
                  style={{ position: 'absolute', opacity: 0, inset: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }} />
              </label>
              <input value={newCat} onChange={e => setNewCat(e.target.value)}
                placeholder="Nouveau type d'équipement (ex: Écran LED)"
                onKeyDown={e => e.key === 'Enter' && addCategorie()} style={{ ...inputStyle, flex: 1 }} />
              <button onClick={addCategorie} style={primaryBtn}>
                <Icon d={icons.plus} size={14} color="#fff" /> Ajouter
              </button>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', marginBottom: 20,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#7b8096', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: "'Cousine', monospace", whiteSpace: 'nowrap' }}>
                Suggestions
              </span>
              <Swatches value={newCatCouleur} onPick={setNewCatCouleur} />
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: '#7b8096', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12, fontFamily: "'Cousine', monospace" }}>
              Types existants ({categories.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {categories.map(cat => {
                const display = pendingColors[cat.id] ?? (cat.couleur || '#7b8096')
                const dirty = pendingColors[cat.id] !== undefined && pendingColors[cat.id] !== cat.couleur
                const open = openPicker === cat.id
                return (
                  <div key={cat.id} style={{ position: 'relative' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: display + '10', border: '1px solid ' + display + (open ? '80' : '40'),
                      borderLeft: '3px solid ' + display,
                      borderRadius: 10, padding: '10px 14px',
                      opacity: cat.actif ? 1 : 0.55, transition: 'all .15s'
                    }}>
                      {/* Bouton couleur */}
                      <button type="button" onClick={() => setOpenPicker(open ? null : cat.id)}
                        title="Changer la couleur"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: display, border: '2px solid rgba(255,255,255,0.15)' }} />
                      </button>

                      {editCatId === cat.id ? (
                        <>
                          <input value={editCatNom} onChange={e => setEditCatNom(e.target.value)}
                            style={{ ...inputStyle, flex: 1, padding: '6px 10px' }} />
                          <input type="number" value={editCatOrdre} onChange={e => setEditCatOrdre(e.target.value)}
                            title="Ordre" style={{ ...inputStyle, width: 64, padding: '6px 10px', flexShrink: 0 }} />
                          <button onClick={() => saveEditCat(cat.id)} disabled={catSaving}
                            style={{ ...primaryBtn, padding: '6px 14px', fontSize: 12, boxShadow: 'none' }}>
                            {catSaving ? '...' : 'OK'}
                          </button>
                          <button onClick={() => setEditCatId(null)}
                            style={{ ...ghostBtn, padding: '6px 10px', fontSize: 12 }}>✕</button>
                        </>
                      ) : (
                        <>
                          <span style={{ flex: 1, fontWeight: 600, color: display, fontSize: 13 }}>{cat.nom}</span>
                          <span style={{ fontSize: 11, color: '#4b5063', fontFamily: "'Cousine', monospace" }}>ordre {cat.ordre}</span>
                          {!cat.actif && <span style={{ fontSize: 10, color: '#EF4444', background: 'rgba(239,68,68,0.10)', padding: '2px 7px', borderRadius: 8, fontWeight: 700 }}>désactivé</span>}
                          {dirty && (
                            <button onClick={() => updateCouleurCat(cat.id, pendingColors[cat.id])}
                              style={{ background: display, border: 'none', color: '#fff', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                              ✓ couleur
                            </button>
                          )}
                          <button onClick={() => { setEditCatId(cat.id); setEditCatNom(cat.nom); setEditCatOrdre(cat.ordre) }}
                            style={{ ...ghostBtn, padding: '5px 10px', fontSize: 12 }}>✏️</button>
                          <button onClick={() => toggleActiveCat(cat)}
                            style={{
                              ...ghostBtn, padding: '5px 10px', fontSize: 11,
                              background: cat.actif ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.10)',
                              borderColor: cat.actif ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.25)',
                              color: cat.actif ? '#F59E0B' : '#10B981'
                            }}>
                            {cat.actif ? 'Désactiver' : 'Activer'}
                          </button>
                          <button onClick={() => deleteCategorie(cat.id, cat.nom)}
                            style={{ ...ghostBtn, padding: '5px 10px', background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 12 }}>
                            🗑️
                          </button>
                        </>
                      )}
                    </div>

                    {/* Popover couleur */}
                    {open && (
                      <>
                        <div onClick={() => setOpenPicker(null)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
                          background: '#181b24', border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 12, padding: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
                          minWidth: 220
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#7b8096', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8, fontFamily: "'Cousine', monospace" }}>
                            Couleur de « {cat.nom} »
                          </div>
                          <Swatches value={display} onPick={(c) => setPendingColors(p => ({ ...p, [cat.id]: c }))} />
                          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '10px 0' }} />
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <label style={{ cursor: 'pointer', position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7b8096' }}>
                              <div style={{ width: 18, height: 18, borderRadius: 4, background: display, border: '1px solid rgba(255,255,255,0.15)' }} />
                              <span>Couleur libre</span>
                              <input type="color" value={display}
                                onChange={e => setPendingColors(p => ({ ...p, [cat.id]: e.target.value }))}
                                style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer', border: 'none', padding: 0 }} />
                            </label>
                            <button onClick={() => {
                              if (dirty) updateCouleurCat(cat.id, pendingColors[cat.id])
                              setOpenPicker(null)
                            }} style={{ ...primaryBtn, padding: '6px 12px', fontSize: 12, boxShadow: 'none' }}>
                              {dirty ? 'Appliquer' : 'Fermer'}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
              {categories.length === 0 && (
                <div style={{ color: '#7b8096', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>Aucun type défini.</div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB NOTIFICATIONS EMAIL ── */}
        {tab === 'mail' && currentUser?.role === 'admin' && (
          <div style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24 }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Destinataires</div>
            <div style={{ fontSize: 12, color: '#7b8096', marginBottom: 14 }}>
              Adresse à laquelle les BL signés sont envoyés, et URL utilisée dans les liens email.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <Field label="Email ADV (destinataire)">
                <input type="email" value={mailSettings.adv_email || ''} onChange={e => setMailSettings(s => ({ ...s, adv_email: e.target.value }))} placeholder="adv@entreprise.fr" style={inputStyle} />
              </Field>
              <Field label="URL de l'application">
                <input value={mailSettings.app_url || ''} onChange={e => setMailSettings(s => ({ ...s, app_url: e.target.value }))} placeholder="https://avtrack.votredomaine.fr" style={inputStyle} />
              </Field>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0 22px' }} />

            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Configuration SMTP</div>
            <div style={{ fontSize: 12, color: '#7b8096', marginBottom: 14 }}>Serveur de messagerie utilisé pour envoyer les emails.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <Field label="Serveur SMTP"><input value={mailSettings.smtp_host || ''} onChange={e => setMailSettings(s => ({ ...s, smtp_host: e.target.value }))} placeholder="smtp.gmail.com" style={inputStyle} /></Field>
              <Field label="Port SMTP"><input value={mailSettings.smtp_port || ''} onChange={e => setMailSettings(s => ({ ...s, smtp_port: e.target.value }))} placeholder="587" style={inputStyle} /></Field>
              <Field label="Utilisateur SMTP"><input value={mailSettings.smtp_user || ''} onChange={e => setMailSettings(s => ({ ...s, smtp_user: e.target.value }))} placeholder="votre@email.com" style={inputStyle} /></Field>
              <Field label="Mot de passe SMTP"><input type="password" value={mailSettings.smtp_pass || ''} onChange={e => setMailSettings(s => ({ ...s, smtp_pass: e.target.value }))} placeholder="••••••••" style={inputStyle} /></Field>
              <Field label="Email expéditeur (optionnel)"><input value={mailSettings.smtp_from || ''} onChange={e => setMailSettings(s => ({ ...s, smtp_from: e.target.value }))} placeholder="avtrack@entreprise.fr" style={inputStyle} /></Field>
              <div>
                <label style={labelStyle}>Sécurité</label>
                <div onClick={() => setMailSettings(s => ({ ...s, smtp_secure: s.smtp_secure === 'true' ? 'false' : 'true' }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'rgba(255,255,255,0.03)', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.07)',
                    padding: '10px 14px', cursor: 'pointer', height: 42, boxSizing: 'border-box'
                  }}>
                  <div style={{
                    width: 36, height: 20, borderRadius: 99,
                    background: mailSettings.smtp_secure === 'true' ? '#10B981' : 'rgba(255,255,255,0.1)',
                    position: 'relative', transition: '.15s', flexShrink: 0
                  }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3, left: mailSettings.smtp_secure === 'true' ? 19 : 3,
                      transition: '.15s'
                    }} />
                  </div>
                  <span style={{ fontSize: 12 }}>SSL/TLS (port 465)</span>
                </div>
              </div>
            </div>

            {mailMsg && (
              <div style={{
                background: mailMsg.startsWith('✅') ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
                border: '1px solid ' + (mailMsg.startsWith('✅') ? 'rgba(16,185,129,0.30)' : 'rgba(239,68,68,0.30)'),
                borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13,
                color: mailMsg.startsWith('✅') ? '#10B981' : '#EF4444'
              }}>{mailMsg}</div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={testEmail} disabled={mailSaving} style={ghostBtn}>
                <Icon d={icons.send} size={13} /> Envoyer un email de test
              </button>
              <button onClick={saveMailSettings} disabled={mailSaving} style={primaryBtn}>
                <Icon d={icons.save} size={13} color="#fff" /> {mailSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        )}

        {/* MODAL EDIT USER */}
        {editUser && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, padding: 26, width: '100%', maxWidth: 480 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 800 }}>Modifier le compte</div>
                <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', color: '#eef0f6', cursor: 'pointer' }}>
                  <Icon d={icons.xmark} size={20} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Field label="Prénom"><input value={editForm.prenom || ''} onChange={e => setEditForm({ ...editForm, prenom: e.target.value })} style={inputStyle} /></Field>
                <Field label="Nom"><input value={editForm.nom || ''} onChange={e => setEditForm({ ...editForm, nom: e.target.value })} style={inputStyle} /></Field>
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label="Email"><input type="email" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} style={inputStyle} /></Field>
                </div>
                {currentUser?.role === 'admin' && (
                  <>
                    <Field label="Rôle">
                      <select value={editForm.role || 'technicien'} onChange={e => setEditForm({ ...editForm, role: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="technicien">Technicien</option>
                        <option value="chef">Chef d'équipe</option>
                        <option value="admin">Administrateur</option>
                      </select>
                    </Field>
                    <Field label="Poste">
                      <select value={editForm.poste || 'Technicien AV'} onChange={e => setEditForm({ ...editForm, poste: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option>Technicien AV</option>
                        <option>Technicien réseau</option>
                        <option>Chef de projet</option>
                        <option>Commercial</option>
                        <option>SAV</option>
                        <option>Autre</option>
                      </select>
                    </Field>
                  </>
                )}
              </div>
              {error && <ErrorBox text={error} />}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => { setEditUser(null); setError('') }} style={ghostBtn}>Annuler</button>
                <button onClick={updateUser} disabled={saving} style={primaryBtn}>
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
