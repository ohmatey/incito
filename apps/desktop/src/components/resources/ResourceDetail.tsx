import { useTranslation } from 'react-i18next'
import type { Resource } from '@/types/resource'
import { Button } from '@/components/ui/button'
import { PanelLeft, PanelLeftClose } from 'lucide-react'

interface ResourceDetailProps {
  resource: Resource
  onDelete: () => void
  listPanelCollapsed?: boolean
  onToggleListPanel?: () => void
}

export function ResourceDetail({
  resource,
  listPanelCollapsed = false,
  onToggleListPanel,
}: ResourceDetailProps) {
  const { t } = useTranslation('resources')

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2 min-w-0">
          {onToggleListPanel && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleListPanel}
              className="h-8 w-8"
              aria-label={listPanelCollapsed ? t('list.expand') : t('list.collapse')}
            >
              {listPanelCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          )}
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
            {resource.fileName}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <p className="text-lg font-medium">{resource.fileName}</p>
          <p className="text-sm">Resource detail view - coming soon</p>
        </div>
      </div>
    </div>
  )
}
