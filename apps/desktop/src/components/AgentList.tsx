import { useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from '@tanstack/react-router'
import type { AgentFile } from '@/types/agent'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AgentListItem } from './AgentListItem'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'

export function AgentList() {
  const { t } = useTranslation('agents')
  const navigate = useNavigate()
  const params = useParams({ strict: false })
  const currentAgentId = params && 'agentId' in params ? params.agentId : undefined

  const { agentManager, handleCreateAgent } = useAppContext()
  const { agents, pinnedAgentIds, pinAgent, unpinAgent, remove } = agentManager

  // Convert to Sets for O(1) lookups
  const pinnedSet = useMemo(() => new Set(pinnedAgentIds), [pinnedAgentIds])

  // Split agents into pinned and unpinned
  const { pinnedAgents, unpinnedAgents } = useMemo(() => {
    const pinned: AgentFile[] = []
    const unpinned: AgentFile[] = []

    for (const agent of agents) {
      if (pinnedSet.has(agent.id)) {
        pinned.push(agent)
      } else {
        unpinned.push(agent)
      }
    }

    return { pinnedAgents: pinned, unpinnedAgents: unpinned }
  }, [agents, pinnedSet])

  const handleSelectAgent = useCallback(
    (agent: AgentFile) => {
      navigate({ to: '/agents/$agentId', params: { agentId: agent.id }, search: { edit: false } })
    },
    [navigate]
  )

  const handleTogglePin = useCallback(
    (agentId: string) => {
      if (pinnedSet.has(agentId)) {
        unpinAgent(agentId)
      } else {
        pinAgent(agentId)
      }
    },
    [pinnedSet, pinAgent, unpinAgent]
  )

  const handleDelete = useCallback(
    async (agent: AgentFile) => {
      await remove(agent)
      // Navigate away if deleted the current agent
      if (currentAgentId === agent.id) {
        navigate({ to: '/agents' })
      }
    },
    [remove, currentAgentId, navigate]
  )

  const handleCreate = useCallback(async () => {
    const newAgent = await handleCreateAgent()
    if (newAgent) {
      navigate({ to: '/agents/$agentId', params: { agentId: newAgent.id }, search: { edit: true } })
    }
  }, [handleCreateAgent, navigate])

  return (
    <div
      className="flex h-full flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      style={{ width: 200 }}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200 px-3 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('list.title')}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCreate}
          className="h-8 w-8"
          title={t('list.newAgent')}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Agent List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Pinned Agents */}
          {pinnedAgents.length > 0 && (
            <div className="mb-2">
              <div className="mb-1 px-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                {t('list.pinned')}
              </div>
              {pinnedAgents.map((agent) => (
                <AgentListItem
                  key={agent.id}
                  agent={agent}
                  isSelected={currentAgentId === agent.id}
                  isPinned={true}
                  onSelect={() => handleSelectAgent(agent)}
                  onTogglePin={() => handleTogglePin(agent.id)}
                  onDelete={() => handleDelete(agent)}
                />
              ))}
            </div>
          )}

          {/* All Agents */}
          {unpinnedAgents.length > 0 && (
            <div>
              {pinnedAgents.length > 0 && (
                <div className="mb-1 px-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  {t('list.all')}
                </div>
              )}
              {unpinnedAgents.map((agent) => (
                <AgentListItem
                  key={agent.id}
                  agent={agent}
                  isSelected={currentAgentId === agent.id}
                  isPinned={false}
                  onSelect={() => handleSelectAgent(agent)}
                  onTogglePin={() => handleTogglePin(agent.id)}
                  onDelete={() => handleDelete(agent)}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {agents.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('list.empty')}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
