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
import { Save, Play, PanelLeft, PanelLeftClose } from 'lucide-react'
import { TabsDropdown } from '@/components/TabsDropdown'

export type RightPanelTab = 'preview' | 'history' | 'notes' | 'config' | 'instructions' | 'runs' | 'settings'

interface PromptHeaderProps {
  prompt: PromptFile | null
  isEditMode: boolean
  isRunMode?: boolean
  rightPanelOpen: boolean
  activeTab: RightPanelTab
  hasUnsavedChanges: boolean
  nameError: string | null
  runsEnabled?: boolean
  listPanelCollapsed?: boolean
  onToggleListPanel?: () => void
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
  activeTab,
  hasUnsavedChanges,
  nameError,
  runsEnabled = false,
  listPanelCollapsed = false,
  onToggleListPanel,
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
      {/* Left side - Collapse button and Title */}
      <div className="flex items-center gap-2 min-w-0">
        {onToggleListPanel && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleListPanel}
            className="h-8 w-8"
            aria-label={listPanelCollapsed ? t('header.expandSidebar') : t('header.collapseSidebar')}
          >
            {listPanelCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        )}
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
          {prompt.name}
        </h1>
      </div>

      {/* Right side - Controls */}
      <div className="flex items-center gap-1">
        {/* Save/Cancel buttons - shown in edit mode */}
        {isEditMode && (
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

        {/* Tabs dropdown - show when not in run mode and sidebar is closed */}
        {!isRunMode && !rightPanelOpen && (
          <TabsDropdown
            activeTab={activeTab}
            isEditMode={isEditMode}
            runsEnabled={runsEnabled}
            showEditOption={!isEditMode}
            onTabChange={handleTabSelect}
            onEditModeChange={onEditModeChange}
          />
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
