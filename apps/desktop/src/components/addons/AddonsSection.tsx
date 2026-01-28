import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAddons } from '@/context/AddonContext'
import { useRunMode } from '@/context/RunModeContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ImageAddonField } from './ImageAddonField'
import { Plus, ImagePlus, ChevronDown } from 'lucide-react'
import type { AddonFieldType, AddonFieldValue, ImageAddonValue } from '@/types/prompt'

interface AddonsSectionProps {
  className?: string
}

export function AddonsSection({ className }: AddonsSectionProps) {
  const { t } = useTranslation('prompts')
  const { addons, addonValues, addAddon, removeAddon, updateAddonValue } = useAddons()
  const { isActive: isRunMode } = useRunMode()

  const handleAddAddon = useCallback((type: AddonFieldType) => {
    addAddon(type)
  }, [addAddon])

  // Memoize handlers per addon to maintain stable references for memoized children
  const addonHandlers = useMemo(() => {
    const handlers: Record<string, {
      onValueChange: (value: AddonFieldValue) => void
      onRemove: () => void
    }> = {}
    for (const addon of addons) {
      handlers[addon.id] = {
        onValueChange: (value: AddonFieldValue) => updateAddonValue(addon.id, value),
        onRemove: () => removeAddon(addon.id),
      }
    }
    return handlers
  }, [addons, updateAddonValue, removeAddon])

  if (addons.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {t('addons.title')}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Plus className="h-3 w-3" />
                {t('addons.add')}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleAddAddon('image')}>
                <ImagePlus className="mr-2 h-4 w-4" />
                {t('addons.types.image')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
          {t('addons.emptyHint')}
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {t('addons.title')}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Plus className="h-3 w-3" />
              {t('addons.add')}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleAddAddon('image')}>
              <ImagePlus className="mr-2 h-4 w-4" />
              {t('addons.types.image')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-3">
        {addons.map((addon) => {
          const handlers = addonHandlers[addon.id]
          switch (addon.type) {
            case 'image':
              return (
                <ImageAddonField
                  key={addon.id}
                  addon={addon}
                  value={addonValues[addon.id] as ImageAddonValue | null}
                  disabled={!isRunMode}
                  onValueChange={handlers.onValueChange}
                  onRemove={handlers.onRemove}
                />
              )
            default:
              return null
          }
        })}
      </div>

      {!isRunMode && addons.length > 0 && (
        <p className="mt-2 text-center text-[10px] text-gray-400 dark:text-gray-500">
          {t('addons.enabledInRunMode')}
        </p>
      )}
    </div>
  )
}
