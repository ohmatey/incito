import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Gauge } from 'lucide-react'

interface VarianceIndicatorProps {
  consistency: number  // 0-100 percentage of how consistent outputs are
  className?: string
}

/**
 * Shows how consistent the batch run outputs are.
 * Higher consistency = outputs are more similar.
 */
export function VarianceIndicator({ consistency, className }: VarianceIndicatorProps) {
  const { t } = useTranslation('runMode')

  const consistencyLabel =
    consistency >= 90
      ? t('batch.veryConsistent', 'Very Consistent')
      : consistency >= 70
      ? t('batch.consistent', 'Consistent')
      : consistency >= 50
      ? t('batch.moderate', 'Moderate')
      : t('batch.variable', 'Variable')

  const colorClass =
    consistency >= 90
      ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      : consistency >= 70
      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
      : consistency >= 50
      ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
      : 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
              colorClass,
              className
            )}
          >
            <Gauge className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{consistency}%</span>
            <span className="text-xs">{consistencyLabel}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {t('batch.consistencyTooltip', 'How similar the outputs are across multiple runs')}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Calculate consistency score based on output similarity.
 * Uses simple heuristics for now - can be improved with better text similarity algorithms.
 */
export function calculateConsistency(outputs: string[]): number {
  if (outputs.length < 2) return 100

  // Calculate average pairwise similarity using Jaccard-like metric on words
  let totalSimilarity = 0
  let comparisons = 0

  for (let i = 0; i < outputs.length; i++) {
    for (let j = i + 1; j < outputs.length; j++) {
      totalSimilarity += calculateTextSimilarity(outputs[i], outputs[j])
      comparisons++
    }
  }

  return Math.round((totalSimilarity / comparisons) * 100)
}

/**
 * Simple text similarity using word overlap (Jaccard similarity).
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2))

  if (words1.size === 0 && words2.size === 0) return 1
  if (words1.size === 0 || words2.size === 0) return 0

  const intersection = new Set([...words1].filter(w => words2.has(w)))
  const union = new Set([...words1, ...words2])

  return intersection.size / union.size
}
