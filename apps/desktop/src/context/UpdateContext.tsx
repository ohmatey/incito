import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

interface UpdateInfo {
  version: string
  body: string | null
  date: string | null
}

interface UpdateContextValue {
  updateAvailable: UpdateInfo | null
  isChecking: boolean
  isDownloading: boolean
  downloadProgress: number
  error: string | null
  showUpToDate: boolean
  checkForUpdates: () => Promise<void>
  installUpdate: () => Promise<void>
  dismissUpdate: () => void
  dismissUpToDate: () => void
}

const UpdateContext = createContext<UpdateContextValue | null>(null)

export function useUpdate() {
  const context = useContext(UpdateContext)
  if (!context) {
    throw new Error('useUpdate must be used within UpdateProvider')
  }
  return context
}

interface UpdateProviderProps {
  children: ReactNode
}

export function UpdateProvider({ children }: UpdateProviderProps) {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showUpToDate, setShowUpToDate] = useState(false)

  const checkForUpdates = useCallback(async () => {
    if (isChecking) return

    setIsChecking(true)
    setError(null)

    try {
      const result = await invoke<UpdateInfo | null>('check_for_updates')
      if (result) {
        setUpdateAvailable(result)
      }
    } catch (err) {
      // Silently ignore errors during auto-check
      // Only show errors for manual checks
      console.error('Update check failed:', err)
    } finally {
      setIsChecking(false)
    }
  }, [isChecking])

  const checkForUpdatesManual = useCallback(async () => {
    if (isChecking) return

    setIsChecking(true)
    setError(null)
    setShowUpToDate(false)

    try {
      const result = await invoke<UpdateInfo | null>('check_for_updates')
      if (result) {
        setUpdateAvailable(result)
      } else {
        setShowUpToDate(true)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      // If the error is about fetching release data, treat as "up to date"
      // (common during development or before first release)
      if (errorMsg.includes('Could not fetch') || errorMsg.includes('network') || errorMsg.includes('404')) {
        setShowUpToDate(true)
      } else {
        setError(errorMsg)
        setShowUpToDate(true)
      }
    } finally {
      setIsChecking(false)
    }
  }, [isChecking])

  const installUpdate = useCallback(async () => {
    if (isDownloading || !updateAvailable) return

    setIsDownloading(true)
    setDownloadProgress(0)
    setError(null)

    try {
      await invoke('install_update')
      // The app will restart after install
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setIsDownloading(false)
    }
  }, [isDownloading, updateAvailable])

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(null)
    setError(null)
  }, [])

  const dismissUpToDate = useCallback(() => {
    setShowUpToDate(false)
  }, [])

  // Use ref to store the latest check function to avoid recreating the listener
  const checkForUpdatesRef = useRef(checkForUpdatesManual)
  useEffect(() => {
    checkForUpdatesRef.current = checkForUpdatesManual
  }, [checkForUpdatesManual])

  // Listen for menu "Check for Updates" event
  useEffect(() => {
    let unlistenFn: (() => void) | null = null

    listen('menu-check-updates', () => {
      checkForUpdatesRef.current()
    }).then((fn) => {
      unlistenFn = fn
    })

    return () => {
      if (unlistenFn) {
        unlistenFn()
      }
    }
  }, [])

  // Auto-check for updates on app launch (3s delay to not block initial render)
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForUpdates()
    }, 3000)

    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const value: UpdateContextValue = {
    updateAvailable,
    isChecking,
    isDownloading,
    downloadProgress,
    error,
    showUpToDate,
    checkForUpdates: checkForUpdatesManual,
    installUpdate,
    dismissUpdate,
    dismissUpToDate,
  }

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>
}
