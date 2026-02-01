import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getProviderConfigs, type ProviderConfig } from '@/lib/store'
import type { ProviderRunSettings } from '@/types/prompt-config'
import { Loader2 } from 'lucide-react'

interface ProviderSettingsProps {
  value: ProviderRunSettings | undefined
  onChange: (value: ProviderRunSettings) => void
}

export function ProviderSettings({ value, onChange }: ProviderSettingsProps) {
  const { t } = useTranslation('prompts')
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadProviders()
  }, [])

  async function loadProviders() {
    setIsLoading(true)
    const result = await getProviderConfigs()
    if (result.ok) {
      setProviders(result.data.configs)
    }
    setIsLoading(false)
  }

  const currentValue: ProviderRunSettings = value ?? {
    defaultProviderId: undefined,
    allowOverride: true,
  }

  function handleProviderChange(providerId: string) {
    onChange({
      ...currentValue,
      defaultProviderId: providerId === 'none' ? undefined : providerId,
    })
  }

  function handleAllowOverrideChange(checked: boolean) {
    onChange({
      ...currentValue,
      allowOverride: checked,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {t('settings.provider.title')}
      </h3>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="default-provider" className="text-sm text-gray-700 dark:text-gray-300">
            {t('settings.provider.defaultProvider')}
          </Label>
          <Select
            value={currentValue.defaultProviderId ?? 'none'}
            onValueChange={handleProviderChange}
          >
            <SelectTrigger id="default-provider" className="w-full">
              <SelectValue placeholder={t('settings.provider.noProvider')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('settings.provider.noProvider')}</SelectItem>
              {providers.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.alias}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="allow-override"
            checked={currentValue.allowOverride ?? true}
            onCheckedChange={handleAllowOverrideChange}
          />
          <Label
            htmlFor="allow-override"
            className="text-sm font-normal text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            {t('settings.provider.allowOverride')}
          </Label>
        </div>
      </div>
    </div>
  )
}
