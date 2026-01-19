import type { Tag } from '@/types/prompt'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface TagBadgeProps {
  tag: Tag
  onRemove?: () => void
  onClick?: () => void
  selected?: boolean
  size?: 'sm' | 'md'
}

export function TagBadge({ tag, onRemove, onClick, selected, size = 'sm' }: TagBadgeProps) {
  const isInteractive = onClick || onRemove

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        isInteractive && 'cursor-pointer',
        selected && 'ring-2 ring-ring ring-offset-1'
      )}
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
        borderColor: tag.color,
      }}
      onClick={onClick}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: tag.color }}
      />
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label={`Remove tag ${tag.name}`}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </span>
  )
}
