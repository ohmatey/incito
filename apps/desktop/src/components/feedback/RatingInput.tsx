import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingInputProps {
  value: number | undefined
  onChange: (value: number) => void
  scale: 5 | 10
  minLabel?: string
  maxLabel?: string
  disabled?: boolean
}

export function RatingInput({
  value,
  onChange,
  scale,
  minLabel = 'Poor',
  maxLabel = 'Excellent',
  disabled = false,
}: RatingInputProps) {
  const { t } = useTranslation('runs')

  // Generate array of rating values
  const ratings = Array.from({ length: scale }, (_, i) => i + 1)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {ratings.map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => !disabled && onChange(rating)}
            disabled={disabled}
            className={cn(
              'p-1 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400',
              value !== undefined && rating <= value
                ? 'text-yellow-400'
                : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300 dark:hover:text-yellow-500',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            aria-label={t('feedback.rating.scale5', { value: rating })}
          >
            <Star
              className={cn(
                'h-5 w-5',
                value !== undefined && rating <= value ? 'fill-current' : ''
              )}
              aria-hidden="true"
            />
          </button>
        ))}
        {value !== undefined && (
          <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {scale === 5
              ? t('feedback.rating.scale5', { value })
              : t('feedback.rating.scale10', { value })}
          </span>
        )}
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}
