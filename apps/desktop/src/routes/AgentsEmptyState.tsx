import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { Bot, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 bg-gray-50 px-8 text-center dark:bg-gray-900">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
        <Bot className="h-8 w-8 text-gray-500 dark:text-gray-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('emptyState.title')}
        </h2>
        <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {t('emptyState.description')}
        </p>
      </div>
      <Button
        onClick={handleCreate}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        {t('emptyState.createButton')}
      </Button>
    </div>
  )
}
