import { Outlet } from '@tanstack/react-router'
import { ResourcesPageComponent } from '@/components/ResourcesPage'

export function ResourcesPage() {
  return (
    <ResourcesPageComponent>
      <Outlet />
    </ResourcesPageComponent>
  )
}
