import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import posthog from 'posthog-js'
import { getAnalyticsSettings, saveAnalyticsSettings } from '@/lib/store'

interface PostHogContextValue {
  isEnabled: boolean
  isLoading: boolean
  enableAnalytics: () => Promise<void>
  disableAnalytics: () => Promise<void>
  track: (event: string, properties?: Record<string, unknown>) => void
  remoteFeatureFlags: Record<string, boolean | string>
}

const PostHogContext = createContext<PostHogContextValue | undefined>(undefined)

// TODO: Replace with actual PostHog project key before release
const POSTHOG_KEY = 'phc_YOUR_PROJECT_KEY'
const POSTHOG_HOST = 'https://us.i.posthog.com'

export function PostHogProvider({ children }: { children: ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [remoteFeatureFlags, setRemoteFeatureFlags] = useState<Record<string, boolean | string>>({})

  useEffect(() => {
    async function init() {
      const result = await getAnalyticsSettings()
      if (result.ok && result.data.enabled) {
        let distinctId = result.data.distinctId

        // Generate distinctId on first launch if enabled by default
        if (!distinctId) {
          distinctId = crypto.randomUUID()
          await saveAnalyticsSettings({ distinctId })
        }

        initPostHog(distinctId)
        setIsEnabled(true)
      }
      setIsLoading(false)
    }
    init()

    return () => {
      if (posthog.__loaded) {
        posthog.reset()
      }
    }
  }, [])

  function initPostHog(distinctId: string) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      loaded: (ph) => {
        ph.identify(distinctId)
      },
      persistence: 'memory',
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
    })

    // Listen for feature flags to be loaded
    posthog.onFeatureFlags((flags) => {
      const flagVariants: Record<string, boolean | string> = {}
      for (const flag of flags) {
        const value = posthog.getFeatureFlag(flag)
        if (value !== undefined && value !== null) {
          flagVariants[flag] = value
        }
      }
      setRemoteFeatureFlags(flagVariants)
    })
  }

  async function enableAnalytics() {
    const result = await getAnalyticsSettings()
    let distinctId = result.ok ? result.data.distinctId : null

    if (!distinctId) {
      distinctId = crypto.randomUUID()
    }

    await saveAnalyticsSettings({ enabled: true, distinctId })
    initPostHog(distinctId)
    setIsEnabled(true)
    posthog.capture('analytics_enabled')
  }

  async function disableAnalytics() {
    if (posthog.__loaded) {
      posthog.capture('analytics_disabled')
      posthog.reset()
    }

    await saveAnalyticsSettings({ enabled: false })
    setIsEnabled(false)
    setRemoteFeatureFlags({})
  }

  const track = useCallback((event: string, properties?: Record<string, unknown>) => {
    if (isEnabled && posthog.__loaded) {
      posthog.capture(event, properties)
    }
  }, [isEnabled])

  return (
    <PostHogContext.Provider value={{
      isEnabled,
      isLoading,
      enableAnalytics,
      disableAnalytics,
      track,
      remoteFeatureFlags,
    }}>
      {children}
    </PostHogContext.Provider>
  )
}

export function usePostHog() {
  const context = useContext(PostHogContext)
  if (context === undefined) {
    throw new Error('usePostHog must be used within a PostHogProvider')
  }
  return context
}
