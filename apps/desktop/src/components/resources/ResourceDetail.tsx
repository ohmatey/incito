import type { Resource } from '@/types/resource'

interface ResourceDetailProps {
  resource: Resource
  onDelete: () => void
}

// Stub component - to be implemented
export function ResourceDetail({ resource }: ResourceDetailProps) {
  return (
    <div className="flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400">
      <div className="text-center">
        <p className="text-lg font-medium">{resource.fileName}</p>
        <p className="text-sm">Resource detail view - coming soon</p>
      </div>
    </div>
  )
}
