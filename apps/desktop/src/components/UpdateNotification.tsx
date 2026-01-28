import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Progress } from '@/components/ui/progress'
import { Download, Loader2, Sparkles, CheckCircle, AlertCircle } from 'lucide-react'
import { useUpdate } from '@/context/UpdateContext'

export function UpdateNotification() {
  const { t } = useTranslation('updates')
  const {
    updateAvailable,
    isDownloading,
    downloadProgress,
    error,
    showUpToDate,
    installUpdate,
    dismissUpdate,
    dismissUpToDate,
  } = useUpdate()

  // Show "up to date" or error dialog
  if (showUpToDate) {
    return (
      <AlertDialog open={showUpToDate} onOpenChange={(open) => !open && dismissUpToDate()}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              {error ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <AlertDialogTitle>
                {error ? t('errorTitle') : t('upToDateTitle')}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              {error ? t('error', { message: error }) : t('noUpdates')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={dismissUpToDate}>
              {t('ok')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  if (!updateAvailable) {
    return null
  }

  return (
    <AlertDialog open={!!updateAvailable} onOpenChange={(open) => !open && dismissUpdate()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-500" />
            <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                {t('description', { version: updateAvailable.version })}
              </p>

              {updateAvailable.body && (
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('releaseNotes')}
                  </p>
                  <div className="text-sm text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {updateAvailable.body}
                  </div>
                </div>
              )}

              {isDownloading && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('downloading')}</span>
                  </div>
                  <Progress value={downloadProgress} className="h-2" />
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {t('error', { message: error })}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDownloading}>
            {t('later')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              installUpdate()
            }}
            disabled={isDownloading}
            className="gap-2"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {t('updateNow')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
