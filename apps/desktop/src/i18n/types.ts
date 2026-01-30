export type Language = 'en' | 'th'

export const LANGUAGES: { code: Language; name: string; nativeName: string; flag: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
]

export const DEFAULT_LANGUAGE: Language = 'en'

// Translation namespace keys
export const NAMESPACES = ['common', 'settings', 'prompts', 'toasts', 'tags', 'search', 'translation', 'agents', 'runMode', 'resources', 'runs', 'updates', 'graders'] as const
export type Namespace = (typeof NAMESPACES)[number]
