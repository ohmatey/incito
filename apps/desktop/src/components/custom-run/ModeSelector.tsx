import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FilePlus, FileText, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PromptFile } from '@/types/prompt'
import type { CustomRunMode } from '@/types/custom-run'

interface ModeSelectorProps {
  onSelectMode: (mode: CustomRunMode) => void
  onSelectPrompt: (prompt: PromptFile) => void
  prompts: PromptFile[]
}

export function ModeSelector({ onSelectMode, onSelectPrompt, prompts }: ModeSelectorProps) {
  const { t } = useTranslation('customRun')
  const [selectedMode, setSelectedMode] = useState<CustomRunMode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter prompts by search query
  const filteredPrompts = prompts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // If user selected 'existing', show prompt picker
  if (selectedMode === 'existing') {
    return (
      <div className="w-full max-w-md space-y-4 p-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('modeSelector.selectPrompt')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('modeSelector.selectPromptDescription')}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder={t('modeSelector.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Prompt list */}
        <ScrollArea className="h-64 rounded-lg border border-gray-200 dark:border-gray-700">
          {filteredPrompts.length === 0 ? (
            <div className="flex h-full items-center justify-center p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('modeSelector.noPrompts')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => onSelectPrompt(prompt)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {prompt.name}
                  </div>
                  {prompt.description && (
                    <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                      {prompt.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Back button */}
        <Button variant="outline" onClick={() => setSelectedMode(null)} className="w-full">
          {t('modeSelector.back')}
        </Button>
      </div>
    )
  }

  // Initial mode selection
  return (
    <div className="w-full max-w-lg space-y-6 p-4">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t('modeSelector.title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('modeSelector.description')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Start from scratch */}
        <button
          onClick={() => onSelectMode('scratch')}
          className={cn(
            'flex flex-col items-center gap-3 rounded-lg border-2 border-gray-200 p-6 transition-colors',
            'hover:border-blue-500 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/20'
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <FilePlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-1 text-center">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {t('modeSelector.scratch.title')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t('modeSelector.scratch.description')}
            </div>
          </div>
        </button>

        {/* Start from existing */}
        <button
          onClick={() => setSelectedMode('existing')}
          className={cn(
            'flex flex-col items-center gap-3 rounded-lg border-2 border-gray-200 p-6 transition-colors',
            'hover:border-green-500 hover:bg-green-50 dark:border-gray-700 dark:hover:border-green-500 dark:hover:bg-green-900/20'
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-1 text-center">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {t('modeSelector.existing.title')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t('modeSelector.existing.description')}
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
