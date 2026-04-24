import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const icons = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  building: "M3 21V7l9-4 9 4v14M9 21v-6h6v6",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  menu: "M3 12h18M3 6h18M3 18h18",
  xmark: "M18 6L6 18M6 6l12 12",
}

const STATUS_COLORS = {
  en_cours:   '#F59E0B',
  a_faire:    '#7b8096',
  a_terminer: '#6366F1',
  probleme:   '#EF4444',
  termine:    '#10B981',
}

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

function SidebarLinks({ chantiers, user, logout, navigate, location, setMenuOpen, showClose }) {
  const isActive = (path) => location.pathname === path

  const navLinks = [
    { path: '/', icon: icons.grid, label: 'Tableau de bord' },
    { path: '/chantiers', icon: icons.building, label: 'Chantiers' },
  ]
  if (user?.role === 'admin') {
    navLinks.push({ path: '/utilisateurs', icon: icons.users, label: 'Utilisateurs' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 900, letterSpacing: '.04em', lineHeight: 1 }}>
            <span style={{ color: '#10B981' }}>AV</span>
            <span style={{ color: '#fff' }}>TRACK</span>
          </div>
          <div style={{ fontSize: 9, color: '#3d4155', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginTop: 3 }}>Pro Suite</div>
        </div>
        {showClose && (
          <button onClick={() => setMenuOpen(false)}
            style={{ background: 'none', border: 'none', color: '#7b8096', cursor: 'pointer', padding: 4, lineHeight: 1 }}>
            <Icon d={icons.xmark} size={20} />
          </button>
        )}
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, color: '#3d4155', textTransform: 'uppercase', letterSpacing: 1.5, padding: '0 14px', marginBottom: 6 }}>
        Navigation
      </div>

      {navLinks.map(link => (
        <div key={link.path}
          onClick={() => { navigate(link.path); setMenuOpen(false) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500, marginBottom: 2,
            color: isActive(link.path) ? '#10B981' : '#7b8096',
            background: isActive(link.path) ? 'rgba(16,185,129,0.1)' : 'transparent',
            transition: 'all .2s'
          }}>
          <Icon d={link.icon} size={16} color={isActive(link.path) ? '#10B981' : '#7b8096'} />
          {link.label}
        </div>
      ))}

      {chantiers.filter(c => c.statut !== 'termine').length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#3d4155', textTransform: 'uppercase', letterSpacing: 1.5, padding: '12px 14px 6px', marginTop: 8 }}>
            Chantiers actifs
          </div>
          {chantiers.filter(c => c.statut !== 'termine').sort((a, b) => {
            const order = { en_cours: 0, a_faire: 1, a_terminer: 2, probleme: 3 }
            return (order[a.statut] ?? 9) - (order[b.statut] ?? 9)
          }).map(c => {
            const dotColor = STATUS_COLORS[c.statut] || '#7b8096'
            const isActivePath = location.pathname === '/chantiers/' + c.id
            return (
              <div key={c.id}
                onClick={() => { navigate('/chantiers/' + c.id); setMenuOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                  borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 500, marginBottom: 2,
                  color: isActivePath ? '#10B981' : '#7b8096',
                  background: isActivePath ? 'rgba(16,185,129,0.1)' : 'transparent',
                  transition: 'all .2s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: dotColor, boxShadow: `0 0 6px ${dotColor}80` }} />
                {c.nom}
              </div>
            )
          })}
        </>
      )}

      <div style={{ flex: 1 }} />

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#10B981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, color: '#fff' }}>
            {user?.prenom?.[0]}{user?.nom?.[0]}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#eef0f6' }}>{user?.prenom} {user?.nom}</div>
            <div style={{ fontSize: 10, color: '#7b8096', textTransform: 'uppercase', letterSpacing: .5 }}>{user?.role}</div>
          </div>
        </div>
        <div onClick={() => { logout(); navigate('/login') }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
          <Icon d={icons.logout} size={14} color="#EF4444" /> Se déconnecter
        </div>
      </div>
    </div>
  )
}

export default function Layout({ children, chantiers = [] }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const sidebarProps = { chantiers, user, logout, navigate, location, setMenuOpen }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f1117' }}>

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .topbar-logo { display: block !important; }
        }
        @media (min-width: 769px) {
          .mobile-menu-btn { display: none !important; }
          .topbar-logo { display: none !important; }
        }
      `}</style>

      <aside className="desktop-sidebar"
        style={{ width: 220, background: '#13151c', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 16px', position: 'sticky', top: 0, height: '100vh', flexShrink: 0, overflowY: 'auto' }}>
        <SidebarLinks {...sidebarProps} showClose={false} />
      </aside>

      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ width: 260, background: '#13151c', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 16px', height: '100%', overflowY: 'auto', flexShrink: 0 }}>
            <SidebarLinks {...sidebarProps} showClose={true} />
          </div>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.6)' }} onClick={() => setMenuOpen(false)} />
        </div>
      )}

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#13151c', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="mobile-menu-btn"
              onClick={() => setMenuOpen(true)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', color: '#eef0f6', display: 'none' }}>
              <Icon d={icons.menu} size={18} />
            </button>
            <div className="topbar-logo" style={{ display: 'none', fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 900, letterSpacing: '.04em' }}>
              <span style={{ color: '#10B981' }}>AV</span>
              <span style={{ color: '#fff' }}>TRACK</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#10B981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
              {user?.prenom?.[0]}{user?.nom?.[0]}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#eef0f6' }}>{user?.prenom} {user?.nom}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '28px 24px' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
