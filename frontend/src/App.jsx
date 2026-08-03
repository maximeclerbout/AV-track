import ImportXML from './pages/ImportXML'
import ImportPDF from './pages/ImportPDF'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Chantiers from './pages/Chantiers'
import Chantier from './pages/Chantier'
import Salle from './pages/Salle'
import ChangePassword from './pages/ChangePassword'
import Settings from './pages/Settings'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, letterSpacing: 3, marginBottom: 12 }}>
          <span style={{ color: 'var(--accent)' }}>AV</span>
          <span style={{ color: 'var(--fg)' }}>TRACK</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Chargement...</div>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" />
  if (user.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/chantiers" element={<PrivateRoute><Chantiers /></PrivateRoute>} />
      <Route path="/chantiers/:id" element={<PrivateRoute><Chantier /></PrivateRoute>} />
      <Route path="/chantiers/:cid/salles/:sid" element={<PrivateRoute><Salle /></PrivateRoute>} />
      <Route path="/utilisateurs" element={<Navigate to="/parametres" replace />} />
      <Route path="/categories" element={<Navigate to="/parametres" replace />} />
      <Route path="*" element={<Navigate to="/" />} />
      <Route path="/import-pdf" element={<PrivateRoute><ImportPDF /></PrivateRoute>} />
      <Route path="/chantiers/:id/import-pdf" element={<PrivateRoute><ImportPDF /></PrivateRoute>} />
      <Route path="/import-xml" element={<PrivateRoute><ImportXML /></PrivateRoute>} />
      <Route path="/backup" element={<Navigate to="/parametres" replace />} />
      <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
      <Route path="/apparence" element={<Navigate to="/parametres" replace />} />
      <Route path="/parametres" element={<PrivateRoute><Settings /></PrivateRoute>} />
    </Routes>
  )
}
