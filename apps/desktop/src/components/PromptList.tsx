import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { PromptFile } from '@/types/prompt'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PromptListItem } from './PromptListItem'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Filter, Plus } from 'lucide-react'

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
  const { t } = useTranslation('prompts')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Get all unique tags from prompts
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    prompts.forEach((p) => p.tags?.forEach((tag) => tagSet.add(tag)))
    return Array.from(tagSet).sort()
  }, [prompts])

  // Toggle a tag in the filter - use functional setState for stable callback
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }, [])

  // Clear all tag filters
  const clearFilters = useCallback(() => setSelectedTags([]), [])

  // Convert to Sets for O(1) lookups instead of O(n) Array.includes
  const selectedTagSet = useMemo(() => new Set(selectedTags), [selectedTags])
  const pinnedSet = useMemo(() => new Set(pinnedPromptIds), [pinnedPromptIds])

  // Single-pass filtering: combine variant filter, tag filter, and pinned split
  // This replaces 4 separate filter operations with 1 loop
  const { pinnedPrompts, unpinnedPrompts, filteredCount } = useMemo(() => {
    const pinned: PromptFile[] = []
    const unpinned: PromptFile[] = []

    for (const p of prompts) {
      // Skip variants
      if (p.variantOf) continue

      // Apply tag filter if tags are selected
      if (selectedTagSet.size > 0) {
        const hasMatchingTag = p.tags?.some((tag) => selectedTagSet.has(tag))
        if (!hasMatchingTag) continue
      }

      // Split into pinned/unpinned
      if (pinnedSet.has(p.id)) {
        pinned.push(p)
      } else {
        unpinned.push(p)
      }
    }

    return {
      pinnedPrompts: pinned,
      unpinnedPrompts: unpinned,
      filteredCount: pinned.length + unpinned.length,
    }
  }, [prompts, selectedTagSet, pinnedSet])

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
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('list.title')}</h2>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={`relative h-8 w-8 ${selectedTags.length > 0 ? 'text-blue-600 dark:text-blue-400' : ''}`}
                aria-label={t('tags.filterByTag')}
              >
                <Filter className="h-4 w-4" />
                {selectedTags.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                    {selectedTags.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {allTags.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-gray-500">{t('tags.noTags')}</div>
              ) : (
                <>
                  {allTags.map((tag) => (
                    <DropdownMenuCheckboxItem
                      key={tag}
                      checked={selectedTagSet.has(tag)}
                      onCheckedChange={() => toggleTag(tag)}
                    >
                      {tag}
                    </DropdownMenuCheckboxItem>
                  ))}
                  {selectedTags.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem
                        checked={false}
                        onCheckedChange={clearFilters}
                        className="text-gray-500"
                      >
                        {t('tags.clearFilters')}
                      </DropdownMenuCheckboxItem>
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={onNewPrompt}
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={t('list.newPrompt')}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Prompts list */}
      <ScrollArea className="flex-1 [&>div>div]:!block">
        <div className="space-y-0.5 px-2 py-2">
          {filteredCount === 0 ? (
            <p className="px-2 py-2 text-xs text-gray-500 dark:text-gray-400">
              {selectedTags.length > 0 ? t('list.filtered') : t('list.empty')}
            </p>
          ) : (
            <>
              {pinnedPrompts.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t('list.pinned')}
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
