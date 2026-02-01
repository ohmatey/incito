import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrendIndicatorProps {
  value: number           // Percentage change (can be negative)
  direction: 'up' | 'down' | 'stable'
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  className?: string
}

export function TrendIndicator({
  value,
  direction,
  size = 'md',
  showValue = true,
  className,
}: TrendIndicatorProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const colorClasses = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    stable: 'text-gray-500 dark:text-gray-400',
  }

  const bgClasses = {
    up: 'bg-green-50 dark:bg-green-900/20',
    down: 'bg-red-50 dark:bg-red-900/20',
    stable: 'bg-gray-50 dark:bg-gray-800/50',
  }

  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus

  const displayValue = Math.abs(value)
  const sign = direction === 'up' ? '+' : direction === 'down' ? '-' : ''

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
        sizeClasses[size],
        colorClasses[direction],
        bgClasses[direction],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {showValue && (
        <span className="font-medium">
          {sign}{displayValue.toFixed(1)}%
        </span>
      )}
    </div>
  )
}
