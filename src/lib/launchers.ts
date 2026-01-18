export interface Launcher {
  id: string
  name: string
  icon: string
  getUrl: (prompt: string) => string
  supportsDeepLink: boolean
}

export const AVAILABLE_LAUNCHERS: Launcher[] = [
  {
    id: 'claude',
    name: 'Claude',
    icon: '',
    getUrl: (prompt: string) => `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
    supportsDeepLink: true,
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    icon: '',
    getUrl: (prompt: string) => `https://chat.openai.com/?q=${encodeURIComponent(prompt)}`,
    supportsDeepLink: true,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    icon: '',
    getUrl: (prompt: string) => `https://www.perplexity.ai/search/?q=${encodeURIComponent(prompt)}`,
    supportsDeepLink: true,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    icon: '',
    getUrl: () => 'https://gemini.google.com/app',
    supportsDeepLink: false,
  },
]

export function getLauncherById(id: string): Launcher | undefined {
  return AVAILABLE_LAUNCHERS.find((launcher) => launcher.id === id)
}

export function getLaunchersByIds(ids: string[]): Launcher[] {
  return ids
    .map((id) => getLauncherById(id))
    .filter((launcher): launcher is Launcher => launcher !== undefined)
}
