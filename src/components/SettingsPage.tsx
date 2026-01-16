import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FolderOpen, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

interface SettingsPageProps {
  folderPath: string
  onChangeFolder: () => void
}

export function SettingsPage({ folderPath, onChangeFolder }: SettingsPageProps) {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 bg-white dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Settings</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure your Prompt Studio preferences
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="max-w-2xl space-y-6">
            {/* Appearance */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Appearance</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose your preferred color theme.
              </p>
              <RadioGroup
                value={theme}
                onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
                className="grid grid-cols-3 gap-3"
              >
                <Label
                  htmlFor="theme-light"
                  className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer transition-all duration-150 hover:bg-gray-50 [&:has([data-state=checked])]:border-primary-500 [&:has([data-state=checked])]:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:[&:has([data-state=checked])]:bg-primary-900/20"
                >
                  <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                  <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Light</span>
                </Label>
                <Label
                  htmlFor="theme-dark"
                  className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer transition-all duration-150 hover:bg-gray-50 [&:has([data-state=checked])]:border-primary-500 [&:has([data-state=checked])]:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:[&:has([data-state=checked])]:bg-primary-900/20"
                >
                  <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                  <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark</span>
                </Label>
                <Label
                  htmlFor="theme-system"
                  className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer transition-all duration-150 hover:bg-gray-50 [&:has([data-state=checked])]:border-primary-500 [&:has([data-state=checked])]:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:[&:has([data-state=checked])]:bg-primary-900/20"
                >
                  <RadioGroupItem value="system" id="theme-system" className="sr-only" />
                  <Monitor className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">System</span>
                </Label>
              </RadioGroup>
            </div>

            {/* Prompts Folder */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Prompts Folder</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The folder where your prompt templates are stored.
              </p>
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                <code className="flex-1 text-sm text-gray-600 truncate font-mono dark:text-gray-400">
                  {folderPath}
                </code>
                <Button variant="secondary" onClick={onChangeFolder} className="gap-2 shrink-0">
                  <FolderOpen className="h-4 w-4" />
                  Change Folder
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
