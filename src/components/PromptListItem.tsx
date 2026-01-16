import type { PromptFile, Tag } from '@/types/prompt'
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
import { AlertTriangle, Copy, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface PromptListItemProps {
  prompt: PromptFile
  isSelected: boolean
  onSelect: () => void
  onDuplicate: () => void
  onDelete: () => void
  tags?: Tag[]
}

export function PromptListItem({
  prompt,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
  tags = [],
}: PromptListItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Get tag colors for this prompt's tags
  const promptTags = (prompt.tags || [])
    .map((tagName) => tags.find((t) => t.name === tagName))
    .filter((t): t is Tag => !!t)

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={onSelect}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150',
              isSelected
                ? 'bg-gray-200 text-gray-900 font-semibold dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
              !prompt.isValid && !isSelected && 'text-gray-500 dark:text-gray-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
            )}
          >
            {!prompt.isValid && (
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-yellow-500" />
            )}
            <span className="flex-1 truncate">{prompt.name}</span>
            {promptTags.length > 0 && (
              <span className="flex items-center gap-0.5 flex-shrink-0">
                {promptTags.slice(0, 3).map((tag) => (
                  <span
                    key={tag.id}
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                    title={tag.name}
                  />
                ))}
                {promptTags.length > 3 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    +{promptTags.length - 3}
                  </span>
                )}
              </span>
            )}
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={onDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-500 focus:text-red-500"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-800 dark:text-gray-100">Delete Prompt</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete "{prompt.name}"? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
