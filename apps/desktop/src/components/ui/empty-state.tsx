import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateAction {
  label: string
  onClick: () => void
  icon?: LucideIcon
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
}

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  className?: string
  /** Use 'page' for full page empty states, 'inline' for list/panel empty states */
  variant?: 'page' | 'inline'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = 'page',
}: EmptyStateProps) {
  const isPage = variant === 'page'

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isPage
          ? 'h-full flex-1 gap-4 bg-gray-50 px-8 dark:bg-gray-900'
          : 'gap-2 px-4 py-8',
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full',
            isPage
              ? 'h-16 w-16 bg-gray-200 dark:bg-gray-700'
              : 'h-12 w-12 bg-gray-100 dark:bg-gray-800'
          )}
        >
          <Icon
            className={cn(
              'text-gray-500 dark:text-gray-400',
              isPage ? 'h-8 w-8' : 'h-6 w-6'
            )}
          />
        </div>
      )}
      <div className="space-y-1">
        <h2
          className={cn(
            'font-semibold text-gray-900 dark:text-gray-100',
            isPage ? 'text-lg' : 'text-sm'
          )}
        >
          {title}
        </h2>
        {description && (
          <p
            className={cn(
              'max-w-sm text-gray-500 dark:text-gray-400',
              isPage ? 'text-sm' : 'text-xs'
            )}
          >
            {description}
          </p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="flex gap-2">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant}
              size={isPage ? 'default' : 'sm'}
              className="gap-2"
            >
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || 'outline'}
              size={isPage ? 'default' : 'sm'}
              className="gap-2"
            >
              {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4" />}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
