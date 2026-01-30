import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PromptFile } from '@/types/prompt'
import type { PromptRun } from '@/types/run'
import type { GraderResultWithGrader } from '@/types/grader'
import { getPromptRuns, getRunGraderResults } from '@/lib/store'
import { formatRelativeTime, formatDuration } from '@/lib/run-history'
import { getLauncherIcon, getStatusIcon } from '@/lib/run-icons'
import { formatTokenCount, formatCost } from '@/lib/model-pricing'
import { ScrollArea } from '@/components/ui/scroll-area'
import { GraderBadge } from '@/components/graders/GraderBadge'
import { Clock, Loader2, Coins, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RunWithGraderResults extends PromptRun {
  graderResults?: GraderResultWithGrader[]
}

interface RunsTabProps {
  prompt: PromptFile
}

export function RunsTab({ prompt }: RunsTabProps) {
  const { t } = useTranslation(['common', 'runMode', 'graders'])
  const [runs, setRuns] = useState<RunWithGraderResults[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  // Calculate aggregate stats
  const aggregateStats = useMemo(() => {
    let totalTokens = 0
    let totalCost = 0
    let runsWithTokens = 0

    for (const run of runs) {
      if (run.totalTokens) {
        totalTokens += run.totalTokens
        runsWithTokens++
      }
      if (run.estimatedCostUsd) {
        totalCost += run.estimatedCostUsd
      }
    }

    return {
      totalTokens,
      totalCost,
      runsWithTokens,
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
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <Clock className="h-8 w-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('common:rightPanel.noRuns', 'No runs yet')}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {t('common:rightPanel.runsDescription', 'Run history will appear here when you copy or run this prompt.')}
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        {/* Aggregate Stats */}
        {aggregateStats.runsWithTokens > 0 && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
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

        {/* Run List */}
        <div className="space-y-2">
          {runs.map((run) => (
            <div
              key={run.id}
              className={cn(
                'rounded-lg border p-3',
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
                  {getLauncherIcon(run.launcherId, 'sm')}
                  <span>{formatRelativeTime(run.startedAt)}</span>
                </div>
              </div>

              {/* Metadata row: duration, tokens, cost */}
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                {run.executionTimeMs ? (
                  <span>
                    {t('common:rightPanel.duration', 'Duration')}: {formatDuration(run.executionTimeMs)}
                  </span>
                ) : null}

                {run.totalTokens ? (
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {formatTokenCount(run.totalTokens)}
                    {run.inputTokens && run.outputTokens && (
                      <span className="text-gray-400 dark:text-gray-500">
                        ({formatTokenCount(run.inputTokens)} / {formatTokenCount(run.outputTokens)})
                      </span>
                    )}
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
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
