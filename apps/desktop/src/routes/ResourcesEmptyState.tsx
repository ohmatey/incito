import { useTranslation } from 'react-i18next'
import { FolderArchive, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ResourcesEmptyStateProps {
  onUpload?: () => void
}

export function ResourcesEmptyState({ onUpload }: ResourcesEmptyStateProps) {
  const { t } = useTranslation('resources')

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
        <FolderArchive className="h-10 w-10 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
        {t('list.empty')}
      </h3>
      <p className="mb-6 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        {t('list.emptyDescription')}
      </p>
      {onUpload && (
        <Button onClick={onUpload} className="gap-2">
          <Upload className="h-4 w-4" />
          {t('list.uploadFirst')}
        </Button>
      )}
    </div>
  )
}
