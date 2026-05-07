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
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  plus: "M12 5v14M5 12h14",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  check: "M20 6L9 17l-5-5",
  xmark: "M18 6L6 18M6 6l12 12",
}

const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
  padding: '10px 14px', color: '#E8EAF0', fontSize: 13, outline: 'none'
}
const labelStyle = {
  fontSize: 11, fontWeight: 600, color: '#6B7280',
  textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6, display: 'block'
}

const ROLES = {
  admin:      { label: 'Admin',      color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  chef:       { label: 'Chef',       color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  technicien: { label: 'Technicien', color: '#00D4FF', bg: 'rgba(0,212,255,0.1)' },
}

const RoleBadge = ({ role }) => {
  const cfg = ROLES[role] || ROLES.technicien
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, border: '1px solid ' + cfg.color + '30' }}>
      {cfg.label}
    </span>
  )
}

export default function Utilisateurs() {
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const { categories, refresh: refreshCats } = useCategories()
  const [chantiers, setChantiers] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showCats, setShowCats] = useState(false)
  const [showMailConfig, setShowMailConfig] = useState(false)
  const [mailSettings, setMailSettings] = useState({})
  const [mailSaving, setMailSaving] = useState(false)
  const [mailMsg, setMailMsg] = useState('')
  const [newCat, setNewCat] = useState('')
  const [newCatCouleur, setNewCatCouleur] = useState('#00D4FF')
  const [pendingColors, setPendingColors] = useState({})
  const [editUser, setEditUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', role: 'technicien', poste: 'Technicien AV' })
  const [editForm, setEditForm] = useState({})
  const [error, setError] = useState('')

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
      setError('Tous les champs sont requis.')
      return
    }
    if (form.password.length < 8) {
      setError('Mot de passe : 8 caracteres minimum.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await axios.post('/api/users', form)
      setUsers(prev => [...prev, res.data])
      setForm({ nom: '', prenom: '', email: '', password: '', role: 'technicien', poste: 'Technicien AV' })
      setShowAdd(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la creation.')
    } finally {
      setSaving(false)
    }
  }

  const updateUser = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await axios.patch('/api/users/' + editUser.id, editForm)
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...res.data } : u))
      setEditUser(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la modification.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActif = async (user) => {
    try {
      await axios.patch('/api/users/' + user.id, { actif: !user.actif })
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, actif: !u.actif } : u))
    } catch (err) {
      alert('Erreur lors de la modification.')
    }
  }

  const addCategorie = async () => {
    if (!newCat.trim()) return
    try {
      await axios.post('/api/categories', { nom: newCat.trim(), ordre: categories.length, couleur: newCatCouleur })
      refreshCats()
      setNewCat('')
      setNewCatCouleur('#00D4FF')
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur')
    }
  }

  const updateCouleurCat = async (id, couleur) => {
    try {
      await axios.patch('/api/categories/' + id, { couleur })
      setPendingColors(prev => { const n = { ...prev }; delete n[id]; return n })
      refreshCats()
    } catch (err) { alert('Erreur lors de la sauvegarde.') }
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

  const deleteCategorie = async (id, nom) => {
    if (!confirm('Supprimer le type "' + nom + '" ?')) return
    try {
      await axios.delete('/api/categories/' + id)
      refreshCats()
    } catch (err) {
      alert('Erreur lors de la suppression.')
    }
  }

  return (
    <Layout chantiers={chantiers}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Utilisateurs</h1>
            <p style={{ color: '#6B7280', fontSize: 14 }}>Gestion des comptes techniciens</p>
          </div>
          {currentUser?.role === 'admin' && (
            <button onClick={() => { setShowAdd(true); setError('') }}
              style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon d={icons.plus} size={14} color="#fff" /> Nouveau compte
            </button>
          )}
        </div>

        {currentUser?.role === 'admin' && (
          <div style={{ marginBottom: 24 }}>
            <button onClick={() => setShowCats(!showCats)}
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#8B5CF6', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: showCats ? 12 : 0 }}>
              ⚙️ Gerer les types d'equipements ({categories.length})
            </button>
            {showCats && (
              <div style={{ background: '#13151E', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 16, padding: 20 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Types d'equipements disponibles</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
                  <label title="Choisir une couleur" style={{ cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: newCatCouleur + '30', border: '2px solid ' + newCatCouleur, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                      🎨
                    </div>
                    <input type="color" value={newCatCouleur} onChange={e => setNewCatCouleur(e.target.value)}
                      style={{ position: 'absolute', opacity: 0, top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }} />
                  </label>
                  <input value={newCat} onChange={e => setNewCat(e.target.value)}
                    placeholder="Nouveau type (ex: Ecran LED)"
                    onKeyDown={e => e.key === 'Enter' && addCategorie()}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 14px', color: '#E8EAF0', fontSize: 13, outline: 'none' }} />
                  <button onClick={addCategorie}
                    style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                    + Ajouter
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {categories.map(cat => {
                    const displayColor = pendingColors[cat.id] ?? (cat.couleur || '#7b8096')
                    const hasChange = pendingColors[cat.id] !== undefined && pendingColors[cat.id] !== cat.couleur
                    return (
                      <div key={cat.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: displayColor + '18', border: '1px solid ' + displayColor + '50', borderRadius: 20, padding: '5px 10px 5px 6px', fontSize: 12, transition: 'all .15s' }}>
                        <label title="Changer la couleur" style={{ cursor: 'pointer', position: 'relative', flexShrink: 0, width: 16, height: 16 }}>
                          <div style={{ width: 16, height: 16, borderRadius: '50%', background: displayColor }} />
                          <input type="color" value={displayColor}
                            onChange={e => setPendingColors(prev => ({ ...prev, [cat.id]: e.target.value }))}
                            style={{ position: 'absolute', opacity: 0, top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }} />
                        </label>
                        <span style={{ color: displayColor, fontWeight: 600 }}>{cat.nom}</span>
                        {hasChange && (
                          <button onClick={() => updateCouleurCat(cat.id, pendingColors[cat.id])}
                            title="Valider la couleur"
                            style={{ background: displayColor, border: 'none', color: '#fff', borderRadius: 20, padding: '2px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                            ✓
                          </button>
                        )}
                        <button onClick={() => deleteCategorie(cat.id, cat.nom)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1, fontWeight: 700 }}>
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {currentUser?.role === 'admin' && (
          <div style={{ marginBottom: 24 }}>
            <button onClick={() => setShowMailConfig(!showMailConfig)}
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: showMailConfig ? 12 : 0 }}>
              ✉️ Paramètres email (notifications BL)
            </button>
            {showMailConfig && (
              <div style={{ background: '#13151E', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: 24 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#10B981' }}>Configuration SMTP</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Email ADV (destinataire)</label>
                    <input type="email" value={mailSettings.adv_email || ''} onChange={e => setMailSettings(s => ({ ...s, adv_email: e.target.value }))}
                      placeholder="adv@entreprise.fr" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>URL de l'application</label>
                    <input value={mailSettings.app_url || ''} onChange={e => setMailSettings(s => ({ ...s, app_url: e.target.value }))}
                      placeholder="https://avtrack.votredomaine.fr" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Serveur SMTP</label>
                    <input value={mailSettings.smtp_host || ''} onChange={e => setMailSettings(s => ({ ...s, smtp_host: e.target.value }))}
                      placeholder="smtp.gmail.com" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Port SMTP</label>
                    <input value={mailSettings.smtp_port || ''} onChange={e => setMailSettings(s => ({ ...s, smtp_port: e.target.value }))}
                      placeholder="587" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Utilisateur SMTP</label>
                    <input value={mailSettings.smtp_user || ''} onChange={e => setMailSettings(s => ({ ...s, smtp_user: e.target.value }))}
                      placeholder="votre@email.com" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Mot de passe SMTP</label>
                    <input type="password" value={mailSettings.smtp_pass || ''} onChange={e => setMailSettings(s => ({ ...s, smtp_pass: e.target.value }))}
                      placeholder="••••••••" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email expéditeur (optionnel)</label>
                    <input value={mailSettings.smtp_from || ''} onChange={e => setMailSettings(s => ({ ...s, smtp_from: e.target.value }))}
                      placeholder="avtrack@entreprise.fr" style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 14px', width: '100%' }}
                      onClick={() => setMailSettings(s => ({ ...s, smtp_secure: s.smtp_secure === 'true' ? 'false' : 'true' }))}>
                      <div style={{ width: 36, height: 20, borderRadius: 10, background: mailSettings.smtp_secure === 'true' ? '#10B981' : 'rgba(255,255,255,0.1)', position: 'relative', transition: '.2s', flexShrink: 0 }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: mailSettings.smtp_secure === 'true' ? 19 : 3, transition: '.2s' }} />
                      </div>
                      <span style={{ fontSize: 12, color: '#E8EAF0' }}>SSL/TLS (port 465)</span>
                    </div>
                  </div>
                </div>
                {mailMsg && (
                  <div style={{ background: mailMsg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: '1px solid ' + (mailMsg.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'), borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: mailMsg.startsWith('✅') ? '#10B981' : '#EF4444' }}>
                    {mailMsg}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={testEmail} disabled={mailSaving}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    📨 Envoyer un email de test
                  </button>
                  <button onClick={saveMailSettings} disabled={mailSaving}
                    style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    {mailSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {showAdd && (
          <div style={{ background: '#13151E', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Nouveau compte</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Prenom *</label>
                <input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })}
                  placeholder="Ex: Marc" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nom *</label>
                <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                  placeholder="Ex: Dupont" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="marc.dupont@votreentreprise.fr" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Mot de passe * (min. 8 car.)</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="technicien">Technicien</option>
                  <option value="chef">Chef d'equipe</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Poste</label>
                <select value={form.poste} onChange={e => setForm({ ...form, poste: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option>Technicien AV</option>
                  <option>Technicien reseau</option>
                  <option>Chef de projet</option>
                  <option>Commercial</option>
                  <option>SAV</option>
                  <option>Autre</option>
                </select>
              </div>
            </div>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#EF4444' }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowAdd(false); setError('') }}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>
                Annuler
              </button>
              <button onClick={createUser} disabled={saving}
                style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                {saving ? 'Creation...' : 'Creer le compte'}
              </button>
            </div>
          </div>
        )}

        {editUser && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800 }}>Modifier le compte</div>
                <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', color: '#E8EAF0', cursor: 'pointer' }}>
                  <Icon d={icons.xmark} size={20} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Prenom</label>
                  <input value={editForm.prenom || ''} onChange={e => setEditForm({ ...editForm, prenom: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Nom</label>
                  <input value={editForm.nom || ''} onChange={e => setEditForm({ ...editForm, nom: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} style={inputStyle} />
                </div>
                {currentUser?.role === 'admin' && (
                  <>
                    <div>
                      <label style={labelStyle}>Role</label>
                      <select value={editForm.role || 'technicien'} onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                        style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="technicien">Technicien</option>
                        <option value="chef">Chef d'equipe</option>
                        <option value="admin">Administrateur</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Poste</label>
                      <select value={editForm.poste || 'Technicien AV'} onChange={e => setEditForm({ ...editForm, poste: e.target.value })}
                        style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option>Technicien AV</option>
                        <option>Technicien reseau</option>
                        <option>Chef de projet</option>
                        <option>Commercial</option>
                        <option>SAV</option>
                        <option>Autre</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#EF4444' }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => { setEditUser(null); setError('') }}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>
                  Annuler
                </button>
                <button onClick={updateUser} disabled={saving}
                  style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: '#6B7280', padding: '40px 0' }}>Chargement...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {users.map(u => (
              <div key={u.id} style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, opacity: u.actif ? 1 : 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#00D4FF,#0066CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                    {u.prenom?.[0]}{u.nom?.[0]}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{u.prenom} {u.nom}</span>
                      <RoleBadge role={u.role} />
                      {!u.actif && (
                        <span style={{ fontSize: 11, color: '#6B7280', background: 'rgba(107,114,128,0.1)', padding: '2px 8px', borderRadius: 20 }}>
                          Desactive
                        </span>
                      )}
                      {u.id === currentUser?.id && (
                        <span style={{ fontSize: 11, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 20 }}>
                          Vous
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{u.email}</div>
                    {u.poste && <div style={{ fontSize: 11, color: '#4B5563', marginTop: 2 }}>{u.poste}</div>}
                    {u.last_login && (
                      <div style={{ fontSize: 11, color: '#4B5563', marginTop: 2 }}>
                        Derniere connexion : {new Date(u.last_login).toLocaleString('fr-FR')}
                      </div>
                    )}
                  </div>
                </div>
                {(currentUser?.role === 'admin' || u.id === currentUser?.id) && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setEditUser(u); setEditForm({ nom: u.nom, prenom: u.prenom, email: u.email, role: u.role, poste: u.poste }); setError('') }}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon d={icons.edit} size={13} /> {u.id === currentUser?.id ? 'Mon profil' : 'Modifier'}
                    </button>
                    {currentUser?.role === 'admin' && u.id !== currentUser?.id && (
                      <button
                        onClick={() => toggleActif(u)}
                        style={{ background: u.actif ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', border: '1px solid ' + (u.actif ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'), color: u.actif ? '#EF4444' : '#10B981', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon d={u.actif ? icons.xmark : icons.check} size={13} color={u.actif ? '#EF4444' : '#10B981'} />
                        {u.actif ? 'Desactiver' : 'Reactiver'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
