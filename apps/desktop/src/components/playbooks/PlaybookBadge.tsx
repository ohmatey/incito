import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Playbook } from '@/types/playbook'

interface PlaybookBadgeProps {
  playbook: Playbook
  size?: 'sm' | 'default'
}

export function PlaybookBadge({ playbook, size = 'default' }: PlaybookBadgeProps) {

  const sizeClasses = size === 'sm' ? 'h-5 text-[10px]' : 'h-6 text-xs'

  return (
    <Badge
      variant="secondary"
      className={cn(
        sizeClasses,
        playbook.enabled
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
      )}
    >
      {playbook.name}
      {playbook.ruleCount > 0 && (
        <span className="ml-1 opacity-70">
          ({playbook.ruleCount})
        </span>
      )}
    </Badge>
  )
}
