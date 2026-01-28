import { useTranslation } from 'react-i18next'
import { FileText, Image, FileCode, FileType, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Resource, ResourceType } from '@/types/resource'
import { formatFileSize } from '@/types/resource'

interface ResourceListItemProps {
  resource: Resource
  isSelected: boolean
  onClick: () => void
}

function getResourceIcon(fileType: ResourceType) {
  switch (fileType) {
    case 'image':
      return Image
    case 'text':
      return FileText
    case 'markdown':
      return FileCode
    case 'pdf':
      return FileType
    default:
      return File
  }
}

export function ResourceListItem({ resource, isSelected, onClick }: ResourceListItemProps) {
  const { t } = useTranslation('resources')
  const Icon = getResourceIcon(resource.fileType)

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
        'hover:bg-gray-100 dark:hover:bg-gray-700',
        isSelected && 'bg-gray-100 dark:bg-gray-700'
      )}
    >
      {/* Thumbnail or icon */}
      {resource.thumbnailBase64 ? (
        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded border border-gray-200 dark:border-gray-600">
          <img
            src={`data:image/png;base64,${resource.thumbnailBase64}`}
            alt={resource.fileName}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-gray-100 dark:bg-gray-700">
          <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </div>
      )}

      {/* File info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
          {resource.fileName}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t(`types.${resource.fileType}`)} • {formatFileSize(resource.fileSize)}
        </p>
      </div>

      {/* Indexed indicator */}
      {resource.indexed && (
        <div className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" title="Indexed" />
      )}
    </button>
  )
}
