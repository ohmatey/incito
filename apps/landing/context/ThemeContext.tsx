'use client'

import { createContext, useContext, useEffect } from 'react'

interface ThemeContextValue {
  theme: 'dark'
  resolvedTheme: 'dark'
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Always use dark mode
    const root = window.document.documentElement
    root.classList.remove('light')
    root.classList.add('dark')
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: 'dark', resolvedTheme: 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
