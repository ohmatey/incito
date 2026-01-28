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
import enTranslation from './locales/en/translation.json'
import enAgents from './locales/en/agents.json'
import enRunMode from './locales/en/runMode.json'
import enResources from './locales/en/resources.json'
import enRuns from './locales/en/runs.json'
import enUpdates from './locales/en/updates.json'

// Import Thai translations
import thCommon from './locales/th/common.json'
import thSettings from './locales/th/settings.json'
import thPrompts from './locales/th/prompts.json'
import thToasts from './locales/th/toasts.json'
import thTags from './locales/th/tags.json'
import thSearch from './locales/th/search.json'
import thTranslation from './locales/th/translation.json'
import thAgents from './locales/th/agents.json'
import thRunMode from './locales/th/runMode.json'
import thResources from './locales/th/resources.json'
import thRuns from './locales/th/runs.json'
import thUpdates from './locales/th/updates.json'

const resources = {
  en: {
    common: enCommon,
    settings: enSettings,
    prompts: enPrompts,
    toasts: enToasts,
    tags: enTags,
    search: enSearch,
    translation: enTranslation,
    agents: enAgents,
    runMode: enRunMode,
    resources: enResources,
    runs: enRuns,
    updates: enUpdates,
  },
  th: {
    common: thCommon,
    settings: thSettings,
    prompts: thPrompts,
    toasts: thToasts,
    tags: thTags,
    search: thSearch,
    translation: thTranslation,
    agents: thAgents,
    runMode: thRunMode,
    resources: thResources,
    runs: thRuns,
    updates: thUpdates,
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
