import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function ChangePassword() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('Tous les champs sont requis.')
      return
    }
    if (form.newPassword.length < 8) {
      setError('Nouveau mot de passe : 8 caracteres minimum.')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (form.newPassword === form.currentPassword) {
      setError('Le nouveau mot de passe doit etre different de l\'ancien.')
      return
    }
    setSaving(true)
    try {
      await axios.post('/api/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      })
      await axios.patch('/api/users/' + user.id, { must_change_password: false })
      navigate('/')
      window.location.reload()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du changement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0C0E14', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#13151E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 36 }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: 3, marginBottom: 6 }}>
            <span style={{ color: '#00D4FF' }}>AV</span>
            <span style={{ color: '#fff' }}>TRACK</span>
          </div>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px auto 0', fontSize: 24 }}>
            🔐
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Changement de mot de passe requis</div>
          <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
            Bonjour <strong style={{ color: '#E8EAF0' }}>{user?.prenom}</strong>, pour des raisons de securite vous devez definir votre propre mot de passe avant de continuer.
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6 }}>
            Mot de passe temporaire
          </div>
          <input type="password" value={form.currentPassword}
            onChange={e => setForm({ ...form, currentPassword: e.target.value })}
            placeholder="Votre mot de passe actuel"
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: '#E8EAF0', fontSize: 14, outline: 'none' }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6 }}>
            Nouveau mot de passe
          </div>
          <input type="password" value={form.newPassword}
            onChange={e => setForm({ ...form, newPassword: e.target.value })}
            placeholder="Min. 8 caracteres"
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: '#E8EAF0', fontSize: 14, outline: 'none' }} />
          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { label: '8+ caracteres', ok: form.newPassword.length >= 8 },
              { label: 'Majuscule', ok: /[A-Z]/.test(form.newPassword) },
              { label: 'Chiffre', ok: /[0-9]/.test(form.newPassword) },
            ].map(({ label, ok }) => (
              <span key={label} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)', color: ok ? '#10B981' : '#6B7280', border: '1px solid ' + (ok ? 'rgba(16,185,129,0.2)' : 'rgba(107,114,128,0.2)') }}>
                {ok ? '✓' : '○'} {label}
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6 }}>
            Confirmer le nouveau mot de passe
          </div>
          <input type="password" value={form.confirmPassword}
            onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
            placeholder="Retaper le nouveau mot de passe"
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: '#E8EAF0', fontSize: 14, outline: 'none',
              borderColor: form.confirmPassword && form.newPassword !== form.confirmPassword ? '#EF4444' : 'rgba(255,255,255,0.1)'
            }} />
          {form.confirmPassword && form.newPassword !== form.confirmPassword && (
            <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>Les mots de passe ne correspondent pas</div>
          )}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#EF4444' }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={saving}
          style={{ width: '100%', background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Changement en cours...' : 'Definir mon mot de passe'}
        </button>

        <button onClick={() => { logout(); navigate('/login') }}
          style={{ width: '100%', background: 'none', border: 'none', color: '#6B7280', fontSize: 12, cursor: 'pointer', marginTop: 12, padding: 8 }}>
          Se deconnecter
        </button>
      </div>
    </div>
  )
}
