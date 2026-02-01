import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PassFailToggleProps {
  value: 'pass' | 'fail' | undefined
  onChange: (value: 'pass' | 'fail') => void
  passLabel?: string
  failLabel?: string
  disabled?: boolean
}

export function PassFailToggle({
  value,
  onChange,
  passLabel,
  failLabel,
  disabled = false,
}: PassFailToggleProps) {
  const { t } = useTranslation('runs')

  const pass = passLabel ?? t('feedback.passFail.pass')
  const fail = failLabel ?? t('feedback.passFail.fail')

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => !disabled && onChange('pass')}
        disabled={disabled}
        aria-pressed={value === 'pass'}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400',
          value === 'pass'
            ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700'
            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <Check className="h-4 w-4" aria-hidden="true" />
        {pass}
      </button>

      <button
        type="button"
        onClick={() => !disabled && onChange('fail')}
        disabled={disabled}
        aria-pressed={value === 'fail'}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
          value === 'fail'
            ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700'
            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <X className="h-4 w-4" aria-hidden="true" />
        {fail}
      </button>
    </div>
  )
}
