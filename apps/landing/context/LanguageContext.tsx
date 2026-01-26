'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Language, DEFAULT_LANGUAGE, LANGUAGES, getTranslations, TranslationKey } from '@/i18n'

const STORAGE_KEY = 'incito-landing-language'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: TranslationKey
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Load saved language from localStorage
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null
    if (saved && LANGUAGES.some(l => l.code === saved)) {
      setLanguageState(saved)
    } else {
      // Try to detect browser language
      const browserLang = navigator.language.split('-')[0] as Language
      if (LANGUAGES.some(l => l.code === browserLang)) {
        setLanguageState(browserLang)
      }
    }
    setMounted(true)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
  }

  const t = getTranslations(language)

  // Prevent hydration mismatch by rendering default language until mounted
  if (!mounted) {
    return (
      <LanguageContext.Provider value={{ language: DEFAULT_LANGUAGE, setLanguage, t: getTranslations(DEFAULT_LANGUAGE) }}>
        {children}
      </LanguageContext.Provider>
    )
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
