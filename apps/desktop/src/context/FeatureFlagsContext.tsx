import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { getFeatureFlags, saveFeatureFlags, type FeatureFlags } from '@/lib/store'
import { toast } from 'sonner'

interface FeatureFlagsContextValue {
  featureFlags: FeatureFlags
  updateFeatureFlags: (flags: Partial<FeatureFlags>) => Promise<void>
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null)

export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext)
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider')
  }
  return context
}

interface FeatureFlagsProviderProps {
  children: ReactNode
}

export function FeatureFlagsProvider({ children }: FeatureFlagsProviderProps) {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({
    agentsEnabled: false,
    resourcesEnabled: false,
    translationsEnabled: false,
    mcpServerEnabled: false,
    runsEnabled: false,
    gradersEnabled: false,
    playbooksEnabled: false,
  })

  // Load feature flags on mount
  useEffect(() => {
    async function loadFlags() {
      const result = await getFeatureFlags()
      if (result.ok) {
        setFeatureFlags(result.data)
      }
    }
    loadFlags()
  }, [])

  async function updateFeatureFlags(flags: Partial<FeatureFlags>) {
    const newFlags = { ...featureFlags, ...flags }
    const result = await saveFeatureFlags(flags)
    if (result.ok) {
      setFeatureFlags(newFlags)
    } else {
      toast.error(result.error)
    }
  }

  const value: FeatureFlagsContextValue = {
    featureFlags,
    updateFeatureFlags,
  }

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}
