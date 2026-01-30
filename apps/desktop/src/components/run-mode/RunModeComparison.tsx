import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useRunMode } from '@/context/RunModeContext'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Zap,
  Coins,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTokenCount, formatCost } from '@/lib/model-pricing'
import { toast } from 'sonner'
import type { ProviderRunResult, ProviderRunStatus } from '@/types/run'

interface RunModeComparisonProps {
  onCopyResult?: (providerId: string, content: string) => void
}

/**
 * Side-by-side comparison view for multiple provider results.
 * Shows streaming results from each selected provider with their token usage and costs.
 */
export function RunModeComparison({ onCopyResult }: RunModeComparisonProps) {
  const { t } = useTranslation(['runMode', 'common'])
  const { providerResults, selectedProviderIds } = useRunMode()

  const sortedResults = useMemo(() => {
    return selectedProviderIds
      .map((id) => providerResults[id])
      .filter(Boolean) as ProviderRunResult[]
  }, [selectedProviderIds, providerResults])

  const handleCopy = async (result: ProviderRunResult) => {
    try {
      await navigator.clipboard.writeText(result.content)
      toast.success(t('common:copied'))
      onCopyResult?.(result.providerId, result.content)
    } catch {
      toast.error(t('common:copyFailed'))
    }
  }

  if (sortedResults.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        {t('runMode:comparison.noProviders')}
      </div>
    )
  }

  // Single provider - full width
  if (sortedResults.length === 1) {
    return (
      <div className="h-full p-4">
        <ComparisonCard
          result={sortedResults[0]}
          onCopy={handleCopy}
          className="h-full"
        />
      </div>
    )
  }

  // Multiple providers - side by side grid
  return (
    <div className="h-full p-4">
      <div
        className={cn(
          'grid gap-4 h-full',
          sortedResults.length === 2 && 'grid-cols-2',
          sortedResults.length === 3 && 'grid-cols-3',
          sortedResults.length >= 4 && 'grid-cols-2 lg:grid-cols-4'
        )}
      >
        {sortedResults.map((result) => (
          <ComparisonCard
            key={result.providerId}
            result={result}
            onCopy={handleCopy}
          />
        ))}
      </div>
    </div>
  )
}

interface ComparisonCardProps {
  result: ProviderRunResult
  onCopy: (result: ProviderRunResult) => void
  className?: string
}

function ComparisonCard({ result, onCopy, className }: ComparisonCardProps) {
  const { t } = useTranslation(['runMode', 'common'])

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border bg-white dark:bg-gray-800',
        result.status === 'error' && 'border-red-300 dark:border-red-800',
        result.status === 'completed' && 'border-green-300 dark:border-green-800',
        result.status === 'streaming' && 'border-primary-300 dark:border-primary-700',
        result.status === 'pending' && 'border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {result.providerAlias}
          </span>
          <StatusBadge status={result.status} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCopy(result)}
          disabled={result.status !== 'completed' || !result.content}
          className="h-8 w-8 p-0"
          title={t('common:buttons.copy')}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">
          {result.status === 'pending' && (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t('runMode:comparison.waiting')}</span>
            </div>
          )}
          {result.status === 'streaming' && (
            <>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {result.content || (
                  <span className="text-gray-400">{t('runMode:comparison.streaming')}</span>
                )}
              </div>
              <div className="mt-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
              </div>
            </>
          )}
          {result.status === 'completed' && (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {result.content}
            </div>
          )}
          {result.status === 'error' && (
            <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="text-sm">{result.error}</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with stats */}
      {result.status === 'completed' && (result.totalTokens !== undefined || result.estimatedCostUsd !== undefined) ? (
        <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          {result.totalTokens !== undefined ? (
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>{formatTokenCount(result.totalTokens)}</span>
            </div>
          ) : null}
          {result.estimatedCostUsd !== undefined ? (
            <div className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              <span>{formatCost(result.estimatedCostUsd)}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function StatusBadge({ status }: { status: ProviderRunStatus }) {
  const { t } = useTranslation('runMode')

  const config = {
    idle: {
      variant: 'secondary' as const,
      icon: null,
      label: t('comparison.status.idle'),
    },
    pending: {
      variant: 'secondary' as const,
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      label: t('comparison.status.pending'),
    },
    streaming: {
      variant: 'default' as const,
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      label: t('comparison.status.streaming'),
    },
    completed: {
      variant: 'outline' as const,
      icon: <Check className="h-3 w-3 text-green-500" />,
      label: t('comparison.status.completed'),
    },
    error: {
      variant: 'destructive' as const,
      icon: <AlertCircle className="h-3 w-3" />,
      label: t('comparison.status.error'),
    },
  }[status]

  return (
    <Badge variant={config.variant} className="gap-1 text-xs px-1.5 py-0.5">
      {config.icon}
      {config.label}
    </Badge>
  )
}
