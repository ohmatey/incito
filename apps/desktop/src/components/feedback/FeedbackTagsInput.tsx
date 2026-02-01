import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface FeedbackTagsInputProps {
  value: string[] | undefined
  onChange: (value: string[]) => void
  options: string[]
  disabled?: boolean
}

export function FeedbackTagsInput({
  value = [],
  onChange,
  options,
  disabled = false,
}: FeedbackTagsInputProps) {
  function toggleTag(tag: string) {
    if (disabled) return

    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag))
    } else {
      onChange([...value, tag])
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((tag) => {
        const isSelected = value.includes(tag)
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            disabled={disabled}
            className={cn(
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded',
              disabled && 'cursor-not-allowed'
            )}
          >
            <Badge
              variant={isSelected ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer transition-colors',
                isSelected && 'bg-blue-500 hover:bg-blue-600 text-white',
                !isSelected && 'hover:bg-gray-100 dark:hover:bg-gray-800',
                disabled && 'opacity-50'
              )}
            >
              {tag}
            </Badge>
          </button>
        )
      })}
    </div>
  )
}
