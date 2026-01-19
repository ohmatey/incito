import { useState, useEffect } from 'react'
import type { PromptFile, Variable, Note } from '@/types/prompt'
import type { RightPanelTab } from '@/components/PromptHeader'
import { getSavedFolderPath, saveFolderPath, clearFolderPath } from '@/lib/store'
import { savePrompt, removeVariantFromParent } from '@/lib/prompts'
import { syncVariablesWithTemplate } from '@/lib/parser'
import { usePromptManager, useTagManager, usePromptEditState } from '@/lib/hooks'
import { FolderSelect } from '@/components/FolderSelect'
import { NavSidebar } from '@/components/NavSidebar'
import { PromptList } from '@/components/PromptList'
import { PromptHeader } from '@/components/PromptHeader'
import { CenterPane } from '@/components/CenterPane'
import { RightPanel } from '@/components/RightPanel'
import { TagsPage } from '@/components/TagsPage'
import { SettingsPage } from '@/components/SettingsPage'
import { SearchPage } from '@/components/SearchPage'
import { NewPromptDialog } from '@/components/NewPromptDialog'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import type { GeneratedPrompt } from '@/lib/mastra-client'

export default function App() {
  // Core state
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState<'prompts' | 'tags' | 'settings' | 'search'>('prompts')
  const [showNewPromptDialog, setShowNewPromptDialog] = useState(false)
  const [searchFocusTrigger, setSearchFocusTrigger] = useState(0)

  // Right panel state
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('preview')
  const [rightPanelOpen, setRightPanelOpen] = useState(true)

  // Custom hooks
  const promptManager = usePromptManager()
  const tagManager = useTagManager()
  const editState = usePromptEditState(promptManager.selectedPrompt, promptManager.prompts)

  // Load saved folder path on mount
  useEffect(() => {
    async function loadSavedFolder() {
      const result = await getSavedFolderPath()
      if (result.ok && result.data) {
        handleFolderSelect(result.data)
      } else {
        if (!result.ok) {
          toast.error(result.error)
        }
        setIsLoading(false)
      }
    }
    loadSavedFolder()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K / Ctrl+K - Navigate to search view and focus search input
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCurrentView('search')
        setSearchFocusTrigger((prev) => prev + 1)
      }
      // Cmd+N / Ctrl+N - Open new prompt dialog
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        if (folderPath) {
          setShowNewPromptDialog(true)
        }
      }
      // Cmd+\ / Ctrl+\ - Toggle right panel
      if ((e.metaKey || e.ctrlKey) && (e.key === '\\' || e.code === 'Backslash')) {
        e.preventDefault()
        setRightPanelOpen((prev) => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [folderPath])

  // Folder operations
  async function handleFolderSelect(path: string) {
    setIsLoading(true)

    try {
      const loadedPrompts = await promptManager.loadPromptsFromFolder(path)
      setFolderPath(path)
      await saveFolderPath(path)

      // Load tags from SQLite
      await tagManager.loadTags()

      if (loadedPrompts.length > 0) {
        promptManager.selectPrompt(loadedPrompts[0])
        editState.setIsEditMode(false)
      }
    } catch (err) {
      toast.error('Failed to load prompts folder')
      await clearFolderPath()
      setFolderPath(null)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleChangeFolder() {
    await clearFolderPath()
    setFolderPath(null)
    promptManager.setPrompts([])
    promptManager.setSelectedPrompt(null)
    editState.setVariableValues({})
    editState.setIsEditMode(false)
  }

  // Prompt operations
  async function handleCreatePrompt() {
    if (!folderPath) return

    const newPrompt = await promptManager.createNewPrompt(folderPath)
    if (newPrompt) {
      setCurrentView('prompts')
      handleEnterEditMode()
    }
  }

  function handleSelectPrompt(prompt: PromptFile) {
    promptManager.selectPrompt(prompt)
    editState.setIsEditMode(false)
    setRightPanelOpen(true)
    setCurrentView('prompts')
  }

  // Select a variant while preserving current edit/run mode
  function handleSelectVariant(prompt: PromptFile) {
    promptManager.selectPrompt(prompt)
    setRightPanelOpen(true)
    setCurrentView('prompts')
  }

  async function handleDuplicatePrompt(prompt: PromptFile) {
    if (!folderPath) return

    const duplicated = await promptManager.duplicate(prompt, folderPath)
    if (duplicated) {
      setCurrentView('prompts')
      handleEnterEditMode()
    }
  }

  async function handleDeletePrompt(prompt: PromptFile) {
    // If this is a variant, remove it from parent's variants array
    if (prompt.variantOf) {
      const updatedParent = await removeVariantFromParent(prompt, promptManager.prompts)
      if (updatedParent) {
        // Update the parent in the prompts list
        promptManager.setPrompts((prev) =>
          prev.map((p) => (p.path === updatedParent.path ? updatedParent : p))
        )
      }
    }

    await promptManager.remove(prompt)
    editState.setIsEditMode(false)
  }

  async function handleCreateFromAI(generated: GeneratedPrompt) {
    if (!folderPath) return

    const newPrompt = await promptManager.createFromAI(folderPath, generated)
    if (newPrompt) {
      setCurrentView('prompts')
      handleEnterEditMode()
    }
  }

  // Edit mode handlers
  function handleEnterEditMode() {
    editState.enterEditMode()
    setRightPanelOpen(true)
    setRightPanelTab('instructions')
  }

  function handleExitEditMode() {
    editState.exitEditMode()
    setRightPanelOpen(true)
    // 'instructions' tab is only available in edit mode, switch to preview if needed
    if (rightPanelTab === 'instructions') {
      setRightPanelTab('preview')
    }
  }

  function handleEditModeChange(editMode: boolean) {
    if (editMode) {
      handleEnterEditMode()
    } else {
      handleExitEditMode()
    }
  }

  // Tag operations (wrappers that pass prompts state)
  async function handleCreateTag(name: string, color: string) {
    await tagManager.createTag(name, color)
  }

  async function handleUpdateTag(id: string, name: string, color: string) {
    await tagManager.updateTag(
      id,
      name,
      color,
      promptManager.prompts,
      promptManager.setPrompts,
      promptManager.selectedPrompt,
      promptManager.setSelectedPrompt
    )
  }

  async function handleDeleteTag(id: string) {
    await tagManager.deleteTag(
      id,
      promptManager.prompts,
      promptManager.setPrompts,
      promptManager.selectedPrompt,
      promptManager.setSelectedPrompt
    )
  }

  // Save and cancel handlers
  async function handleSave() {
    const { selectedPrompt } = promptManager
    if (!selectedPrompt) return

    // Validate name before saving
    if (!editState.validateName(editState.localName, promptManager.prompts, selectedPrompt.path)) {
      toast.error(editState.nameError || 'Invalid name')
      return
    }

    const syncedVariables = syncVariablesWithTemplate(selectedPrompt.variables, editState.localTemplate)

    const updatedPrompt: PromptFile = {
      ...selectedPrompt,
      name: editState.localName,
      description: editState.localDescription,
      template: editState.localTemplate,
      variables: syncedVariables,
      tags: editState.localTags,
    }

    const saved = await promptManager.save(updatedPrompt)
    if (saved) {
      editState.syncFromPrompt(updatedPrompt)
      handleExitEditMode()
      editState.setNameError(null)
    }
  }

  function handleCancel() {
    const { selectedPrompt } = promptManager
    if (selectedPrompt) {
      editState.resetToSaved(selectedPrompt, promptManager.updateSelectedPromptVariables)
    }
    handleExitEditMode()
  }

  // Variable handlers
  function handleVariableUpdate(updatedVariable: Variable) {
    const { selectedPrompt } = promptManager
    if (!selectedPrompt) return

    const updatedVariables = selectedPrompt.variables.map((v) =>
      v.key === updatedVariable.key ? updatedVariable : v
    )

    promptManager.updateSelectedPromptVariables(updatedVariables)
  }

  function handleVariableMove(fromIndex: number, toIndex: number) {
    const { selectedPrompt } = promptManager
    if (!selectedPrompt) return
    if (toIndex < 0 || toIndex >= selectedPrompt.variables.length) return

    const variables = [...selectedPrompt.variables]
    const [removed] = variables.splice(fromIndex, 1)
    variables.splice(toIndex, 0, removed)

    promptManager.updateSelectedPromptVariables(variables)
  }

  function handleLocalTemplateChange(template: string) {
    editState.setLocalTemplate(template, promptManager.selectedPrompt, promptManager.updateSelectedPromptVariables)
  }

  // Notes handler
  async function handleNotesChange(notes: Note[]) {
    const { selectedPrompt } = promptManager
    if (!selectedPrompt) return

    const updatedPrompt: PromptFile = {
      ...selectedPrompt,
      notes,
    }

    promptManager.setSelectedPrompt(updatedPrompt)
    promptManager.setPrompts((prev) =>
      prev.map((p) => (p.path === updatedPrompt.path ? updatedPrompt : p))
    )

    try {
      await savePrompt(updatedPrompt)
    } catch (err) {
      toast.error('Failed to save notes')
    }
  }

  // Default launchers handler
  async function handleDefaultLaunchersChange(launchers: string[]) {
    const { selectedPrompt } = promptManager
    if (!selectedPrompt) return

    const updatedPrompt: PromptFile = {
      ...selectedPrompt,
      defaultLaunchers: launchers,
    }

    promptManager.setSelectedPrompt(updatedPrompt)
    promptManager.setPrompts((prev) =>
      prev.map((p) => (p.path === updatedPrompt.path ? updatedPrompt : p))
    )

    try {
      await savePrompt(updatedPrompt)
    } catch (err) {
      toast.error('Failed to save default launchers')
    }
  }

  // Version restore handler
  async function handleRestoreVersion(content: string) {
    await promptManager.restoreVersion(content)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  // Folder selection
  if (!folderPath) {
    return (
      <>
        <FolderSelect onFolderSelect={handleFolderSelect} />
        <Toaster />
      </>
    )
  }

  const { selectedPrompt } = promptManager
  const { tags } = tagManager

  return (
    <>
      <div className="flex h-screen border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
        {/* Nav Sidebar */}
        <NavSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
        />

        {/* Prompt List - only shown on prompts page */}
        {currentView === 'prompts' && (
          <PromptList
            prompts={promptManager.prompts}
            pinnedPromptIds={[]}
            selectedPrompt={selectedPrompt}
            onSelectPrompt={handleSelectPrompt}
            onDuplicatePrompt={handleDuplicatePrompt}
            onDeletePrompt={handleDeletePrompt}
            onTogglePinPrompt={() => {}}
            onNewPrompt={() => setShowNewPromptDialog(true)}
          />
        )}

        {/* Main Content Area */}
        {currentView === 'search' ? (
          <SearchPage
            prompts={promptManager.prompts}
            tags={tags}
            pinnedPromptIds={[]}
            selectedPrompt={selectedPrompt}
            onSelectPrompt={handleSelectPrompt}
            onDuplicatePrompt={handleDuplicatePrompt}
            onDeletePrompt={handleDeletePrompt}
            onTogglePinPrompt={() => {}}
            focusTrigger={searchFocusTrigger}
          />
        ) : currentView === 'tags' ? (
          <TagsPage
            tags={tags}
            prompts={promptManager.prompts}
            onCreateTag={handleCreateTag}
            onUpdateTag={handleUpdateTag}
            onDeleteTag={handleDeleteTag}
          />
        ) : currentView === 'settings' ? (
          <SettingsPage
            folderPath={folderPath}
            onChangeFolder={handleChangeFolder}
          />
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Center Area */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <PromptHeader
                prompt={selectedPrompt}
                isEditMode={editState.isEditMode}
                rightPanelOpen={rightPanelOpen}
                hasUnsavedChanges={editState.hasUnsavedChanges}
                nameError={editState.nameError}
                onEditModeChange={handleEditModeChange}
                onRightPanelOpenChange={setRightPanelOpen}
                onTabChange={setRightPanelTab}
                onSave={handleSave}
                onCancel={handleCancel}
              />

              <CenterPane
                prompt={selectedPrompt}
                prompts={promptManager.prompts}
                pinnedPromptIds={[]}
                values={editState.variableValues}
                isEditMode={editState.isEditMode}
                localName={editState.localName}
                localDescription={editState.localDescription}
                localTemplate={editState.localTemplate}
                localTags={editState.localTags}
                nameError={editState.nameError}
                tags={tags}
                activeVariableKey={editState.activeVariableKey}
                onValueChange={editState.handleValueChange}
                onActiveVariableChange={editState.setActiveVariableKey}
                onLocalNameChange={editState.setLocalName}
                onLocalDescriptionChange={editState.setLocalDescription}
                onLocalTemplateChange={handleLocalTemplateChange}
                onLocalTagsChange={editState.setLocalTags}
                onCreateTag={handleCreateTag}
                onSelectPrompt={handleSelectPrompt}
                onResetForm={editState.resetVariableValues}
              />
            </div>

            {/* Right Panel */}
            {rightPanelOpen && (
              <RightPanel
                prompt={selectedPrompt}
                allPrompts={promptManager.prompts}
                values={editState.variableValues}
                activeTab={rightPanelTab}
                activeVariableKey={editState.activeVariableKey}
                isEditMode={editState.isEditMode}
                onActiveVariableChange={editState.setActiveVariableKey}
                onValueChange={editState.handleValueChange}
                onNotesChange={handleNotesChange}
                onRestoreVersion={handleRestoreVersion}
                onTabChange={setRightPanelTab}
                onClose={() => setRightPanelOpen(false)}
                onEditPrompt={handleEnterEditMode}
                onDeletePrompt={() => selectedPrompt && handleDeletePrompt(selectedPrompt)}
                onVariableUpdate={handleVariableUpdate}
                onVariableMove={handleVariableMove}
                onDefaultLaunchersChange={handleDefaultLaunchersChange}
                onSelectVariant={handleSelectVariant}
              />
            )}
          </div>
        )}
      </div>
      <NewPromptDialog
        open={showNewPromptDialog}
        onOpenChange={setShowNewPromptDialog}
        onCreateBlank={handleCreatePrompt}
        onCreateFromAI={handleCreateFromAI}
        onOpenSettings={() => setCurrentView('settings')}
      />
      <Toaster />
    </>
  )
}
