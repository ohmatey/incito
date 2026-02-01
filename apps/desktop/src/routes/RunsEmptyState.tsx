import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Clock, Plus } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

export function RunsEmptyState() {
  const { t } = useTranslation(['runs', 'customRun'])
  const navigate = useNavigate()

  return (
    <EmptyState
      icon={Clock}
      title={t('runs:empty.selectTitle', 'Select a run')}
      description={t('runs:empty.selectDescription', 'Choose a run from the list to view its details and output.')}
      action={{
        label: t('customRun:newRun', 'New Custom Run'),
        onClick: () => navigate({ to: '/runs/new', search: { base: undefined } }),
        icon: Plus,
      }}
    />
  )
}
