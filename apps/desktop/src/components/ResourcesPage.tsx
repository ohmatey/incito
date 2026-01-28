import { useState, useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppContext } from '@/context/AppContext'
import { ResourceList } from './resources/ResourceList'
import { ResourceDetail } from './resources/ResourceDetail'
import { ResourceSidebar } from './resources/ResourceSidebar'
import type { Resource } from '@/types/resource'
import { getAllResources, syncResourcesWithFileSystem } from '@/lib/resources'

interface ResourcesPageComponentProps {
  children?: ReactNode
}

export function ResourcesPageComponent({ children }: ResourcesPageComponentProps) {
  const { t: _t } = useTranslation('resources')
  const { folderPath, panelWidths } = useAppContext()

  const [resources, setResources] = useState<Resource[]>([])
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Load resources on mount
  useEffect(() => {
    async function loadResources() {
      if (!folderPath) return

      setIsLoading(true)

      // Sync with file system first
      await syncResourcesWithFileSystem(folderPath)

      // Then load all resources
      const result = await getAllResources()
      if (result.ok) {
        setResources(result.data)
      }

      setIsLoading(false)
    }
    loadResources()
  }, [folderPath])

  // Filter resources based on search query
  const filteredResources = searchQuery
    ? resources.filter(r =>
        r.fileName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : resources

  // Handle resource selection
  function handleSelectResource(resource: Resource) {
    setSelectedResource(resource)
  }

  // Handle resource upload complete
  function handleUploadComplete(resource: Resource) {
    setResources(prev => [resource, ...prev])
    setSelectedResource(resource)
  }

  // Handle resource delete
  function handleDeleteResource(resourceId: string) {
    setResources(prev => prev.filter(r => r.id !== resourceId))
    if (selectedResource?.id === resourceId) {
      setSelectedResource(null)
    }
  }

  // Handle resource update (e.g., after indexing)
  function handleUpdateResource(updatedResource: Resource) {
    setResources(prev =>
      prev.map(r => r.id === updatedResource.id ? updatedResource : r)
    )
    if (selectedResource?.id === updatedResource.id) {
      setSelectedResource(updatedResource)
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left panel - Resource list */}
      <div
        className="flex flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        style={{ width: panelWidths.promptList }}
      >
        <ResourceList
          resources={filteredResources}
          selectedResource={selectedResource}
          onSelectResource={handleSelectResource}
          onUploadComplete={handleUploadComplete}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isLoading={isLoading}
        />
      </div>

      {/* Center panel - Resource detail or empty state */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedResource ? (
          <ResourceDetail
            resource={selectedResource}
            onDelete={() => handleDeleteResource(selectedResource.id)}
          />
        ) : (
          children
        )}
      </div>

      {/* Right panel - Actions sidebar */}
      {selectedResource && (
        <div
          className="flex flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
          style={{ width: panelWidths.rightPanel }}
        >
          <ResourceSidebar
            resource={selectedResource}
            onResourceUpdate={handleUpdateResource}
            onDelete={() => handleDeleteResource(selectedResource.id)}
          />
        </div>
      )}
    </div>
  )
}
