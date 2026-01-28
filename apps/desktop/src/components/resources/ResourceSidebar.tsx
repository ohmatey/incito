import type { Resource } from '@/types/resource'

interface ResourceSidebarProps {
  resource: Resource
  onResourceUpdate: (updatedResource: Resource) => void
  onDelete: () => void
}

// Stub component - to be implemented
export function ResourceSidebar({ resource }: ResourceSidebarProps) {
  return (
    <div className="flex-1 p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Sidebar for: {resource.fileName}
      </p>
    </div>
  )
}
