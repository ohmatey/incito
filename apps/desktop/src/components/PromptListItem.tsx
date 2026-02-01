import { memo, useState } from 'react'
import type { PromptFile } from '@/types/prompt'
import { useTranslation } from 'react-i18next'
import { useFeatureFlags } from '@/context/FeatureFlagsContext'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
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
import { cn } from '@/lib/utils'
import { AlertTriangle, Copy, Trash2, Pin, PinOff } from 'lucide-react'
import { LanguageBadge } from '@/components/translation/LanguageBadge'
import { useNeedsTranslation } from '@/hooks/usePromptTranslation'

interface PromptListItemProps {
  prompt: PromptFile
  isSelected: boolean
  isPinned: boolean
  onSelect: () => void
  onDuplicate: () => void
  onDelete: () => void
  onTogglePin: () => void
}

// Memoized to prevent re-renders when other list items change (rerender-memo rule)
export const PromptListItem = memo(function PromptListItem({
  prompt,
  isSelected,
  isPinned,
  onSelect,
  onDuplicate,
  onDelete,
  onTogglePin,
}: PromptListItemProps) {
  const { t } = useTranslation(['prompts', 'common'])
  const { featureFlags } = useFeatureFlags()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Check if prompt needs translation (only if translations feature is enabled)
  const { needsTranslation, detectedLanguage, targetLanguage } = useNeedsTranslation(prompt.template)

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={onSelect}
            aria-label={`Select prompt: ${prompt.name}${!prompt.isValid ? ' (has errors)' : ''}`}
            className={cn(
              'group flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-md px-3 py-2 text-left text-sm transition-colors duration-150',
              isSelected
                ? 'bg-gray-200 text-gray-900 font-semibold dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
              !prompt.isValid && !isSelected && 'text-gray-500 dark:text-gray-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
            )}
          >
            {!prompt.isValid && (
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-yellow-500" aria-hidden="true" />
            )}
            {featureFlags.translationsEnabled && needsTranslation && detectedLanguage && targetLanguage && (
              <LanguageBadge
                languageCode={detectedLanguage}
                targetLanguage={targetLanguage}
                size="sm"
              />
            )}
            <span className="flex-1 truncate">{prompt.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
              aria-label={isPinned ? `Unpin ${prompt.name}` : `Pin ${prompt.name}`}
              className={cn(
                'h-6 w-6 flex-shrink-0 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity',
                'opacity-0 group-hover:opacity-100'
              )}
            >
              {isPinned ? (
                <PinOff className="h-4 w-4 text-gray-500" aria-hidden="true" />
              ) : (
                <Pin className="h-4 w-4 text-gray-500" aria-hidden="true" />
              )}
            </button>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={onTogglePin}>
            {isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
            {isPinned ? t('prompts:editor.unpin') : t('prompts:editor.pin')}
          </ContextMenuItem>
          <ContextMenuItem onClick={onDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            {t('prompts:editor.duplicate')}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-500 focus:text-red-500"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('common:buttons.delete')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-800 dark:text-gray-100">{t('prompts:deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              {t('prompts:deleteDialog.description', { name: prompt.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
              {t('common:buttons.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {t('common:buttons.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
})
