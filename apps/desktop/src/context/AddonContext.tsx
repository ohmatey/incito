import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import type { AddonField, AddonFieldValue, ImageAddonValue } from '@/types/prompt'

interface AddonContextValue {
  // State
  addons: AddonField[]
  addonValues: Record<string, AddonFieldValue>

  // Actions
  addAddon: (type: AddonField['type']) => void
  removeAddon: (id: string) => void
  updateAddonValue: (id: string, value: AddonFieldValue) => void
  clearAddons: () => void

  // Helpers
  getImageAttachments: () => ImageAddonValue[]
}

const AddonContext = createContext<AddonContextValue | null>(null)

export function useAddons() {
  const context = useContext(AddonContext)
  if (!context) {
    throw new Error('useAddons must be used within an AddonProvider')
  }
  return context
}

interface AddonProviderProps {
  children: ReactNode
}

export function AddonProvider({ children }: AddonProviderProps) {
  const [addons, setAddons] = useState<AddonField[]>([])
  const [addonValues, setAddonValues] = useState<Record<string, AddonFieldValue>>({})

  const addAddon = useCallback((type: AddonField['type']) => {
    const id = crypto.randomUUID()
    let label = ''
    let description = ''

    switch (type) {
      case 'image':
        label = 'Image'
        description = 'Upload an image to include as context'
        break
    }

    const newAddon: AddonField = {
      id,
      type,
      label,
      description,
    }

    setAddons((prev) => [...prev, newAddon])
    setAddonValues((prev) => ({ ...prev, [id]: null }))
  }, [])

  const removeAddon = useCallback((id: string) => {
    setAddons((prev) => prev.filter((a) => a.id !== id))
    setAddonValues((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const updateAddonValue = useCallback((id: string, value: AddonFieldValue) => {
    setAddonValues((prev) => ({ ...prev, [id]: value }))
  }, [])

  const clearAddons = useCallback(() => {
    setAddons([])
    setAddonValues({})
  }, [])

  const getImageAttachments = useCallback((): ImageAddonValue[] => {
    const result: ImageAddonValue[] = []
    for (const addon of addons) {
      if (addon.type === 'image') {
        const value = addonValues[addon.id]
        if (value !== null && value !== undefined) {
          result.push(value)
        }
      }
    }
    return result
  }, [addons, addonValues])

  const value = useMemo<AddonContextValue>(() => ({
    addons,
    addonValues,
    addAddon,
    removeAddon,
    updateAddonValue,
    clearAddons,
    getImageAttachments,
  }), [addons, addonValues, addAddon, removeAddon, updateAddonValue, clearAddons, getImageAttachments])

  return (
    <AddonContext.Provider value={value}>{children}</AddonContext.Provider>
  )
}
