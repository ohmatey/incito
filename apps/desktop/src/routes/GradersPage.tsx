import { Outlet, useParams } from '@tanstack/react-router'
import { GraderList } from '@/components/graders/GraderList'
import { useLayout } from '@/context/LayoutContext'

export function GradersPage() {
  const { graderId } = useParams({ strict: false })
  const { listPanelCollapsed } = useLayout()

  // Show list panel when not collapsed OR when no grader is selected
  const showListPanel = !listPanelCollapsed || !graderId

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      {showListPanel && <GraderList />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
