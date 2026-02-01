import { useTranslation } from 'react-i18next'
import { open } from '@tauri-apps/plugin-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Upload, Loader2, FolderArchive } from 'lucide-react'
import { ResourceListItem } from './ResourceListItem'
import { EmptyState } from '@/components/ui/empty-state'
import type { Resource } from '@/types/resource'
import { createResource } from '@/lib/resources'
import { isSupportedExtension } from '@/types/resource'
import { useAppContext } from '@/context/AppContext'
import { toast } from 'sonner'

interface ResourceListProps {
  resources: Resource[]
  selectedResource: Resource | null
  onSelectResource: (resource: Resource) => void
  onUploadComplete: (resource: Resource) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  isLoading: boolean
}

export function ResourceList({
  resources,
  selectedResource,
  onSelectResource,
  onUploadComplete,
  searchQuery,
  onSearchChange,
  isLoading,
}: ResourceListProps) {
  const { t } = useTranslation('resources')
  const { folderPath } = useAppContext()

  async function handleUpload() {
    if (!folderPath) return

    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Supported Files',
            extensions: ['txt', 'md', 'json', 'csv', 'xml', 'yaml', 'yml', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'pdf'],
          },
        ],
      })

      if (!selected) return

      const filePath = typeof selected === 'string' ? selected : selected[0]
      if (!filePath) return

      // Extract filename from path
      const fileName = filePath.split(/[/\\]/).pop() || 'unknown'

      if (!isSupportedExtension(fileName)) {
        toast.error(t('errors.unsupportedType'))
        return
      }

      const result = await createResource(filePath, fileName, folderPath)
      if (result.ok) {
        onUploadComplete(result.data)
        toast.success(t('success.uploaded'))
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      toast.error(t('errors.uploadFailed'))
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200 px-3 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('title')}
        </h2>
        <Button variant="ghost" size="icon" onClick={handleUpload} className="h-8 w-8">
          <Upload className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="border-b border-gray-200 p-2 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('list.search')}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : resources.length === 0 ? (
            <EmptyState
              variant="inline"
              icon={FolderArchive}
              title={searchQuery ? t('common:labels.noResults') : t('list.empty')}
            />
          ) : (
            <div className="space-y-1">
              {resources.map((resource) => (
                <ResourceListItem
                  key={resource.id}
                  resource={resource}
                  isSelected={selectedResource?.id === resource.id}
                  onClick={() => onSelectResource(resource)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
