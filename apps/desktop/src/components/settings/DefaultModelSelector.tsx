import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProviderConfig } from '@/lib/store'

interface DefaultModelSelectorProps {
  label: string
  description: string
  value: string | null
  onChange: (configId: string | null) => void
  providers: ProviderConfig[]
}

export function DefaultModelSelector({
  label,
  description,
  value,
  onChange,
  providers,
}: DefaultModelSelectorProps) {
  const { t } = useTranslation(['settings'])

  const hasProviders = providers.length > 0

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </Label>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {description}
      </p>
      <Select
        value={value ?? 'none'}
        onValueChange={(val) => onChange(val === 'none' ? null : val)}
        disabled={!hasProviders}
      >
        <SelectTrigger className="w-full max-w-xs">
          <SelectValue placeholder={hasProviders ? t('settings:modelDefaults.selectModel') : t('settings:modelDefaults.noProviders')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-gray-500">{t('settings:modelDefaults.selectModel')}</span>
          </SelectItem>
          {providers.map((config) => (
            <SelectItem key={config.id} value={config.id}>
              <span className="flex items-center gap-2">
                <span className="font-medium">{config.alias}</span>
                <span className="text-gray-500 text-xs">({config.model})</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
