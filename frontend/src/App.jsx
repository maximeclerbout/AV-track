import ImportXML from './pages/ImportXML'
import ImportPDF from './pages/ImportPDF'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Chantiers from './pages/Chantiers'
import Chantier from './pages/Chantier'
import Salle from './pages/Salle'
import Utilisateurs from './pages/Utilisateurs'
import Categories from './pages/Categories'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0C0E14' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, letterSpacing: 3, marginBottom: 12 }}>
          <span style={{ color: '#00D4FF' }}>AV</span>
          <span style={{ color: '#fff' }}>TRACK</span>
        </div>
        <div style={{ fontSize: 13, color: '#6B7280' }}>Chargement...</div>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/chantiers" element={<PrivateRoute><Chantiers /></PrivateRoute>} />
      <Route path="/chantiers/:id" element={<PrivateRoute><Chantier /></PrivateRoute>} />
      <Route path="/chantiers/:cid/salles/:sid" element={<PrivateRoute><Salle /></PrivateRoute>} />
      <Route path="/utilisateurs" element={<PrivateRoute><Utilisateurs /></PrivateRoute>} />
      <Route path="/categories" element={<PrivateRoute><Categories /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
      <Route path="/import-pdf" element={<PrivateRoute><ImportPDF /></PrivateRoute>} />
      <Route path="/import-xml" element={<PrivateRoute><ImportXML /></PrivateRoute>} />
    </Routes>
  )
}
