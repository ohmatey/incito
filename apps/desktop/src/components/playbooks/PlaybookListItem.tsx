import { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Playbook } from '@/types/playbook'

interface PlaybookListItemProps {
  playbook: Playbook
  isSelected: boolean
  onClick: () => void
}

// Memoized to prevent re-renders when other list items change (rerender-memo rule)
export const PlaybookListItem = memo(function PlaybookListItem({ playbook, isSelected, onClick }: PlaybookListItemProps) {

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
          playbook.enabled
            ? 'text-gray-900 dark:text-gray-100'
            : 'text-gray-500 dark:text-gray-400'
        )}>
          {playbook.name}
        </span>
        <Badge
          variant="secondary"
          className={cn(
            'h-4 px-1.5 text-[10px]',
            playbook.enabled
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          )}
        >
          {playbook.ruleCount} {playbook.ruleCount === 1 ? 'rule' : 'rules'}
        </Badge>
      </div>
      {playbook.description && (
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {playbook.description}
        </p>
      )}
    </button>
  )
})
