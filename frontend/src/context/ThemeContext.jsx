import { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'

const ThemeContext = createContext()
const THEMES = ['v1', 'v2']

export function ThemeProvider({ children, user }) {
  const [theme, setThemeState] = useState(() => {
    const stored = localStorage.getItem('avtrack-theme')
    return THEMES.includes(stored) ? stored : 'v1'
  })

  useEffect(() => {
    document.documentElement.classList.remove('theme-v1', 'theme-v2')
    document.documentElement.classList.add(`theme-${theme}`)
  }, [theme])

  useEffect(() => {
    if (!user) return
    axios.get('/api/users/me/preferences')
      .then(res => {
        const t = res.data?.theme
        if (THEMES.includes(t)) {
          setThemeState(t)
          localStorage.setItem('avtrack-theme', t)
        }
      })
      .catch(() => {})
  }, [user])

  const setTheme = async (next) => {
    if (!THEMES.includes(next)) return
    setThemeState(next)
    localStorage.setItem('avtrack-theme', next)
    try { await axios.patch('/api/users/me/preferences', { theme: next }) } catch {}
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
