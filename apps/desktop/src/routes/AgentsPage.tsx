import { Outlet } from '@tanstack/react-router'
import { AgentList } from '@/components/AgentList'

export function AgentsPage() {
  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <AgentList />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
