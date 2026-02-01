import { useTranslation } from 'react-i18next'
import { Tags } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

export function TagsEmptyState() {
  const { t } = useTranslation('tags')

  return (
    <EmptyState
      icon={Tags}
      title={t('emptyState.title')}
      description={t('emptyState.description')}
    />
  )
}
