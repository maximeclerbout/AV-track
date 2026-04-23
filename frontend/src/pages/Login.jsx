import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0C0E14', padding: 20
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: '#13151E', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20, padding: 36
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontFamily: "'Syne', sans-serif", fontSize: 32,
            fontWeight: 800, letterSpacing: 3, marginBottom: 6
          }}>
            <span style={{ color: '#00D4FF' }}>AV</span>
            <span style={{ color: '#fff' }}>TRACK</span>
          </div>
          <div style={{ fontSize: 11, color: '#4B5563', letterSpacing: 2, textTransform: 'uppercase' }}>
            Pro Suite
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Connexion</div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>Accès réservé aux techniciens</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: '#6B7280',
              textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6
            }}>Email</div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.fr"
              required
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                padding: '11px 14px', color: '#E8EAF0', fontSize: 14, outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: '#6B7280',
              textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6
            }}>Mot de passe</div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                padding: '11px 14px', color: '#E8EAF0', fontSize: 14, outline: 'none'
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              fontSize: 13, color: '#EF4444'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', background: 'linear-gradient(135deg, #00D4FF, #0099CC)',
              color: '#fff', border: 'none', borderRadius: 10, padding: '12px',
              fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, transition: 'all .2s'
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: 14, background: 'rgba(0,212,255,0.05)', borderRadius: 10, border: '1px solid rgba(0,212,255,0.1)' }}>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6, fontWeight: 600 }}>COMPTES DE TEST</div>
          <div style={{ fontSize: 12, color: '#8B8FA8', lineHeight: 1.8, fontFamily: 'monospace' }}>
            admin@avtrack.local<br />
            marc.dupont@avtrack.local<br />
            <span style={{ color: '#00D4FF' }}>Mot de passe : avtrack2025</span>
          </div>
        </div>
      </div>
    </div>
  )
}
