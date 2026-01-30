import { memo } from 'react'
import { X, FileText, File, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatAttachment } from '@/types/agent'

interface AttachmentPreviewProps {
  attachment: ChatAttachment
  onRemove?: () => void
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const sizeClasses = {
  sm: 'h-12 w-12',
  md: 'h-20 w-20',
  lg: 'h-32 w-32',
}

const iconSizes = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
}

function getFileIcon(type: ChatAttachment['type']) {
  switch (type) {
    case 'image':
      return ImageIcon
    case 'pdf':
      return FileText
    case 'text':
      return FileText
    default:
      return File
  }
}

export const AttachmentPreview = memo(function AttachmentPreview({
  attachment,
  onRemove,
  size = 'md',
  onClick,
}: AttachmentPreviewProps) {
  const isImage = attachment.type === 'image'
  const Icon = getFileIcon(attachment.type)

  return (
    <div
      className={cn(
        'group relative flex-shrink-0 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800',
        sizeClasses[size],
        onClick && 'cursor-pointer hover:border-gray-300 dark:hover:border-gray-600'
      )}
      onClick={onClick}
    >
      {isImage && attachment.previewUrl ? (
        <img
          src={attachment.previewUrl}
          alt={attachment.fileName}
          className="h-full w-full rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-1">
          <Icon className={cn('text-gray-400 dark:text-gray-500', iconSizes[size])} />
          <span className="max-w-full truncate px-1 text-[9px] text-gray-500 dark:text-gray-400">
            {attachment.fileName}
          </span>
        </div>
      )}

      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-white opacity-0 transition-opacity hover:bg-gray-700 group-hover:opacity-100 dark:bg-gray-600 dark:hover:bg-gray-500"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
})
