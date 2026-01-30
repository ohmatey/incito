import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, Star } from 'lucide-react'
import type { ProviderConfig, AIProvider } from '@/lib/store'

interface ProviderConfigCardProps {
  config: ProviderConfig
  onEdit: (config: ProviderConfig) => void
  onDelete: (id: string) => void
  onSetDefault: (id: string) => void
}

const PROVIDER_NAMES: Record<AIProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
  'claude-code': 'Claude Code',
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••'
  return `${key.slice(0, 4)}••••${key.slice(-4)}`
}

export function ProviderConfigCard({
  config,
  onEdit,
  onDelete,
  onSetDefault,
}: ProviderConfigCardProps) {
  const { t } = useTranslation(['settings', 'common'])

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {config.alias}
            </h4>
            {config.isDefault && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                {t('settings:providers.default')}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {PROVIDER_NAMES[config.provider]} - {config.model}
          </p>
          {config.apiKey && (
            <p className="mt-0.5 text-xs font-mono text-gray-400 dark:text-gray-500">
              {maskApiKey(config.apiKey)}
            </p>
          )}
          {config.provider === 'claude-code' && (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {t('settings:aiProvider.cliAuthentication')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!config.isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetDefault(config.id)}
              className="h-8 w-8 p-0"
              title={t('settings:providers.setDefault')}
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(config)}
            className="h-8 w-8 p-0"
            title={t('common:buttons.edit')}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(config.id)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
            title={t('common:buttons.delete')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
