import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../context/CategoriesContext'
import { useTheme } from '../context/ThemeContext'
import ClientsTab from './Clients'

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const icons = {
  check:    "M20 6L9 17l-5-5",
  palette:  "M12 2a10 10 0 1 0 0 20 4 4 0 0 0 4-4v-1a2 2 0 0 1 2-2h1a3 3 0 0 0 0-6h-1a10 10 0 0 0-6-7",
  sun:      "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 5a7 7 0 1 0 0 14A7 7 0 0 0 12 5z",
  moon:     "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  bell:     "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  user:     "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  users:    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  lock:     "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
  tag:      "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01",
  save:     "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  upload:   "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  trash:    "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  refresh:  "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  alert:    "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  database: "M12 3C7 3 3 5.24 3 8s4 5 9 5 9-2.24 9-5-4-5-9-5zM3 8v4c0 2.76 4 5 9 5s9-2.24 9-5V8M3 12v4c0 2.76 4 5 9 5s9-2.24 9-5v-4",
  plus:     "M12 5v14M5 12h14",
  edit:     "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  xmark:    "M18 6L6 18M6 6l12 12",
  building: "M3 21V7l9-4 9 4v14M9 21v-6h6v6",
  box:      "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12",
  mail:     "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  send:     "M22 2L11 13M22 2l-7 20-4-9-9-4z",
  shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
}

// ── Constantes partagées ──────────────────────────────────────────
const ROLES = {
  admin:      { label: 'Admin',      color: '#EF4444' },
  chef:       { label: 'Chef',       color: '#F59E0B' },
  technicien: { label: 'Technicien', color: '#00D4FF' },
}
const CAT_PALETTE = [
  '#10B981','#00D4FF','#60A5FA','#6366F1','#8B5CF6','#EC4899',
  '#EF4444','#F59E0B','#EAB308','#84CC16','#14B8A6','#A855F7',
  '#F97316','#06B6D4','#22C55E','#F43F5E','#0EA5E9','#D946EF',
]
const fmtLastLogin = (iso) => {
  if (!iso) return null
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ── Previews thème ────────────────────────────────────────────────
function PreviewV1() {
  return (
    <div style={{ width: '100%', height: 96, borderRadius: 8, overflow: 'hidden', background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace', userSelect: 'none' }}>
      <div style={{ background: '#13151c', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#10B981', fontWeight: 900, fontSize: 9 }}>AV</span>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 9 }}>TRACK</span>
        <span style={{ marginLeft: 'auto', color: '#3d4155', fontSize: 8 }}>En cours</span>
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 7, borderRadius: 4, background: '#181b24', width: '65%' }} />
        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.05)', width: '45%' }} />
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {['#10B981','#F59E0B','#6366F1'].map(c => (
            <div key={c} style={{ height: 20, flex: 1, borderRadius: 4, background: '#181b24', border: `1px solid ${c}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 12, height: 3, borderRadius: 2, background: c }} />
            </div>
          ))}
        </div>
        <div style={{ height: 2, borderRadius: 99, background: 'rgba(255,255,255,0.06)', marginTop: 4, overflow: 'hidden' }}>
          <div style={{ width: '58%', height: '100%', background: '#10B981', borderRadius: 99 }} />
        </div>
      </div>
    </div>
  )
}

function PreviewV2() {
  return (
    <div style={{ width: '100%', height: 96, borderRadius: 8, overflow: 'hidden', background: '#EDE9E0', border: '1px solid rgba(28,29,43,0.12)', fontFamily: 'monospace', userSelect: 'none' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(28,29,43,0.08)', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#E89B2C', fontWeight: 900, fontSize: 9 }}>AV</span>
        <span style={{ color: '#1C1D2B', fontWeight: 900, fontSize: 9 }}>TRACK</span>
        <span style={{ marginLeft: 'auto', color: '#9CA0B5', fontSize: 8 }}>En cours</span>
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 7, borderRadius: 4, background: '#fff', width: '65%', border: '1px solid rgba(28,29,43,0.08)' }} />
        <div style={{ height: 5, borderRadius: 3, background: 'rgba(28,29,43,0.06)', width: '45%' }} />
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {['#2EAE7B','#E89B2C','#6B5BD6'].map(c => (
            <div key={c} style={{ height: 20, flex: 1, borderRadius: 4, background: '#fff', border: `1px solid ${c}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 12, height: 3, borderRadius: 2, background: c }} />
            </div>
          ))}
        </div>
        <div style={{ height: 2, borderRadius: 99, background: 'rgba(28,29,43,0.1)', marginTop: 4, overflow: 'hidden' }}>
          <div style={{ width: '58%', height: '100%', background: '#E89B2C', borderRadius: 99 }} />
        </div>
      </div>
    </div>
  )
}

// ── Section Apparence ─────────────────────────────────────────────
function SectionApparence({ theme, setTheme }) {
  const [pending, setPending] = useState(null)
  const [saved, setSaved]     = useState(false)
  const active = pending ?? theme
  const dirty  = pending !== null && pending !== theme

  useEffect(() => {
    document.documentElement.classList.remove('theme-v1', 'theme-v2')
    document.documentElement.classList.add(`theme-${active}`)
    return () => {
      document.documentElement.classList.remove(`theme-${active}`)
      document.documentElement.classList.add(`theme-${theme}`)
    }
  }, [active, theme])

  const handleApply = async () => {
    await setTheme(pending); setPending(null); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const options = [
    { id: 'v1', label: 'Classique', sub: 'Fond sombre — accent vert émeraude', icon: icons.moon, preview: <PreviewV1/> },
    { id: 'v2', label: 'Spektalis', sub: 'Fond paper — accent ambre',           icon: icons.sun,  preview: <PreviewV2/> },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--fg)', marginBottom: 4 }}>Apparence</h2>
        <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>Choisissez le thème visuel de l'interface</p>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-card)', padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 16, fontFamily: 'var(--font-mono)' }}>Thème</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {options.map(opt => {
            const isActive = active === opt.id
            return (
              <div key={opt.id} onClick={() => setPending(opt.id === theme ? null : opt.id)}
                style={{ border: isActive ? '2px solid var(--accent)' : '2px solid var(--border-2)', borderRadius: 'var(--r-card)', padding: 14, cursor: 'pointer', background: isActive ? 'var(--accent-soft)' : 'var(--bg)', transition: 'all .2s', position: 'relative' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border-2)' }}>
                {isActive && (
                  <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon d={icons.check} size={11} color="var(--accent-fg)" />
                  </div>
                )}
                <div style={{ marginBottom: 10 }}>{opt.preview}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon d={opt.icon} size={14} color={isActive ? 'var(--accent)' : 'var(--fg-3)'} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? 'var(--accent)' : 'var(--fg)' }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 1 }}>{opt.sub}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-card)', padding: '12px 16px', fontSize: 12, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        Le thème est sauvegardé par compte et s'applique sur tous vos appareils.
      </div>
      {dirty && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-card)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', zIndex: 100, animation: 'fadein .2s ease' }}>
          <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>Aperçu <strong style={{ color: 'var(--fg)' }}>{pending === 'v1' ? 'Classique' : 'Spektalis'}</strong></span>
          <button onClick={() => setPending(null)} style={{ background: 'var(--border)', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, color: 'var(--fg-3)', fontWeight: 600 }}>Annuler</button>
          <button onClick={handleApply} style={{ background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 12, color: 'var(--accent-fg)', fontWeight: 700 }}>Appliquer</button>
        </div>
      )}
      {saved && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', borderRadius: 'var(--r-card)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', zIndex: 100, animation: 'fadein .2s ease' }}>
          <Icon d={icons.check} size={14} color="var(--accent-fg)" />
          <span style={{ fontSize: 13, color: 'var(--accent-fg)', fontWeight: 600 }}>Thème appliqué</span>
        </div>
      )}
    </div>
  )
}

// ── Section Notifications ─────────────────────────────────────────
function SectionNotifications() {
  const [on0, setOn0] = useState(false)
  const [on1, setOn1] = useState(true)
  const Toggle = ({ on, onToggle }) => (
    <div onClick={onToggle} style={{ width: 38, height: 21, borderRadius: 11, cursor: 'pointer', background: on ? 'var(--accent)' : 'var(--border-strong)', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 19 : 3, width: 15, height: 15, borderRadius: '50%', background: on ? 'var(--accent-fg)' : 'var(--fg-3)', transition: 'left .2s' }} />
    </div>
  )
  const rows = [
    { label: 'Notifications email', sub: "Recevoir un email lors d'un changement de statut", on: on0, setOn: setOn0 },
    { label: 'Alertes de sauvegardes', sub: "Être notifié si une sauvegarde automatique échoue", on: on1, setOn: setOn1 },
  ]
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--fg)', marginBottom: 4 }}>Notifications</h2>
        <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>Préférences de notifications</p>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-card)', overflow: 'hidden', marginBottom: 16 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>{r.label}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{r.sub}</div>
            </div>
            <Toggle on={r.on} onToggle={() => r.setOn(!r.on)} />
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-card)', padding: '12px 16px', fontSize: 12, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        Les notifications par email nécessitent une configuration SMTP (section Email).
      </div>
    </div>
  )
}

// ── Section Profil ────────────────────────────────────────────────
function SectionProfil({ user }) {
  const rows = [
    { label: 'Prénom',      value: user?.prenom },
    { label: 'Nom',         value: user?.nom },
    { label: 'Identifiant', value: user?.username },
    { label: 'Rôle',        value: user?.role },
  ]
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--fg)', marginBottom: 4 }}>Profil</h2>
        <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>Informations de votre compte</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-card)', marginBottom: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, color: 'var(--accent-fg)', flexShrink: 0 }}>
          {user?.prenom?.[0]}{user?.nom?.[0]}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--fg)' }}>{user?.prenom} {user?.nom}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2, textTransform: 'capitalize' }}>{user?.role}</div>
        </div>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-card)', overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', padding: '13px 20px', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: 'var(--font-mono)' }}>{r.label}</div>
            <div style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 500 }}>{r.value || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Section Sécurité ──────────────────────────────────────────────
function SectionSecurite({ user }) {
  const [form, setForm]     = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  const reqs = [
    { label: '8+ caractères', ok: form.newPassword.length >= 8 },
    { label: 'Majuscule',     ok: /[A-Z]/.test(form.newPassword) },
    { label: 'Chiffre',       ok: /[0-9]/.test(form.newPassword) },
  ]
  const inSt  = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-input)', padding: '10px 14px', color: 'var(--fg)', fontSize: 13, outline: 'none' }
  const labSt = { fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6, display: 'block', fontFamily: 'var(--font-mono)' }

  const handleSubmit = async () => {
    setError('')
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) { setError('Tous les champs sont requis.'); return }
    if (form.newPassword.length < 8) { setError('8 caractères minimum.'); return }
    if (form.newPassword !== form.confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return }
    if (form.newPassword === form.currentPassword) { setError('Le nouveau mot de passe doit être différent.'); return }
    setSaving(true)
    try {
      await axios.post('/api/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword })
      setSuccess(true); setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) { setError(err.response?.data?.error || 'Erreur lors du changement.') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--fg)', marginBottom: 4 }}>Sécurité</h2>
        <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>Modifier votre mot de passe</p>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-card)', padding: 24, maxWidth: 460 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labSt}>Mot de passe actuel</label>
            <input type="password" value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })} placeholder="Votre mot de passe actuel" style={inSt} />
          </div>
          <div>
            <label style={labSt}>Nouveau mot de passe</label>
            <input type="password" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} placeholder="Min. 8 caractères" style={inSt} />
            {form.newPassword && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {reqs.map(({ label, ok }) => (
                  <span key={label} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: ok ? 'var(--accent-soft)' : 'var(--border)', color: ok ? 'var(--accent)' : 'var(--fg-3)', border: '1px solid ' + (ok ? 'var(--accent)' : 'var(--border-2)') }}>
                    {ok ? '✓' : '○'} {label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={labSt}>Confirmer le nouveau mot de passe</label>
            <input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Répéter le nouveau mot de passe"
              style={{ ...inSt, borderColor: form.confirmPassword && form.newPassword !== form.confirmPassword ? '#EF4444' : undefined }} />
            {form.confirmPassword && form.newPassword !== form.confirmPassword && (
              <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>Les mots de passe ne correspondent pas</div>
            )}
          </div>
          {error   && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 8 }}><Icon d={icons.alert} size={14} color="#EF4444" />{error}</div>}
          {success && <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon d={icons.check} size={14} color="var(--accent)" />Mot de passe modifié avec succès</div>}
          <button onClick={handleSubmit} disabled={saving} style={{ background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 'var(--r-input)', padding: '11px 20px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, opacity: saving ? 0.7 : 1, alignSelf: 'flex-start' }}>
            {saving ? 'Changement…' : 'Modifier le mot de passe'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Section Utilisateurs ──────────────────────────────────────────
const inSt  = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-input)', padding: '10px 14px', color: 'var(--fg)', fontSize: 13, outline: 'none' }
const labSt = { fontSize: 10, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6, display: 'block', fontFamily: 'var(--font-mono)' }
const ghostBtn = { background: 'var(--border)', border: '1px solid var(--border-2)', color: 'var(--fg-3)', borderRadius: 'var(--r-input)', padding: '9px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }
const primBtn  = { background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 'var(--r-input)', padding: '10px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }

function RoleBadge({ role }) {
  const cfg = ROLES[role] || ROLES.technicien
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.color + '18', border: '1px solid ' + cfg.color + '40', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: .5 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color }} />{cfg.label}
    </span>
  )
}

function UserRow({ u, currentUser, onEdit, onToggle }) {
  const [hover, setHover] = useState(false)
  const isMe = u.id === currentUser?.id
  const roleColor = (ROLES[u.role] || ROLES.technicien).color
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? 'var(--surface-elev)' : 'var(--surface)', border: '1px solid ' + (hover ? roleColor + '35' : 'var(--border-2)'), borderLeft: '3px solid ' + roleColor, borderRadius: 'var(--r-card)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, opacity: u.actif ? 1 : 0.55, transition: 'all .15s', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: `linear-gradient(135deg,${roleColor},${roleColor}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)', flexShrink: 0, boxShadow: `0 4px 14px ${roleColor}40` }}>
          {u.prenom?.[0]}{u.nom?.[0]}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{u.prenom} {u.nom}</span>
            <RoleBadge role={u.role} />
            {isMe && <span style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: 20, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Vous</span>}
            {!u.actif && <span style={{ fontSize: 10, color: 'var(--fg-3)', background: 'var(--border)', padding: '2px 8px', borderRadius: 20, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Désactivé</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--fg-3)', flexWrap: 'wrap' }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>{u.email}</span>
            {u.poste && <><span style={{ color: 'var(--fg-mute)' }}>•</span><span>{u.poste}</span></>}
            {u.last_login && <><span style={{ color: 'var(--fg-mute)' }}>•</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-mute)' }}>vu {fmtLastLogin(u.last_login)}</span></>}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {(currentUser?.role === 'admin' || isMe) && (
          <button onClick={onEdit} style={{ ...ghostBtn, padding: '7px 12px', fontSize: 12 }}>
            <Icon d={icons.edit} size={13} />{isMe ? 'Mon profil' : 'Modifier'}
          </button>
        )}
        {currentUser?.role === 'admin' && !isMe && (
          <button onClick={onToggle} style={{ ...ghostBtn, padding: '7px 12px', fontSize: 12, background: u.actif ? 'rgba(239,68,68,0.08)' : 'var(--accent-soft)', borderColor: u.actif ? 'rgba(239,68,68,0.22)' : 'var(--accent)', color: u.actif ? '#EF4444' : 'var(--accent)' }}>
            <Icon d={u.actif ? icons.xmark : icons.check} size={13} color={u.actif ? '#EF4444' : 'var(--accent)'} />
            {u.actif ? 'Désactiver' : 'Réactiver'}
          </button>
        )}
      </div>
    </div>
  )
}

function SectionUtilisateurs({ currentUser }) {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState({ nom: '', prenom: '', email: '', password: '', role: 'technicien', poste: 'Technicien AV' })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    axios.get('/api/users').then(r => setUsers(r.data)).finally(() => setLoading(false))
  }, [])

  const createUser = async () => {
    if (!form.nom || !form.prenom || !form.email || !form.password) { setError('Tous les champs sont requis.'); return }
    if (form.password.length < 8) { setError('Mot de passe : 8 caractères minimum.'); return }
    setSaving(true); setError('')
    try {
      const res = await axios.post('/api/users', form)
      setUsers(prev => [...prev, res.data])
      setForm({ nom: '', prenom: '', email: '', password: '', role: 'technicien', poste: 'Technicien AV' })
      setShowAdd(false)
    } catch (err) { setError(err.response?.data?.error || 'Erreur lors de la création.') }
    finally { setSaving(false) }
  }

  const updateUser = async () => {
    setSaving(true); setError('')
    try {
      const res = await axios.patch('/api/users/' + editUser.id, editForm)
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...res.data } : u))
      setEditUser(null)
    } catch (err) { setError(err.response?.data?.error || 'Erreur.') }
    finally { setSaving(false) }
  }

  const toggleActif = async (u) => {
    try {
      await axios.patch('/api/users/' + u.id, { actif: !u.actif })
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, actif: !x.actif } : x))
    } catch { alert('Erreur.') }
  }

  const chips = [
    { label: 'Total',  value: users.length,                                      color: 'var(--fg)' },
    { label: 'Actifs', value: users.filter(u => u.actif).length,                 color: 'var(--accent)' },
    { label: 'Admin',  value: users.filter(u => u.role === 'admin').length,      color: '#EF4444' },
    { label: 'Chef',   value: users.filter(u => u.role === 'chef').length,       color: '#F59E0B' },
    { label: 'Tech.',  value: users.filter(u => u.role === 'technicien').length, color: '#00D4FF' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--fg)', marginBottom: 4 }}>Utilisateurs</h2>
          <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>Comptes et accès à la plateforme</p>
        </div>
        {currentUser?.role === 'admin' && (
          <button onClick={() => { setShowAdd(v => !v); setError('') }} style={primBtn}>
            <Icon d={showAdd ? icons.xmark : icons.plus} size={14} color="var(--accent-fg)" />
            {showAdd ? 'Fermer' : 'Nouveau compte'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {chips.map(c => (
          <div key={c.label} style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-input)', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }} />
            <span style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600 }}>{c.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg)', fontWeight: 700 }}>{c.value}</span>
          </div>
        ))}
      </div>

      {showAdd && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-card)', padding: 22, marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: 'var(--fg)', marginBottom: 16 }}>Nouveau compte</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {[['Prénom *','prenom','Ex: Marc','text'],['Nom *','nom','Ex: Dupont','text'],['Email *','email','marc@avi.fr','email'],['Mot de passe * (min. 8)','password','••••••••','password']].map(([lbl,key,ph,type]) => (
              <div key={key}><label style={labSt}>{lbl}</label><input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={ph} style={inSt} /></div>
            ))}
            <div><label style={labSt}>Rôle</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={inSt}>
                <option value="technicien">Technicien</option>
                <option value="chef">Chef d'équipe</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <div><label style={labSt}>Poste</label>
              <select value={form.poste} onChange={e => setForm({ ...form, poste: e.target.value })} style={inSt}>
                {['Technicien AV','Technicien réseau','Chef de projet','Commercial','SAV','Autre'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#EF4444' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowAdd(false); setError('') }} style={ghostBtn}>Annuler</button>
            <button onClick={createUser} disabled={saving} style={primBtn}>{saving ? 'Création…' : 'Créer le compte'}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--fg-3)', padding: '40px 0' }}>Chargement…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map(u => (
            <UserRow key={u.id} u={u} currentUser={currentUser}
              onEdit={() => { setEditUser(u); setEditForm({ nom: u.nom, prenom: u.prenom, email: u.email, role: u.role, poste: u.poste }); setError('') }}
              onToggle={() => toggleActif(u)} />
          ))}
        </div>
      )}

      {editUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-card)', padding: 26, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: 'var(--fg)' }}>Modifier le compte</div>
              <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', color: 'var(--fg-3)', cursor: 'pointer' }}><Icon d={icons.xmark} size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={labSt}>Prénom</label><input value={editForm.prenom || ''} onChange={e => setEditForm({ ...editForm, prenom: e.target.value })} style={inSt} /></div>
              <div><label style={labSt}>Nom</label><input value={editForm.nom || ''} onChange={e => setEditForm({ ...editForm, nom: e.target.value })} style={inSt} /></div>
              <div style={{ gridColumn: '1/-1' }}><label style={labSt}>Email</label><input type="email" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} style={inSt} /></div>
              {currentUser?.role === 'admin' && (
                <>
                  <div><label style={labSt}>Rôle</label>
                    <select value={editForm.role || 'technicien'} onChange={e => setEditForm({ ...editForm, role: e.target.value })} style={inSt}>
                      <option value="technicien">Technicien</option>
                      <option value="chef">Chef d'équipe</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>
                  <div><label style={labSt}>Poste</label>
                    <select value={editForm.poste || 'Technicien AV'} onChange={e => setEditForm({ ...editForm, poste: e.target.value })} style={inSt}>
                      {['Technicien AV','Technicien réseau','Chef de projet','Commercial','SAV','Autre'].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#EF4444' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setEditUser(null); setError('') }} style={ghostBtn}>Annuler</button>
              <button onClick={updateUser} disabled={saving} style={primBtn}>{saving ? 'Sauvegarde…' : 'Sauvegarder'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section Clients ───────────────────────────────────────────────
function SectionClients() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--fg)', marginBottom: 4 }}>Clients</h2>
        <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>Répertoire des clients</p>
      </div>
      <ClientsTab />
    </div>
  )
}

// ── Section Catégories ────────────────────────────────────────────
function SectionCategories() {
  const { refresh } = useCategories()
  const [allCats, setAllCats] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [nom, setNom]         = useState('')
  const [ordre, setOrdre]     = useState(0)
  const [couleur, setCouleur] = useState('#10B981')
  const [saving, setSaving]   = useState(false)
  const [editId, setEditId]         = useState(null)
  const [editNom, setEditNom]       = useState('')
  const [editOrdre, setEditOrdre]   = useState(0)
  const [editCouleur, setEditCouleur] = useState('#7b8096')

  const loadAll = () => axios.get('/api/categories?all=true').then(r => setAllCats(r.data)).catch(() => {})
  useEffect(() => { loadAll() }, [])

  const create = async () => {
    if (!nom) return; setSaving(true)
    try { await axios.post('/api/categories', { nom, ordre: parseInt(ordre), couleur }); refresh(); loadAll(); setNom(''); setOrdre(0); setCouleur('#10B981'); setShowAdd(false) }
    catch (err) { alert(err.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }
  const save = async (id) => {
    setSaving(true)
    try { await axios.patch('/api/categories/' + id, { nom: editNom, ordre: parseInt(editOrdre), couleur: editCouleur }); refresh(); loadAll(); setEditId(null) }
    catch (err) { alert(err.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }
  const updateCouleur = async (id, c) => { await axios.patch('/api/categories/' + id, { couleur: c }); refresh(); loadAll() }
  const toggle = async (cat) => { await axios.patch('/api/categories/' + cat.id, { actif: !cat.actif }); refresh(); loadAll() }
  const toggleReseau = async (cat) => { await axios.patch('/api/categories/' + cat.id, { reseau_actif: !(cat.reseau_actif !== false) }); refresh(); loadAll() }
  const remove = async (id, n) => { if (!window.confirm(`Supprimer "${n}" ?`)) return; await axios.delete('/api/categories/' + id); refresh(); loadAll() }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--fg)', marginBottom: 4 }}>Catégories</h2>
          <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>Types d'équipements disponibles dans les salles</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ ...primBtn, fontSize: 12, padding: '9px 16px' }}>
          <Icon d={icons.plus} size={13} color="var(--accent-fg)" /> Nouvelle
        </button>
      </div>
      {showAdd && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-card)', padding: 20, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--fg)', marginBottom: 14 }}>Nouvelle catégorie</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 54px 80px', gap: 10, marginBottom: 14 }}>
            <div><label style={labSt}>Nom *</label><input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Écran LED" style={inSt} /></div>
            <div><label style={labSt}>Couleur</label><input type="color" value={couleur} onChange={e => setCouleur(e.target.value)} style={{ width: '100%', height: 38, border: '1px solid var(--border-2)', borderRadius: 'var(--r-input)', background: 'var(--bg)', cursor: 'pointer', padding: 2 }} /></div>
            <div><label style={labSt}>Ordre</label><input type="number" value={ordre} onChange={e => setOrdre(e.target.value)} style={inSt} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAdd(false)} style={ghostBtn}>Annuler</button>
            <button onClick={create} disabled={saving} style={primBtn}>{saving ? 'Ajout…' : 'Ajouter'}</button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {allCats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--fg-3)', fontSize: 13, border: '1px dashed var(--border-2)', borderRadius: 'var(--r-card)' }}>Aucune catégorie — créez-en une ci-dessus</div>
        ) : allCats.map(cat => (
          <div key={cat.id} style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-card)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: cat.actif ? 1 : 0.55 }}>
            <label title="Changer la couleur" style={{ cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: (cat.couleur || '#7b8096') + '22', border: '2px solid ' + (cat.couleur || '#7b8096') }}>
                <input type="color" value={cat.couleur || '#7b8096'} onChange={e => updateCouleur(cat.id, e.target.value)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }} />
              </div>
            </label>
            {editId === cat.id ? (
              <>
                <input value={editNom} onChange={e => setEditNom(e.target.value)} style={{ ...inSt, flex: 1 }} />
                <input type="number" value={editOrdre} onChange={e => setEditOrdre(e.target.value)} style={{ ...inSt, width: 65, flexShrink: 0 }} />
                <button onClick={() => save(cat.id)} disabled={saving} style={{ ...primBtn, padding: '7px 14px', fontSize: 12 }}>{saving ? '…' : 'OK'}</button>
                <button onClick={() => setEditId(null)} style={{ ...ghostBtn, padding: '7px 11px', fontSize: 12 }}>✕</button>
              </>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: cat.couleur || 'var(--fg)' }}>{cat.nom}</span>
                  <span style={{ fontSize: 11, color: 'var(--fg-mute)', marginLeft: 10, fontFamily: 'var(--font-mono)' }}>ordre {cat.ordre}</span>
                  {!cat.actif && <span style={{ fontSize: 11, color: '#EF4444', marginLeft: 8 }}>désactivée</span>}
                </div>
                <button onClick={() => { setEditId(cat.id); setEditNom(cat.nom); setEditOrdre(cat.ordre); setEditCouleur(cat.couleur) }} style={{ ...ghostBtn, padding: '6px 11px', fontSize: 12 }}>✏️</button>
                <button onClick={() => toggleReseau(cat)} title={cat.reseau_actif !== false ? 'Désactiver champs réseau' : 'Activer champs réseau'}
                  style={{ ...ghostBtn, padding: '6px 11px', fontSize: 11, fontWeight: 600, background: cat.reseau_actif !== false ? 'rgba(6,182,212,0.1)' : 'rgba(107,114,128,0.1)', borderColor: cat.reseau_actif !== false ? 'rgba(6,182,212,0.3)' : 'rgba(107,114,128,0.2)', color: cat.reseau_actif !== false ? '#06B6D4' : '#6B7280' }}>
                  {cat.reseau_actif !== false ? '🌐' : '🚫'}
                </button>
                <button onClick={() => toggle(cat)} style={{ ...ghostBtn, padding: '6px 11px', fontSize: 11, fontWeight: 600, background: cat.actif ? 'rgba(245,158,11,0.1)' : 'var(--accent-soft)', borderColor: cat.actif ? 'rgba(245,158,11,0.25)' : 'var(--accent)', color: cat.actif ? '#F59E0B' : 'var(--accent)' }}>{cat.actif ? 'Désactiver' : 'Activer'}</button>
                <button onClick={() => remove(cat.id, cat.nom)} style={{ ...ghostBtn, padding: '6px 11px', fontSize: 12, background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)', color: '#EF4444' }}>🗑️</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Section Marques ───────────────────────────────────────────────
function SectionMarques() {
  const [marques, setMarques]     = useState([])
  const [newMarque, setNewMarque] = useState('')
  const [saving, setSaving]       = useState(false)
  const [detectMsg, setDetectMsg] = useState('')

  useEffect(() => { axios.get('/api/marques').then(r => setMarques(r.data)).catch(() => {}) }, [])

  const add = async () => {
    if (!newMarque.trim()) return; setSaving(true)
    try {
      const res = await axios.post('/api/marques', { nom: newMarque.trim() })
      setMarques(prev => [...prev.filter(m => m.nom !== res.data.nom), res.data].sort((a, b) => a.nom.localeCompare(b.nom)))
      setNewMarque('')
    } catch (err) { alert(err.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }

  const del = async (id, nom) => {
    if (!window.confirm(`Supprimer "${nom}" ?`)) return
    try { await axios.delete('/api/marques/' + id); setMarques(prev => prev.filter(m => m.id !== id)) }
    catch { alert('Erreur lors de la suppression.') }
  }

  const autoDetect = async () => {
    setDetectMsg(''); setSaving(true)
    try { const r = await axios.post('/api/marques/auto-detect'); setDetectMsg('✅ ' + r.data.message) }
    catch (err) { setDetectMsg('❌ ' + (err.response?.data?.error || 'Erreur')) }
    finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--fg)', marginBottom: 4 }}>Marques</h2>
        <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>Fabricants d'équipements AV</p>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={newMarque} onChange={e => setNewMarque(e.target.value)} placeholder="Nouvelle marque (ex: Samsung, QSC, Extron…)" onKeyDown={e => e.key === 'Enter' && add()} style={{ ...inSt, flex: 1 }} />
        <button onClick={add} disabled={saving} style={primBtn}><Icon d={icons.plus} size={14} color="var(--accent-fg)" /> Ajouter</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--font-mono)' }}>
          Marques enregistrées ({marques.length})
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {detectMsg && <span style={{ fontSize: 12, color: detectMsg.startsWith('✅') ? 'var(--accent)' : '#EF4444' }}>{detectMsg}</span>}
          <button onClick={autoDetect} disabled={saving} style={{ ...ghostBtn, fontSize: 12, padding: '7px 14px' }}>Détecter dans produits existants</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {marques.map(m => (
          <div key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 20, padding: '5px 12px' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{m.nom}</span>
            <button onClick={() => del(m.id, m.nom)} style={{ background: 'none', border: 'none', color: 'var(--fg-3)', cursor: 'pointer', lineHeight: 1, padding: '0 2px', fontSize: 14 }}>✕</button>
          </div>
        ))}
        {marques.length === 0 && <div style={{ color: 'var(--fg-3)', fontSize: 13, padding: '16px 0' }}>Aucune marque. Ajoutez-en ou utilisez "Détecter".</div>}
      </div>
    </div>
  )
}

// ── Section Sauvegardes ───────────────────────────────────────────
function SectionSauvegardes({ user }) {
  const [backups, setBackups]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [msg, setMsg]             = useState(null)
  const fileRef = useRef()
  const isAdmin = user?.role === 'admin'

  const fmt = {
    size: b => b < 1024 ? b + ' o' : b < 1048576 ? (b / 1024).toFixed(1) + ' Ko' : (b / 1048576).toFixed(2) + ' Mo',
    date: iso => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  }
  const fetchBackups = async () => {
    setLoading(true)
    try { const r = await axios.get('/api/backup/list'); setBackups(r.data) }
    catch { setMsg({ type: 'error', text: 'Impossible de charger les sauvegardes.' }) }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchBackups() }, [])

  const handleCreate = async () => {
    setCreating(true); setMsg(null)
    try { const r = await axios.post('/api/backup/create'); setMsg({ type: 'success', text: `Sauvegarde créée : ${r.data.filename}` }); await fetchBackups() }
    catch { setMsg({ type: 'error', text: 'Erreur lors de la création.' }) }
    finally { setCreating(false) }
  }
  const handleDownload = async (filename) => {
    const token = localStorage.getItem('avtrack_token')
    try {
      const res = await fetch(`/api/backup/download/${filename}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
    } catch { setMsg({ type: 'error', text: 'Erreur lors du téléchargement.' }) }
  }
  const handleDelete = async (filename) => {
    if (!window.confirm(`Supprimer "${filename}" ?`)) return
    try { await axios.delete(`/api/backup/${filename}`); setMsg({ type: 'success', text: 'Sauvegarde supprimée.' }); await fetchBackups() }
    catch { setMsg({ type: 'error', text: 'Erreur lors de la suppression.' }) }
  }
  const handleRestore = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    if (!window.confirm(`Importer "${file.name}" ?\n\nLes chantiers seront ajoutés à la base existante.`)) { fileRef.current.value = ''; return }
    setRestoring(true); setMsg(null)
    try { const form = new FormData(); form.append('backup', file); const r = await axios.post('/api/backup/restore', form); setMsg({ type: 'success', text: r.data.message }) }
    catch (err) { setMsg({ type: 'error', text: err.response?.data?.error || 'Erreur.' }) }
    finally { setRestoring(false); fileRef.current.value = '' }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--fg)', marginBottom: 4 }}>Sauvegardes</h2>
          <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>Sauvegarde automatique chaque jour à 2h</p>
        </div>
        <button onClick={handleCreate} disabled={creating} style={{ ...primBtn, fontSize: 12, padding: '9px 16px', opacity: creating ? 0.7 : 1, cursor: creating ? 'not-allowed' : 'pointer' }}>
          <Icon d={icons.save} size={13} color="var(--accent-fg)" />{creating ? 'En cours…' : 'Créer'}
        </button>
      </div>
      {msg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 'var(--r-input)', marginBottom: 16, background: msg.type === 'success' ? 'var(--accent-soft)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'var(--accent)' : 'rgba(239,68,68,0.25)'}`, color: msg.type === 'success' ? 'var(--accent)' : '#EF4444', fontSize: 13 }}>
          <Icon d={msg.type === 'success' ? icons.check : icons.alert} size={14} color={msg.type === 'success' ? 'var(--accent)' : '#EF4444'} />{msg.text}
        </div>
      )}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-card)', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon d={icons.database} size={14} color="var(--accent)" /> Disponibles
            {!loading && <span style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{backups.length}</span>}
          </div>
          <button onClick={fetchBackups} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <Icon d={icons.refresh} size={13} /> Actualiser
          </button>
        </div>
        {loading ? <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--fg-3)', fontSize: 13 }}>Chargement…</div>
          : backups.length === 0 ? <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--fg-3)', fontSize: 13 }}>Aucune sauvegarde.<br /><span style={{ fontSize: 12, color: 'var(--fg-mute)' }}>La première sauvegarde automatique sera créée cette nuit.</span></div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {backups.map(b => (
                <div key={b.filename} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
                  <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, background: b.auto ? 'rgba(99,102,241,0.12)' : 'var(--accent-soft)', color: b.auto ? '#6366F1' : 'var(--accent)', border: `1px solid ${b.auto ? '#6366F130' : 'var(--accent)'}`, flexShrink: 0 }}>{b.auto ? 'Auto' : 'Manuel'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.filename}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{fmt.date(b.mtime)} — {fmt.size(b.size)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handleDownload(b.filename)} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#6366F1', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Icon d={icons.download} size={12} color="#6366F1" /> Télécharger
                    </button>
                    {isAdmin && <button onClick={() => handleDelete(b.filename)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: 6, padding: '5px 9px', cursor: 'pointer' }}><Icon d={icons.trash} size={12} color="#EF4444" /></button>}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
      {isAdmin && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-card)', padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>Injecter une sauvegarde</div>
          <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 14 }}>Sélectionnez un fichier <code style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>.json</code> AVTrack Pro. Les chantiers seront ajoutés sans supprimer les données existantes.</div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 'var(--r-input)', cursor: 'pointer', background: 'rgba(245,158,11,0.08)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)', fontSize: 13, fontWeight: 600, opacity: restoring ? .6 : 1, pointerEvents: restoring ? 'none' : 'auto' }}>
            <Icon d={icons.upload} size={14} color="#F59E0B" />{restoring ? 'Import en cours…' : 'Choisir un fichier .json'}
            <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleRestore} disabled={restoring} />
          </label>
        </div>
      )}
    </div>
  )
}

// ── Section Email ─────────────────────────────────────────────────
function SectionEmail() {
  const [settings, setSettings] = useState({})
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  useEffect(() => { axios.get('/api/settings').then(r => setSettings(r.data)).catch(() => {}) }, [])

  const save = async () => {
    setSaving(true); setMsg('')
    try { await axios.patch('/api/settings', settings); setMsg('✅ Paramètres sauvegardés.') }
    catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Erreur.')) }
    finally { setSaving(false) }
  }
  const test = async () => {
    setSaving(true); setMsg('')
    try { const r = await axios.post('/api/settings/test-email'); setMsg('✅ ' + r.data.message) }
    catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Erreur envoi.')) }
    finally { setSaving(false) }
  }

  const field = (label, key, type = 'text', placeholder = '') => (
    <div>
      <label style={labSt}>{label}</label>
      <input type={type} value={settings[key] || ''} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} placeholder={placeholder} style={inSt} />
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--fg)', marginBottom: 4 }}>Notifications email</h2>
        <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>Configuration SMTP pour l'envoi d'emails</p>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-card)', padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>Destinataires</div>
        <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 14 }}>Adresse à laquelle les BL signés sont envoyés, et URL de l'application.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {field('Email ADV (destinataire)', 'adv_email', 'email', 'adv@entreprise.fr')}
          {field("URL de l'application", 'app_url', 'text', 'https://avtrack.votredomaine.fr')}
        </div>
        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 22px' }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>Configuration SMTP</div>
        <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 14 }}>Serveur de messagerie utilisé pour envoyer les emails.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {field('Serveur SMTP', 'smtp_host', 'text', 'smtp.gmail.com')}
          {field('Port SMTP', 'smtp_port', 'text', '587')}
          {field('Utilisateur SMTP', 'smtp_user', 'text', 'votre@email.com')}
          {field('Mot de passe SMTP', 'smtp_pass', 'password', '••••••••')}
          {field('Email expéditeur (optionnel)', 'smtp_from', 'text', 'avtrack@entreprise.fr')}
          <div>
            <label style={labSt}>Sécurité</label>
            <div onClick={() => setSettings(s => ({ ...s, smtp_secure: s.smtp_secure === 'true' ? 'false' : 'true' }))}
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg)', borderRadius: 'var(--r-input)', border: '1px solid var(--border-2)', padding: '10px 14px', cursor: 'pointer', height: 42, boxSizing: 'border-box' }}>
              <div style={{ width: 36, height: 20, borderRadius: 99, background: settings.smtp_secure === 'true' ? 'var(--accent)' : 'var(--border-strong)', position: 'relative', transition: '.15s', flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--accent-fg)', position: 'absolute', top: 3, left: settings.smtp_secure === 'true' ? 19 : 3, transition: '.15s' }} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--fg)' }}>SSL/TLS (port 465)</span>
            </div>
          </div>
        </div>
        {msg && (
          <div style={{ background: msg.startsWith('✅') ? 'var(--accent-soft)' : 'rgba(239,68,68,0.1)', border: '1px solid ' + (msg.startsWith('✅') ? 'var(--accent)' : 'rgba(239,68,68,0.3)'), borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: msg.startsWith('✅') ? 'var(--accent)' : '#EF4444' }}>{msg}</div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={test} disabled={saving} style={ghostBtn}><Icon d={icons.send} size={13} /> Test email</button>
          <button onClick={save} disabled={saving} style={primBtn}><Icon d={icons.save} size={13} color="var(--accent-fg)" />{saving ? 'Sauvegarde…' : 'Sauvegarder'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Section Warevia ───────────────────────────────────────────────
function SectionWarevia() {
  const [cfg, setCfg]     = useState({ warevia_url: '', warevia_token: '' })
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [msg, setMsg]       = useState('')

  useEffect(() => {
    axios.get('/api/settings').then(r => {
      setCfg({ warevia_url: r.data.warevia_url || '', warevia_token: r.data.warevia_token || '' })
    }).catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true); setMsg(''); setStatus(null)
    try {
      await axios.patch('/api/settings', cfg)
      setMsg('✅ Configuration sauvegardée.')
    } catch { setMsg('❌ Erreur lors de la sauvegarde.') }
    finally { setSaving(false) }
  }

  const test = async () => {
    setSaving(true); setStatus(null); setMsg('')
    try {
      const r = await axios.get('/api/warevia/status')
      setStatus(r.data)
    } catch { setStatus({ ok: false, reason: 'Erreur réseau' }) }
    finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--fg)', marginBottom: 4 }}>Intégration Warevia</h2>
        <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>Connectez AVTrack à votre stock Warevia pour suggérer des fournitures</p>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-card)', padding: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={labSt}>URL du serveur Warevia</label>
            <input value={cfg.warevia_url} onChange={e => setCfg(c => ({ ...c, warevia_url: e.target.value }))}
              placeholder="http://192.168.1.x:5000" style={inSt} />
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 4 }}>Adresse IP locale du conteneur Warevia sur Proxmox</div>
          </div>
          <div>
            <label style={labSt}>Token API Warevia</label>
            <input value={cfg.warevia_token} onChange={e => setCfg(c => ({ ...c, warevia_token: e.target.value }))}
              placeholder="Token défini dans WAREVIA_API_TOKEN" style={inSt} />
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 4 }}>Doit correspondre à la variable d'env <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>WAREVIA_API_TOKEN</code> sur le serveur Warevia</div>
          </div>
        </div>

        {status && (
          <div style={{ background: status.ok ? 'var(--accent-soft)' : 'rgba(239,68,68,0.1)', border: '1px solid ' + (status.ok ? 'var(--accent)' : 'rgba(239,68,68,0.3)'), borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: status.ok ? 'var(--accent)' : '#EF4444' }}>
            {status.ok ? `✅ Connexion OK — ${status.nb_produits} produit(s) dans le stock` : `❌ Connexion échouée : ${status.reason}`}
          </div>
        )}
        {msg && (
          <div style={{ background: msg.startsWith('✅') ? 'var(--accent-soft)' : 'rgba(239,68,68,0.1)', border: '1px solid ' + (msg.startsWith('✅') ? 'var(--accent)' : 'rgba(239,68,68,0.3)'), borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: msg.startsWith('✅') ? 'var(--accent)' : '#EF4444' }}>{msg}</div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={test} disabled={saving} style={ghostBtn}>Tester la connexion</button>
          <button onClick={save} disabled={saving} style={primBtn}>
            <Icon d={icons.save} size={13} color="var(--accent-fg)" />{saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────
export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const location = useLocation()
  const [section, setSection] = useState(location.state?.section || 'apparence')

  const isAdmin       = user?.role === 'admin'
  const isAdminOrChef = user?.role === 'admin' || user?.role === 'chef'

  const navGroups = [
    {
      label: 'Préférences',
      items: [
        { id: 'apparence',     label: 'Apparence',     icon: icons.palette },
        { id: 'notifications', label: 'Notifications', icon: icons.bell    },
      ],
    },
    {
      label: 'Compte',
      items: [
        { id: 'profil',   label: 'Profil',   icon: icons.user },
        { id: 'securite', label: 'Sécurité', icon: icons.lock },
      ],
    },
    ...(isAdminOrChef ? [{
      label: 'Administration',
      items: [
        { id: 'utilisateurs', label: 'Utilisateurs', icon: icons.users    },
        { id: 'clients',      label: 'Clients',      icon: icons.building },
        { id: 'categories',   label: 'Catégories',   icon: icons.tag      },
        { id: 'marques',      label: 'Marques',      icon: icons.box      },
        { id: 'sauvegardes',  label: 'Sauvegardes',  icon: icons.save     },
        ...(isAdmin ? [
          { id: 'email',    label: 'Email SMTP', icon: icons.mail    },
          { id: 'warevia',  label: 'Warevia',    icon: icons.box     },
        ] : []),
      ],
    }] : []),
  ]

  return (
    <Layout chantiers={[]}>
      <div style={{ display: 'flex', margin: '-28px -24px', minHeight: 'calc(100vh - 56px)', background: 'var(--bg)' }}>

        {/* Sub-nav */}
        <div style={{ width: 216, background: 'var(--surface-low)', borderRight: '1px solid var(--border-2)', padding: '24px 10px', flexShrink: 0 }}>
          {navGroups.map(group => (
            <div key={group.label} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-mute)', textTransform: 'uppercase', letterSpacing: 1.5, padding: '0 10px', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
                {group.label}
              </div>
              {group.items.map(item => {
                const active = section === item.id
                return (
                  <div key={item.id} onClick={() => setSection(item.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--fg)' : 'var(--fg-3)', background: active ? 'var(--border-2)' : 'transparent', transition: 'all .15s', marginBottom: 1 }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--border)' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                    <Icon d={item.icon} size={15} color={active ? 'var(--accent)' : 'var(--fg-3)'} />
                    {item.label}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '32px 36px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {section === 'apparence'     && <SectionApparence theme={theme} setTheme={setTheme} />}
            {section === 'notifications' && <SectionNotifications />}
            {section === 'profil'        && <SectionProfil user={user} />}
            {section === 'securite'      && <SectionSecurite user={user} />}
            {section === 'utilisateurs'  && <SectionUtilisateurs currentUser={user} />}
            {section === 'clients'       && <SectionClients />}
            {section === 'categories'    && <SectionCategories />}
            {section === 'marques'       && <SectionMarques />}
            {section === 'sauvegardes'   && <SectionSauvegardes user={user} />}
            {section === 'email'         && <SectionEmail />}
            {section === 'warevia'       && <SectionWarevia />}
          </div>
        </div>
      </div>
    </Layout>
  )
}
