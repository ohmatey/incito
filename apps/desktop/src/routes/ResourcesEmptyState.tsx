import { useTranslation } from 'react-i18next'
import { FolderArchive, Upload } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface ResourcesEmptyStateProps {
  onUpload?: () => void
}

export function ResourcesEmptyState({ onUpload }: ResourcesEmptyStateProps) {
  const { t } = useTranslation('resources')

  return (
    <EmptyState
      icon={FolderArchive}
      title={t('list.empty')}
      description={t('list.emptyDescription')}
      action={
        onUpload
          ? {
              label: t('list.uploadFirst'),
              onClick: onUpload,
              icon: Upload,
            }
          : undefined
      }
    />
  )
}
