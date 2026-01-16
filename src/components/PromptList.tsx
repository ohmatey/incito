import type { PromptFile, Tag } from '@/types/prompt'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PromptListItem } from './PromptListItem'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Tags, Filter, Settings, ChevronLeft, ChevronRight, Plus, FileText } from 'lucide-react'
import { Kbd } from '@/context/PlatformContext'
import { cn } from '@/lib/utils'

interface PromptListProps {
  prompts: PromptFile[]
  selectedPrompt: PromptFile | null
  onSelectPrompt: (prompt: PromptFile) => void
  onDuplicatePrompt: (prompt: PromptFile) => void
  onDeletePrompt: (prompt: PromptFile) => void
  currentView: 'prompts' | 'tags' | 'settings'
  onViewChange: (view: 'prompts' | 'tags' | 'settings') => void
  tags: Tag[]
  selectedTagFilter: string | null
  onTagFilterChange: (tagName: string | null) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  searchInputRef?: React.RefObject<HTMLInputElement>
  isCollapsed: boolean
  onToggleCollapse: () => void
  onNewPrompt: () => void
}

export function PromptList({
  prompts,
  selectedPrompt,
  onSelectPrompt,
  onDuplicatePrompt,
  onDeletePrompt,
  currentView,
  onViewChange,
  tags,
  selectedTagFilter,
  onTagFilterChange,
  searchQuery,
  onSearchChange,
  searchInputRef,
  isCollapsed,
  onToggleCollapse,
  onNewPrompt,
}: PromptListProps) {
  return (
    <div
      className={cn(
        'flex h-full flex-col border-r border-gray-200 bg-white transition-all duration-200 dark:border-gray-700 dark:bg-gray-800',
        isCollapsed ? 'w-[60px]' : 'w-[260px]'
      )}
    >
      {/* Logo and collapse button */}
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3 dark:border-gray-700">
        {!isCollapsed && (
          <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Prompt Studio
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className={cn('h-8 w-8 shrink-0', isCollapsed && 'mx-auto')}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* New Prompt button */}
      <div className="border-b border-gray-200 px-3 py-3 dark:border-gray-700">
        <Button
          onClick={onNewPrompt}
          className={cn(isCollapsed ? 'w-full px-0' : 'w-full justify-between')}
          size={isCollapsed ? 'icon' : 'default'}
        >
          {isCollapsed ? (
            <Plus className="h-4 w-4" />
          ) : (
            <>
              <span>New Prompt</span>
              <Kbd shortcut="ModN" />
            </>
          )}
        </Button>
      </div>

      {/* Search and filter - hidden when collapsed */}
      {!isCollapsed && (
        <div className="border-b border-gray-200 px-3 py-3 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                ref={searchInputRef}
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-9 pr-12 text-sm"
              />
              <Kbd shortcut="ModK" className="absolute right-1.5 top-1/2 -translate-y-1/2" />
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
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] font-medium text-white">
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
                        onCheckedChange={() => onTagFilterChange(null)}
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
                        onTagFilterChange(selectedTagFilter === tag.name ? null : tag.name)
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
          </div>
        </div>
      )}

      {/* Prompts list - hidden when collapsed */}
      {!isCollapsed && (
        <ScrollArea className="flex-1 px-3 pt-3">
          <div className="space-y-1 pb-3">
            {prompts.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No prompts found
              </p>
            ) : (
              prompts.map((prompt) => (
                <PromptListItem
                  key={prompt.path}
                  prompt={prompt}
                  isSelected={currentView === 'prompts' && selectedPrompt?.path === prompt.path}
                  onSelect={() => {
                    onViewChange('prompts')
                    onSelectPrompt(prompt)
                  }}
                  onDuplicate={() => onDuplicatePrompt(prompt)}
                  onDelete={() => onDeletePrompt(prompt)}
                  tags={tags}
                />
              ))
            )}
          </div>
        </ScrollArea>
      )}

      {/* Prompts icon when collapsed - click to expand */}
      {isCollapsed && (
        <div className="px-3 py-2">
          <button
            onClick={onToggleCollapse}
            className={cn(
              'flex w-full items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
              currentView === 'prompts'
                ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            )}
          >
            <FileText className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Spacer when collapsed */}
      {isCollapsed && <div className="flex-1" />}

      {/* Bottom menu items */}
      <div className="border-t border-gray-200 px-3 py-3 space-y-1 dark:border-gray-700">
        <button
          onClick={() => onViewChange('tags')}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors duration-150',
            currentView === 'tags'
              ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700',
            isCollapsed && 'justify-center px-0'
          )}
        >
          <Tags className="h-4 w-4" />
          {!isCollapsed && <span>Tags</span>}
        </button>
        <button
          onClick={() => onViewChange('settings')}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors duration-150',
            currentView === 'settings'
              ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700',
            isCollapsed && 'justify-center px-0'
          )}
        >
          <Settings className="h-4 w-4" />
          {!isCollapsed && <span>Settings</span>}
        </button>
      </div>
    </div>
  )
}
