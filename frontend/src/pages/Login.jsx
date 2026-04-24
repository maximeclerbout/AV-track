import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function GridBg() {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}
      xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(16,185,129,0.12)" strokeWidth="1"/>
        </pattern>
        <radialGradient id="fade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0f1117" stopOpacity="0"/>
          <stop offset="100%" stopColor="#0f1117" stopOpacity="1"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)"/>
      <rect width="100%" height="100%" fill="url(#fade)"/>
    </svg>
  )
}

function Nodes() {
  const nodes = [
    { x: '15%', y: '20%', size: 6, delay: 0 },
    { x: '25%', y: '65%', size: 4, delay: 0.8 },
    { x: '60%', y: '15%', size: 5, delay: 1.4 },
    { x: '75%', y: '70%', size: 7, delay: 0.3 },
    { x: '40%', y: '80%', size: 4, delay: 1.8 },
    { x: '85%', y: '35%', size: 5, delay: 0.6 },
    { x: '10%', y: '45%', size: 3, delay: 2.1 },
  ]
  const lines = [
    { x1: '15%', y1: '20%', x2: '25%', y2: '65%' },
    { x1: '25%', y1: '65%', x2: '40%', y2: '80%' },
    { x1: '60%', y1: '15%', x2: '75%', y2: '70%' },
    { x1: '85%', y1: '35%', x2: '75%', y2: '70%' },
  ]
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      xmlns="http://www.w3.org/2000/svg">
      {lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke="rgba(16,185,129,0.2)" strokeWidth="1" strokeDasharray="4 4"/>
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={n.size}
          fill="rgba(16,185,129,0.3)" stroke="rgba(16,185,129,0.7)" strokeWidth="1.5">
          <animate attributeName="opacity" values=".3;.9;.3"
            dur={`${2 + n.delay}s`} repeatCount="indefinite"/>
          <animate attributeName="r" values={`${n.size};${n.size + 2};${n.size}`}
            dur={`${2 + n.delay}s`} repeatCount="indefinite"/>
        </circle>
      ))}
    </svg>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Veuillez remplir tous les champs.'); return }
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Email ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  const inputBase = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
    padding: '13px 16px', color: '#eef0f6', fontSize: 14,
    outline: 'none', transition: 'border .15s, box-shadow .15s',
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <style>{`
        @media (max-width: 768px) { .login-left { display: none !important; } .login-right { width: 100% !important; padding: 32px 24px !important; } }
      `}</style>

      {/* Left panel — brand */}
      <div className="login-left" style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg,#0a0f0d 0%,#0d1a14 50%,#0f1117 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 52px'
      }}>
        <GridBg/>
        <Nodes/>
        <div style={{ position: 'absolute', top: '20%', left: '30%', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(16,185,129,0.12) 0%,transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none' }}/>

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 32, fontWeight: 900, letterSpacing: '.04em', lineHeight: 1, marginBottom: 4 }}>
            <span style={{ color: '#10B981' }}>AV</span>
            <span style={{ color: '#fff' }}>TRACK</span>
          </div>
          <div style={{ fontSize: 10, color: '#3d4155', letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600 }}>Pro Suite · v2.0</div>
        </div>

        {/* Tagline */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 38, fontWeight: 900,
            color: '#fff', lineHeight: 1.1, marginBottom: 16, textShadow: '0 0 60px rgba(16,185,129,0.2)' }}>
            Gérez vos<br/>
            <span style={{ color: '#10B981' }}>déploiements</span><br/>
            AV sans effort.
          </div>
          <div style={{ fontSize: 14, color: '#7b8096', lineHeight: 1.6, maxWidth: 320 }}>
            Suivi en temps réel, gestion des équipements, signatures électroniques — tout en un.
          </div>
        </div>

        {/* Stats row */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 0,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16, overflow: 'hidden' }}>
          {[
            { val: '247', label: 'Chantiers gérés' },
            { val: '12k+', label: 'Équipements trackés' },
            { val: '99.8%', label: 'Disponibilité' },
          ].map((s, i) => (
            <div key={s.label} style={{ flex: 1, padding: '16px 20px',
              borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 24, fontWeight: 900, color: '#10B981', lineHeight: 1, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 11, color: '#7b8096' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="login-right" style={{
        width: 440, background: '#0f1117', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '48px 52px',
        borderLeft: '1px solid rgba(255,255,255,0.07)', flexShrink: 0
      }}>
        <div style={{ width: '100%', animation: 'fadein .4s ease' }}>

          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 26, fontFamily: 'Outfit,sans-serif', fontWeight: 900,
              color: '#eef0f6', marginBottom: 6, letterSpacing: '-.01em' }}>Connexion</div>
            <div style={{ fontSize: 14, color: '#7b8096' }}>Accès réservé aux techniciens AV-Track</div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#7b8096',
                textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'block' }}>
                Email
              </label>
              <input type="email" value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="votre@email.fr"
                style={inputBase}
                onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#7b8096',
                textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'block' }}>
                Mot de passe
              </label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  style={{ ...inputBase, paddingRight: 46 }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none' }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#3d4155', fontSize: 13, padding: 4 }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                fontSize: 13, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚠</span>{error}
              </div>
            )}

            <div style={{ marginBottom: 24 }}/>

            <button type="submit" disabled={loading} style={{
              width: '100%',
              background: loading ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg,#10B981,#059669)',
              color: '#fff', border: 'none', borderRadius: 12,
              padding: '14px', fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all .2s',
              boxShadow: loading ? 'none' : '0 6px 24px rgba(16,185,129,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              letterSpacing: '.01em'
            }}>
              {loading ? (
                <>
                  <svg style={{ animation: 'spin .8s linear infinite' }} width="16" height="16"
                    viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Connexion en cours…
                </>
              ) : 'Se connecter →'}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
