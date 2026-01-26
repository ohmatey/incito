import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LANGUAGE, NAMESPACES } from './types'

// Import English translations
import enCommon from './locales/en/common.json'
import enSettings from './locales/en/settings.json'
import enPrompts from './locales/en/prompts.json'
import enToasts from './locales/en/toasts.json'
import enTags from './locales/en/tags.json'
import enSearch from './locales/en/search.json'

// Import Thai translations
import thCommon from './locales/th/common.json'
import thSettings from './locales/th/settings.json'
import thPrompts from './locales/th/prompts.json'
import thToasts from './locales/th/toasts.json'
import thTags from './locales/th/tags.json'
import thSearch from './locales/th/search.json'

const resources = {
  en: {
    common: enCommon,
    settings: enSettings,
    prompts: enPrompts,
    toasts: enToasts,
    tags: enTags,
    search: enSearch,
  },
  th: {
    common: thCommon,
    settings: thSettings,
    prompts: thPrompts,
    toasts: thToasts,
    tags: thTags,
    search: thSearch,
  },
}

i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  ns: NAMESPACES,
  defaultNS: 'common',
  interpolation: {
    escapeValue: false, // React already escapes
  },
})

export default i18n
