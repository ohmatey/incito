import { open } from '@tauri-apps/plugin-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Folder } from 'lucide-react'

interface FolderSelectProps {
  onFolderSelect: (path: string) => void
}

export function FolderSelect({ onFolderSelect }: FolderSelectProps) {
  async function handleSelectFolder() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Prompts Folder',
    })

    if (selected && typeof selected === 'string') {
      onFolderSelect(selected)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-[400px] bg-white border-gray-200 shadow-lg dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-gray-800 dark:text-gray-100">Prompt Studio</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Select your prompts folder to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Button onClick={handleSelectFolder} size="lg" className="gap-2">
            <Folder className="h-5 w-5" />
            Select Folder
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
