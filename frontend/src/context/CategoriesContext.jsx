import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from './AuthContext'

const CategoriesContext = createContext([])

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState([])
  const { token } = useAuth()

  const refresh = () => {
    if (!token) return
    axios.get('/api/categories', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCategories(res.data))
      .catch(() => {})
  }

  useEffect(() => {
    if (!token) return
    axios.get('/api/categories', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCategories(res.data))
      .catch(() => {})
  }, [token])

  return (
    <CategoriesContext.Provider value={{ categories, setCategories, refresh }}>
      {children}
    </CategoriesContext.Provider>
  )
}

export const useCategories = () => useContext(CategoriesContext)
