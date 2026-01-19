import type { PromptFile } from '@/types/prompt'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PromptListItem } from './PromptListItem'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface PromptListProps {
  prompts: PromptFile[]
  pinnedPromptIds: string[]
  selectedPrompt: PromptFile | null
  onSelectPrompt: (prompt: PromptFile) => void
  onDuplicatePrompt: (prompt: PromptFile) => void
  onDeletePrompt: (prompt: PromptFile) => void
  onTogglePinPrompt: (promptId: string) => void
  onNewPrompt: () => void
  width?: number
}

export function PromptList({
  prompts,
  pinnedPromptIds,
  selectedPrompt,
  onSelectPrompt,
  onDuplicatePrompt,
  onDeletePrompt,
  onTogglePinPrompt,
  onNewPrompt,
  width = 200,
}: PromptListProps) {
  // Filter out variants - only show original prompts
  const originalPrompts = prompts.filter((p) => !p.variantOf)

  // Split prompts into pinned and unpinned
  const pinnedPrompts = originalPrompts.filter((p) => pinnedPromptIds.includes(p.id))
  const unpinnedPrompts = originalPrompts.filter((p) => !pinnedPromptIds.includes(p.id))

  // Helper to check if a prompt should be shown as selected
  // (either directly selected, or its variant is selected)
  const isPromptSelected = (prompt: PromptFile) => {
    if (!selectedPrompt) return false
    // Direct selection
    if (selectedPrompt.path === prompt.path) return true
    // Variant of this prompt is selected
    if (selectedPrompt.variantOf === prompt.fileName) return true
    return false
  }
  return (
    <div
      className="flex h-full flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      style={{ width: `${width}px`, minWidth: '150px', maxWidth: '400px' }}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200 px-3 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Prompts</h2>
        <Button
          onClick={onNewPrompt}
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          aria-label="New prompt"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Prompts list */}
      <ScrollArea className="flex-1 [&>div>div]:!block">
        <div className="space-y-0.5 px-2 py-2">
          {originalPrompts.length === 0 ? (
            <p className="px-2 py-2 text-xs text-gray-500 dark:text-gray-400">
              No prompts found
            </p>
          ) : (
            <>
              {pinnedPrompts.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Pinned
                  </div>
                  {pinnedPrompts.map((prompt) => (
                    <PromptListItem
                      key={prompt.path}
                      prompt={prompt}
                      isSelected={isPromptSelected(prompt)}
                      isPinned={true}
                      onSelect={() => onSelectPrompt(prompt)}
                      onDuplicate={() => onDuplicatePrompt(prompt)}
                      onDelete={() => onDeletePrompt(prompt)}
                      onTogglePin={() => onTogglePinPrompt(prompt.id)}
                    />
                  ))}
                  {unpinnedPrompts.length > 0 && (
                    <div className="mx-1 my-2 border-t border-gray-200 dark:border-gray-700" />
                  )}
                </>
              )}
              {unpinnedPrompts.map((prompt) => (
                <PromptListItem
                  key={prompt.path}
                  prompt={prompt}
                  isSelected={isPromptSelected(prompt)}
                  isPinned={false}
                  onSelect={() => onSelectPrompt(prompt)}
                  onDuplicate={() => onDuplicatePrompt(prompt)}
                  onDelete={() => onDeletePrompt(prompt)}
                  onTogglePin={() => onTogglePinPrompt(prompt.id)}
                />
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
