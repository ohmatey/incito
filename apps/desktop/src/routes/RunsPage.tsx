import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import type { PromptRun } from '@/types/run'
import { getRecentRuns } from '@/lib/store'
import { formatRelativeTime, formatDuration } from '@/lib/run-history'
import { getLauncherIcon, getStatusIcon } from '@/lib/run-icons'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, Loader2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RunsPage() {
  const { t } = useTranslation(['common', 'runs'])
  const navigate = useNavigate()
  const [runs, setRuns] = useState<PromptRun[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadRuns() {
      setIsLoading(true)
      const result = await getRecentRuns(100)
      if (result.ok) {
        setRuns(result.data)
      }
      setIsLoading(false)
    }
    loadRuns()
  }, [])

  function handleRunClick(run: PromptRun) {
    // Navigate to the prompt that was run
    navigate({ to: '/prompts/$promptId', params: { promptId: run.promptId } })
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (runs.length === 0) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 bg-gray-100 px-4 text-center dark:bg-gray-900">
        <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600" />
        <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">
          {t('runs:empty.title', 'No runs yet')}
        </h2>
        <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {t('runs:empty.description', 'Your prompt run history will appear here when you copy or launch prompts.')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {t('runs:title', 'Run History')}
        </h1>
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
          ({runs.length})
        </span>
      </div>

      {/* Runs List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {runs.map((run) => (
            <button
              key={run.id}
              onClick={() => handleRunClick(run)}
              className={cn(
                'w-full rounded-lg border p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                run.status === 'completed' && 'border-green-200 bg-white dark:border-green-800/50 dark:bg-gray-800',
                run.status === 'error' && 'border-red-200 bg-white dark:border-red-800/50 dark:bg-gray-800',
                run.status === 'pending' && 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
                run.status === 'in_progress' && 'border-blue-200 bg-white dark:border-blue-800/50 dark:bg-gray-800',
                run.status === 'cancelled' && 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getStatusIcon(run.status)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {run.promptName}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        {getLauncherIcon(run.launcherId)}
                        <span className="capitalize">{run.launcherId}</span>
                      </span>
                      {run.executionTimeMs ? (
                        <span>{formatDuration(run.executionTimeMs)}</span>
                      ) : null}
                    </div>
                    {run.errorMessage && (
                      <div className="mt-2 rounded bg-red-100 p-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        {run.errorMessage}
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                  {formatRelativeTime(run.startedAt)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
