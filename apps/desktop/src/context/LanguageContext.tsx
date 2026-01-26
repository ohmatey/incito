import { createContext, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getSetting, saveSetting } from '@/lib/store'
import { type Language, DEFAULT_LANGUAGE, LANGUAGES } from '@/i18n/types'

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  isLoading: boolean
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

const LANGUAGE_SETTING_KEY = 'language'

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation()
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE)
  const [isLoading, setIsLoading] = useState(true)

  // Load language from SQLite on mount
  useEffect(() => {
    async function loadLanguage() {
      try {
        const result = await getSetting(LANGUAGE_SETTING_KEY)
        if (result.ok && result.data) {
          const storedLang = result.data as Language
          // Validate that it's a valid language
          if (LANGUAGES.some((l) => l.code === storedLang)) {
            setLanguageState(storedLang)
            await i18n.changeLanguage(storedLang)
          }
        }
      } catch (err) {
        console.error('Failed to load language setting:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadLanguage()
  }, [i18n])

  // Update document lang attribute when language changes
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  async function setLanguage(newLanguage: Language) {
    setLanguageState(newLanguage)
    await i18n.changeLanguage(newLanguage)

    // Persist to SQLite
    try {
      await saveSetting(LANGUAGE_SETTING_KEY, newLanguage)
    } catch (err) {
      console.error('Failed to save language setting:', err)
    }
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isLoading }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
