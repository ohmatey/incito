import { useTranslation } from 'react-i18next'
import { BookOpen } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

export function PlaybooksEmptyState() {
  const { t } = useTranslation('playbooks')

  return (
    <EmptyState
      icon={BookOpen}
      title={t('emptyState.title')}
      description={t('emptyState.description')}
    />
  )
}
