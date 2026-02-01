import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { PromptRun } from '@/types/run'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/run-history'
import { getStatusIcon } from '@/lib/run-icons'
import { cn } from '@/lib/utils'
import { Clock, Plus } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface RunsListProps {
  runs: PromptRun[]
  selectedRunId: string | null
  onSelectRun: (run: PromptRun) => void
  width?: number
}

export function RunsList({
  runs,
  selectedRunId,
  onSelectRun,
  width = 200,
}: RunsListProps) {
  const { t } = useTranslation(['runs', 'customRun'])
  const navigate = useNavigate()

  // Group runs by date for better organization
  const groupedRuns = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const groups: { label: string; runs: PromptRun[] }[] = []
    const todayRuns: PromptRun[] = []
    const yesterdayRuns: PromptRun[] = []
    const olderRuns: PromptRun[] = []

    for (const run of runs) {
      const runDate = new Date(run.startedAt)
      runDate.setHours(0, 0, 0, 0)

      if (runDate.getTime() === today.getTime()) {
        todayRuns.push(run)
      } else if (runDate.getTime() === yesterday.getTime()) {
        yesterdayRuns.push(run)
      } else {
        olderRuns.push(run)
      }
    }

    if (todayRuns.length > 0) {
      groups.push({ label: t('list.today', 'Today'), runs: todayRuns })
    }
    if (yesterdayRuns.length > 0) {
      groups.push({ label: t('list.yesterday', 'Yesterday'), runs: yesterdayRuns })
    }
    if (olderRuns.length > 0) {
      groups.push({ label: t('list.older', 'Older'), runs: olderRuns })
    }

    return groups
  }, [runs, t])

  return (
    <div
      className="flex h-full flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      style={{ width: `${width}px`, minWidth: '150px', maxWidth: '400px' }}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200 px-3 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('runs:title')}</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate({ to: '/runs/new', search: { base: undefined } })}
          aria-label={t('customRun:newRun')}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Runs list */}
      <ScrollArea className="flex-1 [&>div>div]:!block">
        <div className="space-y-0.5 px-2 py-2">
          {runs.length === 0 ? (
            <EmptyState
              variant="inline"
              icon={Clock}
              title={t('list.empty', 'No runs yet')}
            />
          ) : (
            groupedRuns.map((group) => (
              <div key={group.label}>
                <div className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                  {group.label}
                </div>
                {group.runs.map((run) => (
                  <button
                    key={run.id}
                    onClick={() => onSelectRun(run)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                      selectedRunId === run.id
                        ? 'bg-gray-100 dark:bg-gray-700'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    )}
                  >
                    <div className="shrink-0">
                      {getStatusIcon(run.status)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block font-medium text-gray-900 dark:text-gray-100">
                        {run.promptName}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatRelativeTime(run.startedAt)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
