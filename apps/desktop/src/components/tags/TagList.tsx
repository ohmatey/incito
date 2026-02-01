import { useState, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useAppContext } from '@/context/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TagBadge } from '@/components/TagBadge'
import { TagDialog } from '@/components/tags/TagDialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Plus, Search, Tags } from 'lucide-react'
import type { Tag } from '@/types/prompt'
import { cn } from '@/lib/utils'

export function TagList() {
  const { t } = useTranslation(['tags', 'common'])
  const navigate = useNavigate()
  const { tagId } = useParams({ strict: false })
  const {
    tagManager,
    promptManager,
    handleCreateTag,
  } = useAppContext()

  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Count prompts/agents using each tag - single pass through prompts (js-combine-iterations)
  const tagUsageCounts = useMemo(() => {
    const counts = new Map<string, number>()
    // Initialize all tags to 0
    for (const tag of tagManager.tags) {
      counts.set(tag.id, 0)
    }
    // Build a name->id lookup for O(1) access (js-index-maps)
    const tagNameToId = new Map<string, string>()
    for (const tag of tagManager.tags) {
      tagNameToId.set(tag.name, tag.id)
    }
    // Single pass through prompts to count all tags
    for (const prompt of promptManager.prompts) {
      if (prompt.tags) {
        for (const tagName of prompt.tags) {
          const tagId = tagNameToId.get(tagName)
          if (tagId) {
            counts.set(tagId, (counts.get(tagId) || 0) + 1)
          }
        }
      }
    }
    return counts
  }, [tagManager.tags, promptManager.prompts])

  // Filter tags by search query
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tagManager.tags
    const query = searchQuery.toLowerCase()
    return tagManager.tags.filter((tag) =>
      tag.name.toLowerCase().includes(query)
    )
  }, [tagManager.tags, searchQuery])

  // Stable callbacks to avoid re-renders (rerender-functional-setstate)
  const handleSelect = useCallback((tag: Tag) => {
    navigate({ to: '/tags/$tagId', params: { tagId: tag.id } })
  }, [navigate])

  const handleCreate = useCallback(async (name: string, color: string) => {
    await handleCreateTag(name, color)
  }, [handleCreateTag])

  return (
    <div className="flex h-full w-[280px] flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200 px-3 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">
          {t('tags:title')}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowCreateDialog(true)}
          className="h-8 w-8"
          aria-label={t('tags:addTag')}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('tags:list.searchPlaceholder')}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {filteredTags.length === 0 ? (
          <EmptyState
            variant="inline"
            icon={Tags}
            title={searchQuery ? t('tags:list.noResults') : t('tags:noTagsYet')}
            action={
              !searchQuery
                ? {
                    label: t('tags:addTag'),
                    onClick: () => setShowCreateDialog(true),
                    icon: Plus,
                    variant: 'outline',
                  }
                : undefined
            }
          />
        ) : (
          <div className="p-2 space-y-1">
            {filteredTags.map((tag) => (
              <div
                key={tag.id}
                className={cn(
                  'group flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition-colors',
                  tag.id === tagId
                    ? 'bg-gray-100 dark:bg-gray-700'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                )}
                onClick={() => handleSelect(tag)}
              >
                <TagBadge tag={tag} size="md" />
                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                  {tagUsageCounts.get(tag.id) || 0}
                </span>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Create tag dialog */}
      <TagDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSave={handleCreate}
      />
    </div>
  )
}
