import { Outlet, useParams } from '@tanstack/react-router'
import { AgentList } from '@/components/AgentList'
import { useLayout } from '@/context/LayoutContext'

export function AgentsPage() {
  const { agentId } = useParams({ strict: false })
  const { listPanelCollapsed } = useLayout()

  // Show list panel when not collapsed OR when no agent is selected
  const showListPanel = !listPanelCollapsed || !agentId

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      {showListPanel && <AgentList />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
