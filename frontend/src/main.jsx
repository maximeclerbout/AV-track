import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CategoriesProvider } from './context/CategoriesContext'
import { ThemeProvider } from './context/ThemeContext'
import App from './App.jsx'
import './index.css'

function Root() {
  const { user } = useAuth()
  return (
    <ThemeProvider user={user}>
      <CategoriesProvider>
        <App />
      </CategoriesProvider>
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
