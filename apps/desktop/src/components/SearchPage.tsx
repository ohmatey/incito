import { useState, useEffect, useRef } from 'react'
import type { PromptFile, Tag } from '@/types/prompt'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Filter, X, Search } from 'lucide-react'
import { PromptListItem } from './PromptListItem'
import { cn } from '@/lib/utils'

interface SearchPageProps {
  prompts: PromptFile[]
  tags: Tag[]
  pinnedPromptIds: string[]
  selectedPrompt: PromptFile | null
  onSelectPrompt: (prompt: PromptFile) => void
  onDuplicatePrompt: (prompt: PromptFile) => void
  onDeletePrompt: (prompt: PromptFile) => void
  onTogglePinPrompt: (promptId: string) => void
  focusTrigger?: number
}

export function SearchPage({
  prompts,
  tags,
  pinnedPromptIds,
  selectedPrompt,
  onSelectPrompt,
  onDuplicatePrompt,
  onDeletePrompt,
  onTogglePinPrompt,
  focusTrigger,
}: SearchPageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const resultRefs = useRef<(HTMLDivElement | null)[]>([])

  // Focus search input on mount and when focusTrigger changes (e.g., Cmd+K pressed)
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [focusTrigger])

  // Reset focused index when search query or tag filter changes
  useEffect(() => {
    setFocusedIndex(-1)
  }, [searchQuery, selectedTagFilter])

  // Filter prompts by search query and selected tag
  const filteredPrompts = prompts.filter((prompt) => {
    const matchesSearch =
      prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTag = selectedTagFilter
      ? prompt.tags?.includes(selectedTagFilter)
      : true

    return matchesSearch && matchesTag
  })

  const hasFilters = searchQuery || selectedTagFilter

  function clearFilters() {
    setSearchQuery('')
    setSelectedTagFilter(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (filteredPrompts.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((prev) => {
          const next = prev < filteredPrompts.length - 1 ? prev + 1 : prev
          resultRefs.current[next]?.scrollIntoView({ block: 'nearest' })
          return next
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : -1
          if (next >= 0) {
            resultRefs.current[next]?.scrollIntoView({ block: 'nearest' })
          }
          return next
        })
        break
      case 'Enter':
        if (focusedIndex >= 0 && focusedIndex < filteredPrompts.length) {
          e.preventDefault()
          onSelectPrompt(filteredPrompts[focusedIndex])
        }
        break
      case 'Escape':
        if (focusedIndex >= 0) {
          e.preventDefault()
          setFocusedIndex(-1)
        }
        break
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
        <Search className="h-5 w-5 text-gray-400" />
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Search</h1>
      </div>

      {/* Search Controls */}
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              ref={searchInputRef}
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {tags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn('h-9 w-9 shrink-0 relative', selectedTagFilter && 'border-primary-500')}
                >
                  <Filter className="h-4 w-4" />
                  {selectedTagFilter && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary-500 text-[9px] font-medium text-white">
                      1
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {selectedTagFilter && (
                  <>
                    <DropdownMenuCheckboxItem
                      checked={false}
                      onCheckedChange={() => setSelectedTagFilter(null)}
                    >
                      Clear filter
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {tags.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag.id}
                    checked={selectedTagFilter === tag.name}
                    onCheckedChange={() =>
                      setSelectedTagFilter(selectedTagFilter === tag.name ? null : tag.name)
                    }
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {filteredPrompts.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {hasFilters ? 'No prompts match your search' : 'No prompts found'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredPrompts.map((prompt, index) => (
                <div
                  key={prompt.path}
                  ref={(el) => { resultRefs.current[index] = el }}
                  className={cn(
                    'rounded-md',
                    focusedIndex === index && 'ring-2 ring-primary-500 ring-offset-1'
                  )}
                >
                  <PromptListItem
                    prompt={prompt}
                    isSelected={selectedPrompt?.path === prompt.path}
                    isPinned={pinnedPromptIds.includes(prompt.id)}
                    onSelect={() => onSelectPrompt(prompt)}
                    onDuplicate={() => onDuplicatePrompt(prompt)}
                    onDelete={() => onDeletePrompt(prompt)}
                    onTogglePin={() => onTogglePinPrompt(prompt.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
