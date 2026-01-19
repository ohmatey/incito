import { useState } from 'react'
import type { PromptFile } from '@/types/prompt'
import { Button } from '@/components/ui/button'
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
import { Pencil, Eye, History, StickyNote, Settings2, List, Save } from 'lucide-react'

export type RightPanelTab = 'preview' | 'history' | 'notes' | 'config' | 'instructions'

interface PromptHeaderProps {
  prompt: PromptFile | null
  isEditMode: boolean
  rightPanelOpen: boolean
  hasUnsavedChanges: boolean
  nameError: string | null
  onEditModeChange: (editMode: boolean) => void
  onRightPanelOpenChange: (open: boolean) => void
  onTabChange: (tab: RightPanelTab) => void
  onSave: () => void
  onCancel: () => void
}

export function PromptHeader({
  prompt,
  isEditMode,
  rightPanelOpen,
  hasUnsavedChanges,
  nameError,
  onEditModeChange,
  onRightPanelOpenChange,
  onTabChange,
  onSave,
  onCancel,
}: PromptHeaderProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  function handleCancelClick() {
    if (hasUnsavedChanges) {
      setShowCancelDialog(true)
    } else {
      onCancel()
    }
  }

  function handleConfirmCancel() {
    setShowCancelDialog(false)
    onCancel()
  }

  const tabLabels: Record<RightPanelTab, string> = {
    preview: 'Prompt',
    history: 'History',
    notes: 'Notes',
    config: 'Config',
    instructions: 'Instructions',
  }

  const tabIcons: Record<RightPanelTab, React.ReactNode> = {
    preview: <Eye className="h-4 w-4" />,
    history: <History className="h-4 w-4" />,
    notes: <StickyNote className="h-4 w-4" />,
    config: <Settings2 className="h-4 w-4" />,
    instructions: <List className="h-4 w-4" />,
  }

  // Tabs available depends on edit mode
  const availableTabs: RightPanelTab[] = isEditMode
    ? ['preview', 'instructions', 'notes', 'history', 'config']
    : ['preview', 'notes', 'history', 'config']

  function handleTabSelect(tab: RightPanelTab) {
    onTabChange(tab)
    if (!rightPanelOpen) {
      onRightPanelOpenChange(true)
    }
  }

  if (!prompt) {
    return (
      <div className="flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">Select a prompt</p>
      </div>
    )
  }

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
      {/* Left side - Title */}
      <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
        {prompt.name}
      </h1>

      {/* Right side - Controls */}
      <div className="flex items-center gap-1">
        {/* Save/Cancel buttons - only shown in edit mode */}
        {isEditMode && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelClick}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={!hasUnsavedChanges || !!nameError}
              className="gap-1.5"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          </>
        )}

        {/* Edit button - only show when not in edit mode */}
        {!isEditMode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditModeChange(true)}
            className="gap-1.5"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}

        {/* Tab buttons - only show when panel is closed */}
        {!rightPanelOpen && availableTabs.map((tab) => (
          <Button
            key={tab}
            variant="ghost"
            size="sm"
            onClick={() => handleTabSelect(tab)}
            className="gap-1.5"
          >
            {tabIcons[tab]}
            {tabLabels[tab]}
          </Button>
        ))}
      </div>

      {/* Unsaved changes confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to cancel? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
