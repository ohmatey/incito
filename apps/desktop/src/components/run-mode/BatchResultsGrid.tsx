import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { VarianceIndicator, calculateConsistency } from './VarianceIndicator'
import { GraderBadge } from '@/components/graders/GraderBadge'
import {
  Copy,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Trophy,
  ThumbsDown,
  Zap,
  Coins,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTokenCount, formatCost } from '@/lib/model-pricing'
import { toast } from 'sonner'
import type { GraderResultWithGrader } from '@/types/grader'

export interface BatchRunResult {
  id: string
  runNumber: number
  status: 'pending' | 'running' | 'completed' | 'error'
  content: string
  error?: string
  graderResults: GraderResultWithGrader[]
  allGradersPassed: boolean
  avgGraderScore: number
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  estimatedCostUsd?: number
}

interface BatchResultsGridProps {
  results: BatchRunResult[]
  className?: string
}

export function BatchResultsGrid({
  results,
  className,
}: BatchResultsGridProps) {
  const { t } = useTranslation('runMode')

  // Calculate aggregate stats
  const stats = useMemo(() => {
    const completed = results.filter((r) => r.status === 'completed')
    const passed = completed.filter((r) => r.allGradersPassed)
    const passRate = completed.length > 0 ? (passed.length / completed.length) * 100 : 0

    const outputs = completed.map((r) => r.content).filter(Boolean)
    const consistency = calculateConsistency(outputs)

    // Find best and worst by grader score
    const sorted = [...completed].sort((a, b) => b.avgGraderScore - a.avgGraderScore)
    const best = sorted[0]
    const worst = sorted.length > 1 ? sorted[sorted.length - 1] : null

    // Total cost
    const totalCost = completed.reduce((sum, r) => sum + (r.estimatedCostUsd || 0), 0)
    const totalTokens = completed.reduce((sum, r) => sum + (r.totalTokens || 0), 0)

    return {
      completed: completed.length,
      passed: passed.length,
      passRate: Math.round(passRate),
      consistency,
      bestId: best?.id,
      worstId: worst?.id !== best?.id ? worst?.id : null,
      totalCost,
      totalTokens,
    }
  }, [results])

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success(t('common:copied'))
    } catch {
      toast.error(t('common:copyFailed'))
    }
  }

  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        {t('batch.noResults', 'No batch results yet')}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Aggregate Stats Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="flex items-center gap-4">
          {/* Pass Rate */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-xl font-bold',
                stats.passRate >= 80
                  ? 'text-green-600 dark:text-green-400'
                  : stats.passRate >= 50
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {stats.passRate}%
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('batch.passRate', 'pass rate')}
              {' '}
              <span className="text-gray-400">
                ({stats.passed}/{stats.completed})
              </span>
            </span>
          </div>

          {/* Consistency */}
          {stats.completed >= 2 && (
            <VarianceIndicator consistency={stats.consistency} />
          )}
        </div>

        {/* Cost & Tokens */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {stats.totalTokens > 0 && (
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>{formatTokenCount(stats.totalTokens)}</span>
            </div>
          )}
          {stats.totalCost > 0 && (
            <div className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              <span>{formatCost(stats.totalCost)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Results Grid */}
      <ScrollArea className="flex-1">
        <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((result) => (
            <ResultCard
              key={result.id}
              result={result}
              isBest={result.id === stats.bestId}
              isWorst={result.id === stats.worstId}
              onCopy={() => handleCopy(result.content)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

interface ResultCardProps {
  result: BatchRunResult
  isBest?: boolean
  isWorst?: boolean
  onCopy: () => void
}

function ResultCard({ result, isBest, isWorst, onCopy }: ResultCardProps) {
  const { t } = useTranslation('runMode')

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border bg-white dark:bg-gray-800',
        result.status === 'error' && 'border-red-300 dark:border-red-800',
        result.status === 'completed' && result.allGradersPassed && 'border-green-300 dark:border-green-800',
        result.status === 'completed' && !result.allGradersPassed && 'border-yellow-300 dark:border-yellow-800',
        result.status === 'running' && 'border-primary-300 dark:border-primary-700',
        result.status === 'pending' && 'border-gray-200 dark:border-gray-700',
        isBest && 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900',
        isWorst && 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-gray-900'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            #{result.runNumber}
          </span>
          {result.status === 'pending' && (
            <Badge variant="secondary" className="text-xs">
              {t('batch.status.pending', 'Pending')}
            </Badge>
          )}
          {result.status === 'running' && (
            <Badge variant="default" className="gap-1 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('batch.status.running', 'Running')}
            </Badge>
          )}
          {result.status === 'completed' && (
            result.allGradersPassed ? (
              <Badge variant="outline" className="gap-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle className="h-3 w-3" />
                {t('batch.status.passed', 'Passed')}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                <AlertCircle className="h-3 w-3" />
                {t('batch.status.partialPass', 'Partial')}
              </Badge>
            )
          )}
          {result.status === 'error' && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <XCircle className="h-3 w-3" />
              {t('batch.status.error', 'Error')}
            </Badge>
          )}
          {isBest && (
            <span title={t('batch.bestResult', 'Best result')}>
              <Trophy className="h-4 w-4 text-green-500" />
            </span>
          )}
          {isWorst && (
            <span title={t('batch.worstResult', 'Lowest score')}>
              <ThumbsDown className="h-4 w-4 text-red-500" />
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCopy}
          disabled={result.status !== 'completed' || !result.content}
          className="h-7 w-7 p-0"
          title={t('common:buttons.copy')}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-3">
        {result.status === 'pending' && (
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
            <span className="text-xs">{t('batch.waitingToRun', 'Waiting to run...')}</span>
          </div>
        )}
        {result.status === 'running' && (
          <div className="flex items-center gap-2 text-primary-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">{t('batch.generating', 'Generating...')}</span>
          </div>
        )}
        {result.status === 'completed' && (
          <p className="line-clamp-4 text-xs text-gray-600 dark:text-gray-400">
            {result.content}
          </p>
        )}
        {result.status === 'error' && (
          <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-xs">{result.error}</span>
          </div>
        )}
      </div>

      {/* Grader Results */}
      {result.status === 'completed' && result.graderResults.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-gray-200 px-3 py-2 dark:border-gray-700">
          {result.graderResults.map((gr) => (
            <GraderBadge
              key={gr.id}
              name={gr.grader.name}
              type={gr.grader.type}
              score={gr.score}
              passed={gr.passed}
              reason={gr.reason}
            />
          ))}
        </div>
      )}

      {/* Footer Stats */}
      {result.status === 'completed' && (result.totalTokens || result.estimatedCostUsd) && (
        <div className="flex items-center gap-3 border-t border-gray-200 px-3 py-1.5 text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
          {result.totalTokens && (
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {formatTokenCount(result.totalTokens)}
            </div>
          )}
          {result.estimatedCostUsd && (
            <div className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              {formatCost(result.estimatedCostUsd)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
