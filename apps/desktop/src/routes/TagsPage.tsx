import { Outlet } from '@tanstack/react-router'
import { TagList } from '@/components/tags/TagList'

export function TagsPage() {
  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <TagList />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
