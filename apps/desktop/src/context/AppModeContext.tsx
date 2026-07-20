import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { getAppMode, saveAppMode, type AppMode } from '@/lib/store'
import { toast } from 'sonner'

interface AppModeContextValue {
  appMode: AppMode
  isAuthorMode: boolean
  isUseMode: boolean
  setAppMode: (mode: AppMode) => Promise<void>
  toggleAppMode: () => Promise<void>
}

const AppModeContext = createContext<AppModeContextValue | null>(null)

export function useAppMode() {
  const context = useContext(AppModeContext)
  if (!context) {
    throw new Error('useAppMode must be used within AppModeProvider')
  }
  return context
}

interface AppModeProviderProps {
  children: ReactNode
}

export function AppModeProvider({ children }: AppModeProviderProps) {
  // Default to 'use' so non-technical teammates land in the stripped view unaided.
  const [appMode, setAppModeState] = useState<AppMode>('use')

  // Load persisted mode on mount
  useEffect(() => {
    async function loadMode() {
      const result = await getAppMode()
      if (result.ok) {
        setAppModeState(result.data)
      }
    }
    loadMode()
  }, [])

  async function setAppMode(mode: AppMode) {
    const result = await saveAppMode(mode)
    if (result.ok) {
      setAppModeState(mode)
    } else {
      toast.error(result.error)
    }
  }

  async function toggleAppMode() {
    await setAppMode(appMode === 'use' ? 'author' : 'use')
  }

  const value: AppModeContextValue = {
    appMode,
    isAuthorMode: appMode === 'author',
    isUseMode: appMode === 'use',
    setAppMode,
    toggleAppMode,
  }

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>
}
