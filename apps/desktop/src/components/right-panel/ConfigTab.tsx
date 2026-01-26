import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PromptFile } from '@/types/prompt'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Pencil, Trash2 } from 'lucide-react'
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
import { AVAILABLE_LAUNCHERS } from '@/lib/launchers'

interface ConfigTabProps {
  prompt: PromptFile | null
  onEditPrompt: () => void
  onDeletePrompt: () => void
  onDefaultLaunchersChange: (launchers: string[]) => void
}

export function ConfigTab({
  prompt,
  onEditPrompt,
  onDeletePrompt,
  onDefaultLaunchersChange,
}: ConfigTabProps) {
  const { t } = useTranslation(['prompts', 'common'])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  if (!prompt) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('prompts:configTab.selectPrompt')}</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-full flex-col p-4">
        <div className="space-y-3">
          {/* Edit Section */}
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('prompts:configTab.editPrompt')}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('prompts:configTab.editDescription')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onEditPrompt}
              className="mt-3 gap-1.5"
            >
              <Pencil className="h-4 w-4" />
              {t('prompts:configTab.editPrompt')}
            </Button>
          </div>

          {/* Quick Launch Section */}
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('prompts:configTab.quickLaunch')}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('prompts:configTab.quickLaunchDescription')}
            </p>
            <div className="mt-3 space-y-2">
              {AVAILABLE_LAUNCHERS.map((launcher) => {
                const isChecked = prompt?.defaultLaunchers?.includes(launcher.id) ?? false
                return (
                  <div key={launcher.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`launcher-${launcher.id}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const currentLaunchers = prompt?.defaultLaunchers ?? []
                        if (checked) {
                          onDefaultLaunchersChange([...currentLaunchers, launcher.id])
                        } else {
                          onDefaultLaunchersChange(currentLaunchers.filter((id) => id !== launcher.id))
                        }
                      }}
                    />
                    <Label
                      htmlFor={`launcher-${launcher.id}`}
                      className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      {launcher.icon} {launcher.name}
                    </Label>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Delete Section */}
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('prompts:configTab.deletePrompt')}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('prompts:configTab.deleteDescription')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="mt-3 gap-1.5 text-red-500 hover:text-red-600 border-red-200 hover:border-red-300 dark:border-red-900 dark:hover:border-red-800"
            >
              <Trash2 className="h-4 w-4" />
              {t('prompts:configTab.deletePrompt')}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-800 dark:text-gray-100">
              {t('prompts:configTab.deletePrompt')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              {t('prompts:configTab.deleteConfirmDescription', { name: prompt.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
              {t('common:buttons.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeletePrompt}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {t('common:buttons.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
