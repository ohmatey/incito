import { useTranslation } from 'react-i18next'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GraderType } from '@/types/grader'

interface GraderBadgeProps {
  name: string
  type: GraderType
  score: number
  passed: boolean
  reason?: string
  className?: string
}

export function GraderBadge({
  name,
  type,
  score,
  passed,
  reason,
  className,
}: GraderBadgeProps) {
  const { t: _t } = useTranslation('graders')

  // Determine color based on score (for LLM judges)
  const getScoreColor = () => {
    if (score >= 0.7) return 'text-green-600 dark:text-green-400'
    if (score >= 0.4) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getBgColor = () => {
    if (passed) return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800/50'
    return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800/50'
  }

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 py-0.5 text-xs',
        getBgColor(),
        className
      )}
    >
      {/* Show AI sparkle icon for LLM judges, no icon for quick checks */}
      {type === 'llm_judge' && (
        <Sparkles className="h-3 w-3 text-purple-500 dark:text-purple-400" />
      )}
      <span className="max-w-[80px] truncate">{name}</span>
      {passed ? (
        <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
      ) : (
        <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
      )}
      {type === 'llm_judge' && (
        <span className={cn('font-mono', getScoreColor())}>
          {Math.round(score * 100)}%
        </span>
      )}
    </Badge>
  )

  if (reason) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-[300px]">
            <p className="text-xs">{reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return badge
}
