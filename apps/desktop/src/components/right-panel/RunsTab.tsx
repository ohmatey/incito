import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import type { PromptFile } from '@/types/prompt'
import type { PromptRun } from '@/types/run'
import type { GraderResultWithGrader } from '@/types/grader'
import { getPromptRuns, getRunGraderResults } from '@/lib/store'
import { formatRelativeTime, formatDuration } from '@/lib/run-history'
import { getLauncherIcon, getStatusIcon } from '@/lib/run-icons'
import { formatTokenCount, formatCost } from '@/lib/model-pricing'
import { ScrollArea } from '@/components/ui/scroll-area'
import { GraderBadge } from '@/components/graders/GraderBadge'
import { EmptyState } from '@/components/ui/empty-state'
import { Clock, Loader2, Coins, Zap, CheckCircle, Target, DollarSign, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface RunWithGraderResults extends PromptRun {
  graderResults?: GraderResultWithGrader[]
}

interface RunsTabProps {
  prompt: PromptFile
}

export function RunsTab({ prompt }: RunsTabProps) {
  const { t } = useTranslation(['common', 'runMode', 'graders'])
  const navigate = useNavigate()
  const [runs, setRuns] = useState<RunWithGraderResults[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const handleRunClick = (runId: string) => {
    navigate({ to: '/runs/$runId', params: { runId }, search: { variable: undefined, collapsed: false, tab: undefined } })
  }

  useEffect(() => {
    async function loadRuns() {
      setIsLoading(true)
      const result = await getPromptRuns(prompt.id, 50)
      if (result.ok) {
        // Load grader results for each run
        const runsWithGraders: RunWithGraderResults[] = await Promise.all(
          result.data.map(async (run) => {
            const graderResult = await getRunGraderResults(run.id)
            return {
              ...run,
              graderResults: graderResult.ok ? graderResult.data : [],
            }
          })
        )
        setRuns(runsWithGraders)
      }
      setIsLoading(false)
    }
    loadRuns()
  }, [prompt.id])

  // Calculate aggregate stats including grader pass rates
  const aggregateStats = useMemo(() => {
    let totalTokens = 0
    let totalCost = 0
    let runsWithTokens = 0
    let runsWithGraders = 0
    let passedRuns = 0
    let totalGraderScore = 0
    let graderResultCount = 0

    for (const run of runs) {
      if (run.totalTokens) {
        totalTokens += run.totalTokens
        runsWithTokens++
      }
      if (run.estimatedCostUsd) {
        totalCost += run.estimatedCostUsd
      }

      // Calculate grader stats
      if (run.graderResults && run.graderResults.length > 0) {
        runsWithGraders++
        // A run passes if ALL its graders pass
        const allPassed = run.graderResults.every(r => r.passed)
        if (allPassed) {
          passedRuns++
        }
        // Accumulate scores for average
        for (const result of run.graderResults) {
          totalGraderScore += result.score
          graderResultCount++
        }
      }
    }

    const passRate = runsWithGraders > 0 ? (passedRuns / runsWithGraders) * 100 : 0
    const avgScore = graderResultCount > 0 ? (totalGraderScore / graderResultCount) * 100 : 0
    const costPerSuccess = passedRuns > 0 ? totalCost / passedRuns : 0

    return {
      totalTokens,
      totalCost,
      runsWithTokens,
      runsWithGraders,
      passedRuns,
      passRate: Math.round(passRate * 10) / 10,
      avgScore: Math.round(avgScore * 10) / 10,
      costPerSuccess: Math.round(costPerSuccess * 10000) / 10000,
    }
  }, [runs])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (runs.length === 0) {
    return (
      <EmptyState
        variant="inline"
        icon={Clock}
        title={t('common:rightPanel.noRuns', 'No runs yet')}
        description={t('common:rightPanel.runsDescription', 'Run history will appear here when you copy or run this prompt.')}
        className="h-full"
      />
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        {/* Aggregate Stats */}
        {(aggregateStats.runsWithTokens > 0 || aggregateStats.runsWithGraders > 0) && (
          <div className="mb-4 space-y-2">
            {/* Grader Pass Rate Stats */}
            {aggregateStats.runsWithGraders > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  {/* Pass Rate Badge */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <CheckCircle className={cn(
                            'h-4 w-4',
                            aggregateStats.passRate >= 80 ? 'text-green-500' :
                            aggregateStats.passRate >= 50 ? 'text-yellow-500' : 'text-red-500'
                          )} />
                          <span className={cn(
                            'text-lg font-bold',
                            aggregateStats.passRate >= 80 ? 'text-green-600 dark:text-green-400' :
                            aggregateStats.passRate >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                          )}>
                            {aggregateStats.passRate}%
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t('common:rightPanel.passRate', 'pass rate')}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {t('common:rightPanel.passRateTooltip', '{{passed}} of {{total}} runs passed all checks', {
                            passed: aggregateStats.passedRuns,
                            total: aggregateStats.runsWithGraders,
                          })}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Avg Score */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                          <Target className="h-3.5 w-3.5" />
                          <span>{t('common:rightPanel.avgScore', 'Avg Score')}:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {aggregateStats.avgScore}%
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{t('common:rightPanel.avgScoreTooltip', 'Average quality score across all checks')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Cost per Success */}
                  {aggregateStats.costPerSuccess > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                            <DollarSign className="h-3.5 w-3.5" />
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {formatCost(aggregateStats.costPerSuccess)}
                            </span>
                            <span>{t('common:rightPanel.perSuccess', '/success')}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{t('common:rightPanel.costPerSuccessTooltip', 'Average cost per successful run')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            )}

            {/* Token and Cost Stats */}
            {aggregateStats.runsWithTokens > 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                    <Zap className="h-3.5 w-3.5" />
                    <span>{t('common:rightPanel.totalTokens', 'Total Tokens')}:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatTokenCount(aggregateStats.totalTokens)}
                    </span>
                  </div>
                  {aggregateStats.totalCost > 0 && (
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                      <Coins className="h-3.5 w-3.5" />
                      <span>{t('common:rightPanel.totalCost', 'Total Cost')}:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCost(aggregateStats.totalCost)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Run List */}
        <div className="space-y-2">
          {runs.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => handleRunClick(run.id)}
              className={cn(
                'w-full rounded-lg border p-3 text-left transition-colors',
                'hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                run.status === 'completed' && 'border-green-200 bg-green-50 dark:border-green-800/50 dark:bg-green-900/10',
                run.status === 'error' && 'border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/10',
                run.status === 'pending' && 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50',
                run.status === 'in_progress' && 'border-blue-200 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-900/10',
                run.status === 'cancelled' && 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(run.status, 'sm')}
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {run.status === 'completed' && t('common:rightPanel.runCompleted', 'Completed')}
                    {run.status === 'error' && t('common:rightPanel.runFailed', 'Failed')}
                    {run.status === 'pending' && t('common:rightPanel.runPending', 'Pending')}
                    {run.status === 'in_progress' && t('common:rightPanel.runInProgress', 'In Progress')}
                    {run.status === 'cancelled' && t('common:rightPanel.runCancelled', 'Cancelled')}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatRelativeTime(run.startedAt)}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Launcher and metadata row */}
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  {getLauncherIcon(run.launcherId, 'sm')}
                  <span className="capitalize">{run.launcherId}</span>
                </span>

                {run.executionTimeMs ? (
                  <span>{formatDuration(run.executionTimeMs)}</span>
                ) : null}

                {run.totalTokens ? (
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {formatTokenCount(run.totalTokens)}
                  </span>
                ) : null}

                {run.estimatedCostUsd ? (
                  <span className="flex items-center gap-1">
                    <Coins className="h-3 w-3" />
                    {formatCost(run.estimatedCostUsd)}
                  </span>
                ) : null}
              </div>

              {/* Model info */}
              {run.modelId && (
                <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {run.provider && <span className="capitalize">{run.provider}</span>}
                  {run.provider && run.modelId && <span> / </span>}
                  <span className="font-mono">{run.modelId}</span>
                </div>
              )}

              {run.errorMessage && (
                <div className="mt-2 rounded bg-red-100 p-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  {run.errorMessage}
                </div>
              )}

              {/* Grader Results */}
              {run.graderResults && run.graderResults.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {run.graderResults.map((result) => (
                    <GraderBadge
                      key={result.id}
                      name={result.grader.name}
                      type={result.grader.type}
                      score={result.score}
                      passed={result.passed}
                      reason={result.reason}
                    />
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
