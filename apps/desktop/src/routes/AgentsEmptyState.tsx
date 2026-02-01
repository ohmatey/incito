import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { Bot, Plus } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { useAppContext } from '@/context/AppContext'

export function AgentsEmptyState() {
  const { t } = useTranslation('agents')
  const navigate = useNavigate()
  const { handleCreateAgent } = useAppContext()

  async function handleCreate() {
    const newAgent = await handleCreateAgent()
    if (newAgent) {
      navigate({ to: '/agents/$agentId', params: { agentId: newAgent.id }, search: { edit: true } })
    }
  }

  return (
    <EmptyState
      icon={Bot}
      title={t('emptyState.title')}
      description={t('emptyState.description')}
      action={{
        label: t('emptyState.createButton'),
        onClick: handleCreate,
        icon: Plus,
      }}
    />
  )
}
