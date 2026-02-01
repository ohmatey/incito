import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrendIndicator } from './TrendIndicator'
import { Sparkline } from './Sparkline'
import {
  getPromptHealthStats,
  getPromptPassRateTrend,
  type PromptHealthStats,
  type DailyPassRate,
} from '@/lib/store'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PromptHealthCardProps {
  promptId: string
  days?: number
  className?: string
}

export function PromptHealthCard({
  promptId,
  days = 7,
  className,
}: PromptHealthCardProps) {
  const { t } = useTranslation('common')
  const [stats, setStats] = useState<PromptHealthStats | null>(null)
  const [trend, setTrend] = useState<DailyPassRate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      const [statsResult, trendResult] = await Promise.all([
        getPromptHealthStats(promptId, days),
        getPromptPassRateTrend(promptId, days),
      ])

      if (statsResult.ok) {
        setStats(statsResult.data)
      }
      if (trendResult.ok) {
        setTrend(trendResult.data)
      }
      setIsLoading(false)
    }

    loadData()
  }, [promptId, days])

  if (isLoading) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50', className)}>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (!stats || stats.totalRuns === 0) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50', className)}>
        <div className="flex flex-col items-center justify-center gap-2 py-2 text-center">
          <Activity className="h-6 w-6 text-gray-300 dark:text-gray-600" />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('analytics.noRunsYet', 'No runs with graders yet')}
          </p>
        </div>
      </div>
    )
  }

  const passRateColor =
    stats.passRate >= 80
      ? 'text-green-600 dark:text-green-400'
      : stats.passRate >= 50
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400'

  const passRateBg =
    stats.passRate >= 80
      ? 'bg-green-50 dark:bg-green-900/20'
      : stats.passRate >= 50
      ? 'bg-yellow-50 dark:bg-yellow-900/20'
      : 'bg-red-50 dark:bg-red-900/20'

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800', className)}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t('analytics.promptHealth', 'Quality Check')}
        </h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {t('analytics.lastNDays', 'Last {{days}} days', { days })}
        </span>
      </div>

      {/* Main Pass Rate */}
      <div className="mb-4 flex items-end justify-between">
        <div className="flex items-baseline gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn('text-3xl font-bold', passRateColor)}>
                  {stats.passRate}%
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {t('analytics.passRateTooltip', '{{passed}} of {{total}} runs passed all checks', {
                    passed: stats.passedRuns,
                    total: stats.totalRuns,
                  })}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {stats.trend !== 0 && (
            <TrendIndicator
              value={stats.trend}
              direction={stats.trendDirection}
              size="sm"
            />
          )}
        </div>

        {/* Sparkline */}
        {trend.length > 1 && (
          <Sparkline
            data={trend.map((d) => d.passRate)}
            width={64}
            height={28}
          />
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
        {/* Runs Count */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {stats.totalRuns}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('analytics.runs', 'Runs')}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{t('analytics.totalRunsTooltip', 'Total completed runs')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Passed Count */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {stats.passedRuns}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('analytics.passed', 'Passed')}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{t('analytics.passedTooltip', 'Runs where all checks passed')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Failed Count */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {stats.totalRuns - stats.passedRuns}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('analytics.failed', 'Failed')}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{t('analytics.failedTooltip', 'Runs where at least one check failed')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Average Score */}
      {stats.avgGraderScore > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('analytics.avgScore', 'Avg. Quality Score')}
          </span>
          <span className={cn('rounded px-2 py-0.5 text-sm font-medium', passRateBg, passRateColor)}>
            {stats.avgGraderScore}%
          </span>
        </div>
      )}
    </div>
  )
}
