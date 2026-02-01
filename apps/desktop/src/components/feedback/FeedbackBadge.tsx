import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Check, X, MessageSquare } from 'lucide-react'
import type { RunFeedback } from '@/types/feedback'

interface FeedbackBadgeProps {
  feedback: RunFeedback | null | undefined
  size?: 'sm' | 'md'
}

export function FeedbackBadge({ feedback, size = 'sm' }: FeedbackBadgeProps) {
  const { t } = useTranslation('runs')

  if (!feedback) {
    return (
      <Badge
        variant="outline"
        className={size === 'sm' ? 'h-5 text-xs gap-1' : 'h-6 text-sm gap-1.5'}
      >
        <MessageSquare className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        {t('feedback.notReviewed')}
      </Badge>
    )
  }

  // Show pass/fail status if available
  if (feedback.passFail) {
    return feedback.passFail === 'pass' ? (
      <Badge
        variant="outline"
        className={`${size === 'sm' ? 'h-5 text-xs gap-1' : 'h-6 text-sm gap-1.5'} border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400`}
      >
        <Check className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        {t('feedback.passFail.pass')}
      </Badge>
    ) : (
      <Badge
        variant="outline"
        className={`${size === 'sm' ? 'h-5 text-xs gap-1' : 'h-6 text-sm gap-1.5'} border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400`}
      >
        <X className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        {t('feedback.passFail.fail')}
      </Badge>
    )
  }

  // Show rating if available
  if (feedback.rating !== undefined) {
    return (
      <Badge
        variant="outline"
        className={`${size === 'sm' ? 'h-5 text-xs gap-1' : 'h-6 text-sm gap-1.5'} border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400`}
      >
        {feedback.rating}/5
      </Badge>
    )
  }

  // Just show reviewed badge
  return (
    <Badge
      variant="outline"
      className={`${size === 'sm' ? 'h-5 text-xs gap-1' : 'h-6 text-sm gap-1.5'} border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`}
    >
      <Check className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {t('feedback.reviewed')}
    </Badge>
  )
}
