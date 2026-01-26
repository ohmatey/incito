import { useTranslation } from 'react-i18next'
import { open } from '@tauri-apps/plugin-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Folder, FileText, Variable, Sparkles } from 'lucide-react'

interface FolderSelectProps {
  onFolderSelect: (path: string) => void
}

export function FolderSelect({ onFolderSelect }: FolderSelectProps) {
  const { t } = useTranslation('prompts')

  async function handleSelectFolder() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: t('folderSelect.selectFolderTitle'),
    })

    if (selected && typeof selected === 'string') {
      onFolderSelect(selected)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-[480px] bg-white border-gray-200 shadow-lg dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-gray-800 dark:text-gray-100">{t('folderSelect.title')}</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            {t('folderSelect.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="space-y-3 text-sm">
            <h3 className="font-medium text-gray-800 dark:text-gray-200">{t('folderSelect.whatIsFolder')}</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('folderSelect.folderExplanation')} <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">.md</code> {t('folderSelect.mdFiles')}
            </p>
            <div className="space-y-2 pt-2">
              <div className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
                <FileText className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                <span>{t('folderSelect.feature1')}</span>
              </div>
              <div className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
                <Variable className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                <span>{t('folderSelect.feature2')} <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">{t('folderSelect.feature2Variables')}</code> {t('folderSelect.feature2Suffix')}</span>
              </div>
              <div className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
                <Sparkles className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                <span>{t('folderSelect.feature3')}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 pt-2">
            <Button onClick={handleSelectFolder} size="lg" className="gap-2 w-full">
              <Folder className="h-5 w-5" />
              {t('common:buttons.selectFolder')}
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {t('folderSelect.selectFolderHint')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
