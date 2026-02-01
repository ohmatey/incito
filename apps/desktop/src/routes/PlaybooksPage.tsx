import { Outlet, useParams } from '@tanstack/react-router'
import { PlaybookList } from '@/components/playbooks/PlaybookList'
import { useLayout } from '@/context/LayoutContext'

export function PlaybooksPage() {
  const { playbookId } = useParams({ strict: false })
  const { listPanelCollapsed } = useLayout()

  // Show list panel when not collapsed OR when no playbook is selected
  const showListPanel = !listPanelCollapsed || !playbookId

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      {showListPanel && <PlaybookList />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
