import type { PromptFile } from '@/types/prompt'
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
import { useState } from 'react'

interface PromptListItemProps {
  prompt: PromptFile
  isSelected: boolean
  isPinned: boolean
  onSelect: () => void
  onDuplicate: () => void
  onDelete: () => void
  onTogglePin: () => void
}

export function PromptListItem({
  prompt,
  isSelected,
  isPinned,
  onSelect,
  onDuplicate,
  onDelete,
  onTogglePin,
}: PromptListItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={onSelect}
            className={cn(
              'group flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-md px-3 py-2 text-left text-sm transition-colors duration-150',
              isSelected
                ? 'bg-gray-200 text-gray-900 font-semibold dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
              !prompt.isValid && !isSelected && 'text-gray-500 dark:text-gray-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
            )}
          >
            {!prompt.isValid && (
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-yellow-500" />
            )}
            {isPinned && prompt.isValid && (
              <Pin className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            )}
            <span className="flex-1 truncate">{prompt.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
              className={cn(
                'h-6 w-6 flex-shrink-0 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity',
                isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
            >
              {isPinned ? (
                <PinOff className="h-3.5 w-3.5 text-gray-500" />
              ) : (
                <Pin className="h-3.5 w-3.5 text-gray-500" />
              )}
            </button>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={onTogglePin}>
            {isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
            {isPinned ? 'Unpin' : 'Pin'}
          </ContextMenuItem>
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
