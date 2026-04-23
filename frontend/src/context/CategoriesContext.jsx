import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const CategoriesContext = createContext([])

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState([])

  const refresh = () => {
    const token = localStorage.getItem('avtrack_token')
    if (!token) return
    axios.get('/api/categories')
      .then(res => setCategories(res.data))
      .catch(() => {})
  }

  useEffect(() => {
    // Attendre que le token soit disponible
    const token = localStorage.getItem('avtrack_token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + token
      refresh()
    }
  }, [])

  return (
    <CategoriesContext.Provider value={{ categories, setCategories, refresh }}>
      {children}
    </CategoriesContext.Provider>
  )
}

export const useCategories = () => useContext(CategoriesContext)
