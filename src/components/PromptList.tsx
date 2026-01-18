import type { PromptFile } from '@/types/prompt'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PromptListItem } from './PromptListItem'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface PromptListProps {
  prompts: PromptFile[]
  selectedPrompt: PromptFile | null
  onSelectPrompt: (prompt: PromptFile) => void
  onDuplicatePrompt: (prompt: PromptFile) => void
  onDeletePrompt: (prompt: PromptFile) => void
  onNewPrompt: () => void
}

export function PromptList({
  prompts,
  selectedPrompt,
  onSelectPrompt,
  onDuplicatePrompt,
  onDeletePrompt,
  onNewPrompt,
}: PromptListProps) {
  return (
    <div className="flex h-full w-[200px] flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200 px-3 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Prompts</h2>
        <Button
          onClick={onNewPrompt}
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          title="New Prompt"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Prompts list */}
      <ScrollArea className="flex-1 px-2 pt-2">
        <div className="space-y-0.5 pb-2">
          {prompts.length === 0 ? (
            <p className="px-2 py-2 text-xs text-gray-500 dark:text-gray-400">
              No prompts found
            </p>
          ) : (
            prompts.map((prompt) => (
              <PromptListItem
                key={prompt.path}
                prompt={prompt}
                isSelected={selectedPrompt?.path === prompt.path}
                onSelect={() => onSelectPrompt(prompt)}
                onDuplicate={() => onDuplicatePrompt(prompt)}
                onDelete={() => onDeletePrompt(prompt)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
