import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useTheme } from '../context/ThemeContext'

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const icons = {
  check:   "M20 6L9 17l-5-5",
  palette: "M12 2a10 10 0 1 0 0 20 4 4 0 0 0 4-4v-1a2 2 0 0 1 2-2h1a3 3 0 0 0 0-6h-1a10 10 0 0 0-6-7",
  sun:     "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 5a7 7 0 1 0 0 14A7 7 0 0 0 12 5z",
  moon:    "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
}

/* Mini-preview du thème V1 (dark) */
function PreviewV1() {
  return (
    <div style={{ width: '100%', height: 110, borderRadius: 8, overflow: 'hidden', background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace', fontSize: 10, userSelect: 'none' }}>
      <div style={{ background: '#13151c', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#10B981', fontWeight: 900, fontSize: 9 }}>AV</span>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 9 }}>TRACK</span>
        <span style={{ marginLeft: 'auto', color: '#7b8096', fontSize: 8 }}>En cours</span>
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 8, borderRadius: 4, background: '#181b24', width: '70%' }} />
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', width: '50%' }} />
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {['#10B981','#F59E0B','#6366F1'].map(c => (
            <div key={c} style={{ height: 22, flex: 1, borderRadius: 4, background: '#181b24', border: `1px solid ${c}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 14, height: 4, borderRadius: 2, background: c }} />
            </div>
          ))}
        </div>
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', marginTop: 4, overflow: 'hidden' }}>
          <div style={{ width: '60%', height: '100%', background: '#10B981', borderRadius: 99 }} />
        </div>
      </div>
    </div>
  )
}

/* Mini-preview du thème V2 (paper) */
function PreviewV2() {
  return (
    <div style={{ width: '100%', height: 110, borderRadius: 8, overflow: 'hidden', background: '#EDE9E0', border: '1px solid rgba(28,29,43,0.12)', fontFamily: 'monospace', fontSize: 10, userSelect: 'none' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(28,29,43,0.08)', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#E89B2C', fontWeight: 900, fontSize: 9 }}>AV</span>
        <span style={{ color: '#1C1D2B', fontWeight: 900, fontSize: 9 }}>TRACK</span>
        <span style={{ marginLeft: 'auto', color: '#646894', fontSize: 8 }}>En cours</span>
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 8, borderRadius: 4, background: '#fff', width: '70%', border: '1px solid rgba(28,29,43,0.08)' }} />
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(28,29,43,0.06)', width: '50%' }} />
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {['#2EAE7B','#E89B2C','#6B5BD6'].map(c => (
            <div key={c} style={{ height: 22, flex: 1, borderRadius: 4, background: '#fff', border: `1px solid ${c}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 14, height: 4, borderRadius: 2, background: c }} />
            </div>
          ))}
        </div>
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(28,29,43,0.1)', marginTop: 4, overflow: 'hidden' }}>
          <div style={{ width: '60%', height: '100%', background: '#E89B2C', borderRadius: 99 }} />
        </div>
      </div>
    </div>
  )
}

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const [pending, setPending] = useState(null)
  const [saved, setSaved] = useState(false)

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
    await setTheme(pending)
    setPending(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const themeOptions = [
    {
      id: 'v1',
      label: 'Classique',
      sub: 'Fond sombre, accent vert émeraude',
      icon: icons.moon,
      preview: <PreviewV1/>,
    },
    {
      id: 'v2',
      label: 'Spektalis',
      sub: 'Fond paper, accent ambre',
      icon: icons.sun,
      preview: <PreviewV2/>,
    },
  ]

  return (
    <Layout>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Icon d={icons.palette} size={20} color="var(--accent)" />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, color: 'var(--fg)' }}>
              Apparence
            </h1>
          </div>
          <p style={{ color: 'var(--fg-3)', fontSize: 14 }}>Choisissez le thème visuel de l'interface</p>
        </div>

        {/* Sélecteur de thème */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-card)', padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Thème</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {themeOptions.map(opt => {
              const isActive = active === opt.id
              return (
                <div key={opt.id}
                  onClick={() => setPending(opt.id === theme ? null : opt.id)}
                  style={{
                    border: isActive ? '2px solid var(--accent)' : '2px solid var(--border-2)',
                    borderRadius: 'var(--r-card)', padding: 14, cursor: 'pointer',
                    background: isActive ? 'var(--accent-soft)' : 'var(--surface)',
                    transition: 'all .2s', position: 'relative',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border-2)' }}>

                  {isActive && (
                    <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon d={icons.check} size={11} color="var(--accent-fg)" />
                    </div>
                  )}

                  <div style={{ marginBottom: 10 }}>{opt.preview}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon d={opt.icon} size={15} color={isActive ? 'var(--accent)' : 'var(--fg-3)'} />
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

        {/* Info */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-card)', padding: '12px 16px', fontSize: 12, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          Le thème est sauvegardé par compte utilisateur et s'applique sur tous vos appareils.
        </div>

        {/* Save bar */}
        {dirty && (
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-card)', padding: '12px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)', zIndex: 100,
            animation: 'fadein .2s ease'
          }}>
            <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>Aperçu du thème <strong style={{ color: 'var(--fg)' }}>{pending === 'v1' ? 'Classique' : 'Spektalis'}</strong></span>
            <button onClick={() => setPending(null)}
              style={{ background: 'var(--border)', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, color: 'var(--fg-3)', fontWeight: 600 }}>
              Annuler
            </button>
            <button onClick={handleApply}
              style={{ background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 12, color: 'var(--accent-fg)', fontWeight: 700 }}>
              Appliquer
            </button>
          </div>
        )}

        {saved && (
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--accent)', border: 'none',
            borderRadius: 'var(--r-card)', padding: '12px 20px',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)', zIndex: 100,
            animation: 'fadein .2s ease'
          }}>
            <Icon d={icons.check} size={14} color="var(--accent-fg)" />
            <span style={{ fontSize: 13, color: 'var(--accent-fg)', fontWeight: 600 }}>Thème appliqué</span>
          </div>
        )}
      </div>
    </Layout>
  )
}
