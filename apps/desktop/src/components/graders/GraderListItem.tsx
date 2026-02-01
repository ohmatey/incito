import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Grader } from '@/types/grader'
import { isAssertionGrader } from '@/types/grader'

interface GraderListItemProps {
  grader: Grader
  isSelected: boolean
  onClick: () => void
}

// Memoized to prevent re-renders when other list items change (rerender-memo rule)
export const GraderListItem = memo(function GraderListItem({ grader, isSelected, onClick }: GraderListItemProps) {
  const { t } = useTranslation('graders')
  const isAssertion = isAssertionGrader(grader)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-lg p-2 text-left transition-colors',
        'hover:bg-gray-100 dark:hover:bg-gray-700',
        isSelected && 'bg-gray-100 dark:bg-gray-700'
      )}
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={cn(
          'text-sm font-medium',
          grader.enabled
            ? 'text-gray-900 dark:text-gray-100'
            : 'text-gray-500 dark:text-gray-400'
        )}>
          {grader.name}
        </span>
        {/* Show AI badge for LLM judges to indicate cost */}
        {!isAssertion && (
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 gap-0.5">
            <Sparkles className="h-2.5 w-2.5" />
            {t('selector.aiBadge')}
          </Badge>
        )}
        {grader.isBuiltin && (
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            {t('list.builtin')}
          </Badge>
        )}
      </div>
      {grader.description && (
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {grader.description}
        </p>
      )}
    </button>
  )
})
