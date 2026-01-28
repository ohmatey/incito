import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Pencil, Eye, History, StickyNote, Settings2, List, Save, Play, Clock } from 'lucide-react'

export type RightPanelTab = 'preview' | 'history' | 'notes' | 'config' | 'instructions' | 'runs'

interface PromptHeaderProps {
  prompt: PromptFile | null
  isEditMode: boolean
  isRunMode?: boolean
  rightPanelOpen: boolean
  hasUnsavedChanges: boolean
  nameError: string | null
  runsEnabled?: boolean
  onEditModeChange: (editMode: boolean) => void
  onRightPanelOpenChange: (open: boolean) => void
  onTabChange: (tab: RightPanelTab) => void
  onSave: () => void
  onCancel: () => void
  onRun?: () => void
}

export function PromptHeader({
  prompt,
  isEditMode,
  isRunMode = false,
  rightPanelOpen,
  hasUnsavedChanges,
  nameError,
  runsEnabled = false,
  onEditModeChange,
  onRightPanelOpenChange,
  onTabChange,
  onSave,
  onCancel,
  onRun,
}: PromptHeaderProps) {
  const { t } = useTranslation('common')
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
    preview: t('tabs.prompt'),
    history: t('tabs.history'),
    notes: t('tabs.notes'),
    config: t('tabs.config'),
    instructions: t('tabs.instructions'),
    runs: t('tabs.runs'),
  }

  const tabIcons: Record<RightPanelTab, React.ReactNode> = {
    preview: <Eye className="h-4 w-4" />,
    history: <History className="h-4 w-4" />,
    notes: <StickyNote className="h-4 w-4" />,
    config: <Settings2 className="h-4 w-4" />,
    instructions: <List className="h-4 w-4" />,
    runs: <Clock className="h-4 w-4" />,
  }

  // Tabs available depends on edit mode and feature flags
  const availableTabs: RightPanelTab[] = isEditMode
    ? ['preview', 'instructions', 'notes', 'history', 'config']
    : runsEnabled
      ? ['preview', 'runs', 'notes', 'history', 'config']
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
        <p className="text-gray-500 dark:text-gray-400">{t('header.selectPrompt')}</p>
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
        {/* Save/Cancel buttons - shown in edit mode when panel is open */}
        {isEditMode && rightPanelOpen && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelClick}
            >
              {t('buttons.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={!hasUnsavedChanges || !!nameError}
              className="gap-1.5"
            >
              <Save className="h-4 w-4" />
              {t('buttons.save')}
            </Button>
          </>
        )}

        {/* Run button - prominent, show when not in edit or run mode, and runs feature is enabled */}
        {runsEnabled && !isEditMode && !isRunMode && onRun && prompt.variables.length > 0 && (
          <Button
            size="sm"
            onClick={onRun}
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
          >
            <Play className="h-4 w-4" />
            {t('buttons.run')}
          </Button>
        )}

        {/* Edit button - only show when not in edit mode */}
        {!isEditMode && !isRunMode && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEditModeChange(true)}
            title={t('buttons.edit')}
          >
            <Pencil className="h-4 w-4" />
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

        {/* Save/Cancel buttons with divider - shown in edit mode when panel is closed */}
        {isEditMode && !rightPanelOpen && (
          <>
            <div className="ml-2 h-6 w-px bg-gray-200 dark:bg-gray-700" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelClick}
              className="ml-2"
            >
              {t('buttons.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={!hasUnsavedChanges || !!nameError}
              className="gap-1.5"
            >
              <Save className="h-4 w-4" />
              {t('buttons.save')}
            </Button>
          </>
        )}
      </div>

      {/* Unsaved changes confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('header.discardChanges')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('header.unsavedChangesWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('header.keepEditing')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel}>
              {t('header.discardChangesButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
