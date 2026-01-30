import { useTranslation } from 'react-i18next'
import { FlaskConical } from 'lucide-react'

export function GradersEmptyState() {
  const { t } = useTranslation('graders')

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 bg-gray-50 px-8 text-center dark:bg-gray-900">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
        <FlaskConical className="h-8 w-8 text-gray-500 dark:text-gray-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('emptyState.title')}
        </h2>
        <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {t('emptyState.description')}
        </p>
      </div>
    </div>
  )
}
