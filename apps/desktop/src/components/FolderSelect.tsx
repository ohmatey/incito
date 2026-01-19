import { open } from '@tauri-apps/plugin-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Folder, FileText, Variable, Sparkles } from 'lucide-react'

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-[480px] bg-white border-gray-200 shadow-lg dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-gray-800 dark:text-gray-100">Incito</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Select a folder where your prompt templates are stored, or create a new folder to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="space-y-3 text-sm">
            <h3 className="font-medium text-gray-800 dark:text-gray-200">What is a prompts folder?</h3>
            <p className="text-gray-600 dark:text-gray-400">
              A prompts folder is any directory containing <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">.md</code> (Markdown) files. Each file represents a reusable prompt template.
            </p>
            <div className="space-y-2 pt-2">
              <div className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
                <FileText className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                <span>Store prompts as Markdown files with YAML frontmatter</span>
              </div>
              <div className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
                <Variable className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                <span>Use <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">{"{{variables}}"}</code> in your templates for dynamic content</span>
              </div>
              <div className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
                <Sparkles className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                <span>Fill in variables and copy to any AI assistant</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 pt-2">
            <Button onClick={handleSelectFolder} size="lg" className="gap-2 w-full">
              <Folder className="h-5 w-5" />
              Select Folder
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              You can select an existing folder or create a new one
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
