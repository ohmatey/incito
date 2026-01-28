import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useAppContext } from '@/context/AppContext'
import { AgentChatContainer } from '@/components/chat/AgentChatContainer'
import { AgentEditor } from '@/components/AgentEditor'
import type { AgentFile } from '@/types/agent'

export function AgentDetail() {
  const { agentId } = useParams({ from: '/agents/$agentId' })
  const navigate = useNavigate()
  const { t } = useTranslation('agents')
  const { agentManager, tagManager } = useAppContext()

  // Check if we should open in edit mode (from URL search params)
  const search = useSearch({ from: '/agents/$agentId' })
  const [isEditMode, setIsEditMode] = useState(search.edit === true)

  const agent = agentManager.agents.find((a) => a.id === agentId)

  useEffect(() => {
    if (agent) {
      agentManager.selectAgent(agent)
    }
  }, [agent, agentManager])

  // Update edit mode when search params change
  useEffect(() => {
    if (search.edit === true) {
      setIsEditMode(true)
    }
  }, [search.edit])

  async function handleSave(updatedAgent: AgentFile) {
    const success = await agentManager.save(updatedAgent)
    if (success) {
      setIsEditMode(false)
      // Remove edit param from URL
      navigate({ to: '/agents/$agentId', params: { agentId }, search: { edit: false }, replace: true })
    }
  }

  function handleCancel() {
    setIsEditMode(false)
    // Remove edit param from URL
    navigate({ to: '/agents/$agentId', params: { agentId }, search: { edit: false }, replace: true })
  }

  if (!agent) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 bg-gray-50 px-8 text-center dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('notFound')}
        </p>
        <button
          onClick={() => navigate({ to: '/agents' })}
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          {t('backToAgents')}
        </button>
      </div>
    )
  }

  if (isEditMode) {
    return (
      <AgentEditor
        agent={agent}
        tags={tagManager.tags}
        onSave={handleSave}
        onCancel={handleCancel}
        onCreateTag={tagManager.createTag}
      />
    )
  }

  return <AgentChatContainer agent={agent} onEdit={() => setIsEditMode(true)} />
}
