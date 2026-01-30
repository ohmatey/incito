import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Settings } from 'lucide-react'
import {
  getProviderConfigs,
  type ProviderConfig,
  type ProviderConfigsSettings,
} from '@/lib/store'

interface ProviderSelectorProps {
  value: string | null // providerId, null = use default
  onChange: (providerId: string | null) => void
  showDefaultOption?: boolean
  disabled?: boolean
  className?: string
}

const PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
  'claude-code': 'Claude Code',
}

// rerender-lazy-state-init: Use function for initial state
const getInitialConfigs = (): ProviderConfigsSettings => ({ configs: [], defaultConfigId: null })

export function ProviderSelector({
  value,
  onChange,
  showDefaultOption = true,
  disabled = false,
  className,
}: ProviderSelectorProps) {
  const { t } = useTranslation(['settings', 'common'])
  const navigate = useNavigate()
  const [configs, setConfigs] = useState<ProviderConfigsSettings>(getInitialConfigs)
  const [isLoading, setIsLoading] = useState(true)

  const loadConfigs = useCallback(async () => {
    setIsLoading(true)
    const result = await getProviderConfigs()
    if (result.ok) {
      setConfigs(result.data)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  // js-index-maps: Build Map for O(1) lookups instead of repeated .find()
  const configsById = useMemo(() => {
    const map = new Map<string, ProviderConfig>()
    for (const config of configs.configs) {
      map.set(config.id, config)
    }
    return map
  }, [configs.configs])

  // Memoize derived values
  const defaultConfig = useMemo(() => {
    if (configs.defaultConfigId) {
      return configsById.get(configs.defaultConfigId) ?? configs.configs[0]
    }
    return configs.configs[0]
  }, [configs.defaultConfigId, configs.configs, configsById])

  const selectedConfig = useMemo(() => {
    return value ? configsById.get(value) : null
  }, [value, configsById])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-9 px-3 text-sm text-gray-500 dark:text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>{t('settings:aiProvider.loading')}</span>
      </div>
    )
  }

  // No providers configured - show helpful message
  if (configs.configs.length === 0) {
    return (
      <button
        type="button"
        onClick={() => navigate({ to: '/settings' })}
        className="flex items-center gap-2 h-9 px-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border border-dashed border-gray-300 dark:border-gray-600 rounded-md w-full justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      >
        <Settings className="h-4 w-4" aria-hidden="true" />
        <span>{t('settings:providers.noProviders')}</span>
      </button>
    )
  }

  // Compute selected display once
  const selectedDisplay = (() => {
    if (value === null && showDefaultOption) {
      return (
        <div className="flex items-center gap-2">
          <span>{t('settings:providerSelector.useDefault')}</span>
          {defaultConfig && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({defaultConfig.alias})
            </span>
          )}
        </div>
      )
    }

    if (selectedConfig) {
      return (
        <ConfigDisplay config={selectedConfig} showDefault={false} t={t} />
      )
    }

    return <span>{t('settings:aiProvider.selectProvider')}</span>
  })()

  return (
    <Select
      value={value ?? '__default__'}
      onValueChange={(val) => onChange(val === '__default__' ? null : val)}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue>{selectedDisplay}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {showDefaultOption && (
          <SelectItem value="__default__">
            <div className="flex items-center gap-2">
              <span>{t('settings:providerSelector.useDefault')}</span>
              {defaultConfig && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({defaultConfig.alias})
                </span>
              )}
            </div>
          </SelectItem>
        )}
        {configs.configs.map((config) => (
          <SelectItem key={config.id} value={config.id}>
            <ConfigDisplay config={config} showDefault={true} t={t} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// rerender-memo: Extract into separate component to avoid recreating JSX
interface ConfigDisplayProps {
  config: ProviderConfig
  showDefault: boolean
  t: (key: string) => string
}

function ConfigDisplay({ config, showDefault, t }: ConfigDisplayProps) {
  const providerName = PROVIDER_NAMES[config.provider] || config.provider
  const label = config.alias !== providerName ? config.alias : config.alias

  return (
    <div className="flex items-center gap-2">
      <span className="truncate">{label}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
        {config.model}
      </span>
      {showDefault && config.isDefault && (
        <Badge variant="secondary" className="shrink-0 text-xs ml-auto">
          {t('settings:providers.default')}
        </Badge>
      )}
    </div>
  )
}
