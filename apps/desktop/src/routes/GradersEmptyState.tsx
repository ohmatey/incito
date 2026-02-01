import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

export function GradersEmptyState() {
  const { t } = useTranslation('graders')

  return (
    <EmptyState
      icon={CheckCircle2}
      title={t('emptyState.title')}
      description={t('emptyState.description')}
    />
  )
}
