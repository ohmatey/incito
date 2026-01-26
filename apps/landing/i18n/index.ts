import en from './locales/en.json'
import th from './locales/th.json'
import { Language, DEFAULT_LANGUAGE } from './types'

export type { Language }
export { LANGUAGES, DEFAULT_LANGUAGE } from './types'

const translations = {
  en,
  th,
} as const

export type TranslationKey = typeof en

export function getTranslations(language: Language): TranslationKey {
  return translations[language] || translations[DEFAULT_LANGUAGE]
}
