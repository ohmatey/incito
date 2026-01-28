import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { PromptFile } from '@/types/prompt'
import type { PromptRun } from '@/types/run'
import { getPromptRuns } from '@/lib/store'
import { formatRelativeTime, formatDuration } from '@/lib/run-history'
import { getLauncherIcon, getStatusIcon } from '@/lib/run-icons'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RunsTabProps {
  prompt: PromptFile
}

export function RunsTab({ prompt }: RunsTabProps) {
  const { t } = useTranslation(['common', 'runMode'])
  const [runs, setRuns] = useState<PromptRun[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadRuns() {
      setIsLoading(true)
      const result = await getPromptRuns(prompt.id, 50)
      if (result.ok) {
        setRuns(result.data)
      }
      setIsLoading(false)
    }
    loadRuns()
  }, [prompt.id])

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
      <div className="space-y-2 p-4">
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

            {run.executionTimeMs ? (
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('common:rightPanel.duration', 'Duration')}: {formatDuration(run.executionTimeMs)}
              </div>
            ) : null}

            {run.errorMessage && (
              <div className="mt-2 rounded bg-red-100 p-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                {run.errorMessage}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
