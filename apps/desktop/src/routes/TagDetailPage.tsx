import { useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useAppContext } from '@/context/AppContext'
import { useFeatureFlags } from '@/context/FeatureFlagsContext'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { TagBadge } from '@/components/TagBadge'
import { TagDialog } from '@/components/tags/TagDialog'
import { EmptyState } from '@/components/ui/empty-state'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FileText, Tags, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TagDetailPage() {
  const { t } = useTranslation(['tags', 'common'])
  const navigate = useNavigate()
  const { tagId } = useParams({ strict: false })
  const { tagManager, promptManager, handleUpdateTag, handleDeleteTag } = useAppContext()
  const { featureFlags } = useFeatureFlags()

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Combined memo for tag lookup and filtered prompts (js-combine-iterations)
  const { tag, taggedPrompts } = useMemo(() => {
    const foundTag = tagManager.tags.find((t) => t.id === tagId)
    if (!foundTag) return { tag: undefined, taggedPrompts: [] }

    const prompts = promptManager.prompts.filter(
      (p) => p.tags?.includes(foundTag.name) && !p.variantOf
    )
    return { tag: foundTag, taggedPrompts: prompts }
  }, [tagManager.tags, promptManager.prompts, tagId])

  // TODO: Find all agents with this tag when agents support tags
  const taggedAgents: unknown[] = []

  // Stable callback for navigation (rerender-functional-setstate)
  const handlePromptClick = useCallback((promptId: string) => {
    navigate({ to: '/prompts/$promptId', params: { promptId } })
  }, [navigate])

  const handleEdit = useCallback(async (name: string, color: string) => {
    if (!tagId) return
    await handleUpdateTag(tagId, name, color)
  }, [tagId, handleUpdateTag])

  const handleDelete = useCallback(async () => {
    if (!tagId) return
    await handleDeleteTag(tagId)
    navigate({ to: '/tags' })
  }, [tagId, handleDeleteTag, navigate])

  if (!tag) {
    return (
      <EmptyState
        icon={Tags}
        title={t('common:errors.notFound')}
        description={t('tags:detail.tagNotFound')}
      />
    )
  }

  const hasItems = taggedPrompts.length > 0 || taggedAgents.length > 0

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Header with toolbar */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <TagBadge tag={tag} size="md" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('tags:detail.itemCount', { count: taggedPrompts.length + taggedAgents.length })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEditDialog(true)}
            className="h-8 w-8"
            aria-label={t('tags:editTag')}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            aria-label={t('tags:deleteTag')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {!hasItems ? (
            <EmptyState
              variant="inline"
              icon={Tags}
              title={t('tags:detail.noItems')}
              description={t('tags:detail.noItemsDescription')}
            />
          ) : (
            <div className="max-w-3xl space-y-6">
              {/* Prompts Section */}
              {taggedPrompts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('tags:detail.prompts')}
                  </h3>
                  <div className="space-y-1">
                    {taggedPrompts.map((prompt) => (
                      <button
                        key={prompt.id}
                        onClick={() => handlePromptClick(prompt.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors',
                          'hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
                        )}
                      >
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {prompt.name || prompt.fileName}
                          </p>
                          {prompt.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {prompt.description}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Agents Section - future support */}
              {featureFlags.agentsEnabled && taggedAgents.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('tags:detail.agents')}
                  </h3>
                  <div className="space-y-1">
                    {/* Agent items would go here */}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Edit tag dialog */}
      <TagDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        tag={tag}
        onSave={handleEdit}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-800 dark:text-gray-100">
              {t('tags:deleteTag')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              {t('tags:deleteTagDescription', { name: tag.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
              {t('common:buttons.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {t('common:buttons.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
