export type Language = 'en' | 'th'

export const LANGUAGES: { code: Language; name: string; nativeName: string; flag: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
]

export const DEFAULT_LANGUAGE: Language = 'en'

export interface Translations {
  header: {
    github: string
    download: string
  }
  hero: {
    title: string
    titleHighlight: string
    subtitle: string
    downloadButton: string
    githubButton: string
    screenshotAlt: string
  }
  problem: {
    heading: string
    items: Array<{
      title: string
      description: string
    }>
  }
  howItWorks: {
    heading: string
    steps: Array<{
      step: string
      title: string
      description: string
    }>
  }
  features: {
    heading: string
    items: Array<{
      title: string
      description: string
    }>
  }
  experiments: {
    heading: string
    subheading: string
    items: Array<{
      title: string
      description: string
      benefit: string
    }>
  }
  chromeExtension: {
    heading: string
    subheading: string
    comingSoon: string
  }
  cta: {
    heading: string
    subheading: string
    downloadButton: string
    githubButton: string
    freeForever: string
    comingSoon: string
  }
  footer: {
    builtBy: string
    sourceCode: string
    openSource: string
  }
}
