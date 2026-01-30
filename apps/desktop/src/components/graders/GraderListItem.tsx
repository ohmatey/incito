import { useTranslation } from 'react-i18next'
import { Code, Brain, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Grader } from '@/types/grader'
import { isAssertionGrader } from '@/types/grader'

interface GraderListItemProps {
  grader: Grader
  isSelected: boolean
  onClick: () => void
}

export function GraderListItem({ grader, isSelected, onClick }: GraderListItemProps) {
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
      <div className="flex items-start gap-2">
        <div className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded',
          isAssertion
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'bg-purple-100 dark:bg-purple-900/30'
        )}>
          {isAssertion ? (
            <Code className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
          ) : (
            <Brain className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'truncate text-sm font-medium',
              grader.enabled
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400'
            )}>
              {grader.name}
            </span>
            {grader.isBuiltin && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {t('list.builtin')}
              </Badge>
            )}
          </div>
          {grader.description && (
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
              {grader.description}
            </p>
          )}
        </div>
        <div className={cn(
          'mt-0.5 h-4 w-4 shrink-0 rounded-full flex items-center justify-center',
          grader.enabled
            ? 'bg-green-100 dark:bg-green-900/30'
            : 'bg-gray-100 dark:bg-gray-700'
        )}>
          {grader.enabled ? (
            <Check className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
          ) : (
            <X className="h-2.5 w-2.5 text-gray-400 dark:text-gray-500" />
          )}
        </div>
      </div>
    </button>
  )
}
