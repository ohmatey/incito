import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { PromptFile, Variable, Note } from '@/types/prompt'
import type { AgentFile } from '@/types/agent'
import { getSavedFolderPath, saveFolderPath, clearFolderPath, getTranslationSettings } from '@/lib/store'
import { savePrompt, createVariant } from '@/lib/prompts'
import { syncVariablesWithTemplate } from '@/lib/parser'
import { usePromptManager, useTagManager, usePromptEditState } from '@/lib/hooks'
import { useAgentManager } from '@/lib/hooks/useAgentManager'
import { usePromptSession } from '@/context/PromptSessionContext'
import { useLayout } from '@/context/LayoutContext'
import { toast } from 'sonner'
import type { GeneratedPrompt } from '@/lib/mastra-client'
import i18n from '@/i18n'
import { useLanguage } from '@/context/LanguageContext'

interface AppContextValue {
  // Folder state
  folderPath: string | null
  isLoading: boolean
  handleFolderSelect: (path: string) => Promise<void>
  handleChangeFolder: () => Promise<void>

  // Prompt manager
  promptManager: ReturnType<typeof usePromptManager>

  // Tag manager
  tagManager: ReturnType<typeof useTagManager>

  // Agent manager
  agentManager: ReturnType<typeof useAgentManager>

  // Edit state
  editState: ReturnType<typeof usePromptEditState>

  // UI state
  showNewPromptDialog: boolean
  setShowNewPromptDialog: (show: boolean) => void
  newPromptDialogMode: 'blank' | 'ai'
  openNewPromptDialog: (mode?: 'blank' | 'ai') => void
  searchFocusTrigger: number
  triggerSearchFocus: () => void

  // Prompt operations
  handleCreatePrompt: () => Promise<PromptFile | null>
  handleSelectPrompt: (prompt: PromptFile) => void
  handleDuplicatePrompt: (prompt: PromptFile) => Promise<PromptFile | null>
  handleDeletePrompt: (prompt: PromptFile) => Promise<void>
  handleCreateFromAI: (generated: GeneratedPrompt) => Promise<PromptFile | null>

  // Edit mode handlers
  handleEnterEditMode: () => void
  handleExitEditMode: () => void
  handleEditModeChange: (editMode: boolean) => void

  // Tag operations
  handleCreateTag: (name: string, color: string) => Promise<void>
  handleUpdateTag: (id: string, name: string, color: string) => Promise<void>
  handleDeleteTag: (id: string) => Promise<void>

  // Save and cancel
  handleSave: () => Promise<void>
  handleCancel: () => void

  // Variable handlers
  handleVariableUpdate: (variable: Variable) => void
  handleVariableMove: (fromIndex: number, toIndex: number) => void
  handleLocalTemplateChange: (template: string) => void

  // Notes handler
  handleNotesChange: (notes: Note[]) => Promise<void>

  // Default launchers handler
  handleDefaultLaunchersChange: (launchers: string[]) => Promise<void>

  // Default agent handler
  handleDefaultAgentChange: (agentId: string | null) => Promise<void>

  // Version restore handler
  handleRestoreVersion: (content: string) => Promise<void>

  // Variant handlers
  handleSelectVariant: (prompt: PromptFile) => void
  handleCreateVariant: (variantLabel: string, template: string) => Promise<void>
  variantEditorOpen: boolean
  setVariantEditorOpen: (open: boolean) => void
  handleOpenVariantEditor: () => void

  // Agent operations
  handleCreateAgent: () => Promise<AgentFile | null>

  // Prompt completion handler
  handlePromptCompleted: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  // Core state
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showNewPromptDialog, setShowNewPromptDialog] = useState(false)
  const [newPromptDialogMode, setNewPromptDialogMode] = useState<'blank' | 'ai'>('blank')
  const [searchFocusTrigger, setSearchFocusTrigger] = useState(0)

  // Variant editor dialog state
  const [variantEditorOpen, setVariantEditorOpen] = useState(false)

  // Custom hooks
  const promptManager = usePromptManager()
  const tagManager = useTagManager()
  const agentManager = useAgentManager()
  const editState = usePromptEditState(promptManager.selectedPrompt, promptManager.prompts)
  const { language: appLanguage } = useLanguage()

  // Get contexts
  const session = usePromptSession()
  const layout = useLayout()

  // Open new prompt dialog with optional mode
  function openNewPromptDialog(mode: 'blank' | 'ai' = 'blank') {
    setNewPromptDialogMode(mode)
    setShowNewPromptDialog(true)
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Run once on mount only
  }, [])

  // Folder operations
  async function handleFolderSelect(path: string) {
    setIsLoading(true)

    try {
      // Start all independent operations in parallel
      const [loadedPrompts] = await Promise.all([
        promptManager.loadPromptsFromFolder(path),
        saveFolderPath(path),
        tagManager.loadTags(),
        agentManager.loadAgentsFromFolder(path).then(() => agentManager.loadPinnedAgents()),
      ])

      setFolderPath(path)

      // Initialize session data with loaded prompts
      await session.initializeSession(loadedPrompts)

      if (loadedPrompts.length > 0) {
        promptManager.selectPrompt(loadedPrompts[0])
        editState.setIsEditMode(false)
      }
    } catch (error) {
      console.error('Failed to load prompts folder:', error)
      toast.error(i18n.t('toasts:error.promptsFolderFailed'))
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
    agentManager.setAgents([])
    agentManager.setSelectedAgent(null)
    editState.setVariableValues({})
    editState.setIsEditMode(false)
    session.resetSession()
  }

  // Prompt operations
  async function handleCreatePrompt(): Promise<PromptFile | null> {
    if (!folderPath) return null

    const newPrompt = await promptManager.createNewPrompt(folderPath)
    if (newPrompt) {
      handleEnterEditMode()
    }
    return newPrompt
  }

  async function handleSelectPrompt(prompt: PromptFile) {
    promptManager.selectPrompt(prompt)
    editState.setIsEditMode(false)

    // Add to recent prompts
    await session.addToRecent(prompt.id)
  }

  async function handleDuplicatePrompt(prompt: PromptFile): Promise<PromptFile | null> {
    if (!folderPath) return null

    const duplicated = await promptManager.duplicate(prompt, folderPath)
    if (duplicated) {
      handleEnterEditMode()
    }
    return duplicated
  }

  async function handleDeletePrompt(prompt: PromptFile) {
    if (!folderPath) return
    await promptManager.remove(prompt, folderPath)
    editState.setIsEditMode(false)

    // Clean up session data for this prompt
    await session.removeFromRecent(prompt.id)
    await session.clearDraftById(prompt.id)
    // Remove from pinned if it was pinned
    if (session.pinnedPromptIds.includes(prompt.id)) {
      await session.togglePinPrompt(prompt.id)
    }
    session.clearVariantSelection(prompt)
  }

  async function handleCreateFromAI(generated: GeneratedPrompt): Promise<PromptFile | null> {
    if (!folderPath) return null

    const newPrompt = await promptManager.createFromAI(folderPath, generated)
    // AI-generated prompts open in view mode (not edit mode) since they already have content
    return newPrompt
  }

  // Handle prompt completion (copy/launch success)
  async function handlePromptCompleted() {
    await editState.clearDraft()
    await session.refreshDrafts(promptManager.prompts)
  }

  // Edit mode handlers
  function handleEnterEditMode() {
    editState.enterEditMode()
    layout.setRightPanelTab('instructions')
  }

  function handleExitEditMode() {
    editState.exitEditMode()
    // 'instructions' tab is only available in edit mode, switch to preview if needed
    if (layout.rightPanelTab === 'instructions') {
      layout.setRightPanelTab('preview')
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
    if (!folderPath) return
    await tagManager.updateTag(
      id,
      name,
      color,
      promptManager.prompts,
      promptManager.setPrompts,
      promptManager.selectedPrompt,
      promptManager.setSelectedPrompt,
      folderPath
    )
  }

  async function handleDeleteTag(id: string) {
    if (!folderPath) return
    await tagManager.deleteTag(
      id,
      promptManager.prompts,
      promptManager.setPrompts,
      promptManager.selectedPrompt,
      promptManager.setSelectedPrompt,
      folderPath
    )
  }

  // Save and cancel handlers
  async function handleSave() {
    const { selectedPrompt } = promptManager
    if (!selectedPrompt) return

    // Validate name before saving
    if (!editState.validateName(editState.localName, promptManager.prompts, selectedPrompt.path)) {
      toast.error(editState.nameError || i18n.t('toasts:error.invalidName'))
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

    if (!folderPath) return
    const saved = await promptManager.save(updatedPrompt, folderPath)
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
    if (!selectedPrompt || !folderPath) return

    const updatedPrompt: PromptFile = {
      ...selectedPrompt,
      notes,
    }

    promptManager.setSelectedPrompt(updatedPrompt)
    promptManager.setPrompts((prev) =>
      prev.map((p) => (p.path === updatedPrompt.path ? updatedPrompt : p))
    )

    try {
      await savePrompt(updatedPrompt, folderPath)
    } catch (error) {
      console.error('Failed to save notes:', error)
      toast.error(i18n.t('toasts:error.notesSaveFailed'))
    }
  }

  // Default launchers handler
  async function handleDefaultLaunchersChange(launchers: string[]) {
    const { selectedPrompt } = promptManager
    if (!selectedPrompt || !folderPath) return

    const updatedPrompt: PromptFile = {
      ...selectedPrompt,
      defaultLaunchers: launchers,
    }

    promptManager.setSelectedPrompt(updatedPrompt)
    promptManager.setPrompts((prev) =>
      prev.map((p) => (p.path === updatedPrompt.path ? updatedPrompt : p))
    )

    try {
      await savePrompt(updatedPrompt, folderPath)
    } catch (error) {
      console.error('Failed to save launchers:', error)
      toast.error(i18n.t('toasts:error.launchersSaveFailed'))
    }
  }

  // Default agent handler
  async function handleDefaultAgentChange(agentId: string | null) {
    const { selectedPrompt } = promptManager
    if (!selectedPrompt || !folderPath) return

    const updatedPrompt: PromptFile = {
      ...selectedPrompt,
      defaultAgentId: agentId ?? undefined,
    }

    promptManager.setSelectedPrompt(updatedPrompt)
    promptManager.setPrompts((prev) =>
      prev.map((p) => (p.path === updatedPrompt.path ? updatedPrompt : p))
    )

    try {
      await savePrompt(updatedPrompt, folderPath)
    } catch (error) {
      console.error('Failed to save default agent:', error)
      toast.error(i18n.t('toasts:error.defaultAgentSaveFailed'))
    }
  }

  // Version restore handler
  async function handleRestoreVersion(content: string) {
    if (!folderPath) return
    await promptManager.restoreVersion(content, folderPath)
  }

  // Variant handlers
  function handleSelectVariant(prompt: PromptFile) {
    // Select variant while preserving current edit/run mode
    promptManager.selectPrompt(prompt)
    session.rememberVariantSelection(prompt)
  }

  async function handleCreateVariant(variantLabel: string, template: string) {
    const { selectedPrompt } = promptManager
    if (!selectedPrompt || !folderPath) return

    try {
      const existingFileNames = promptManager.prompts.map((p) => p.fileName)
      const { variant, updatedParent } = await createVariant(
        selectedPrompt,
        variantLabel,
        template,
        folderPath,
        existingFileNames
      )

      // Update prompts list: add variant and update parent
      promptManager.setPrompts((prev) => {
        const updated = prev.map((p) => (p.path === updatedParent.path ? updatedParent : p))
        return [...updated, variant].sort((a, b) => a.name.localeCompare(b.name))
      })

      // Select the new variant
      promptManager.setSelectedPrompt(variant)
      editState.syncFromPrompt(variant)
      toast.success(i18n.t('toasts:success.variantCreated', { name: variantLabel }))
    } catch (error) {
      console.error('Failed to create variant:', error)
      toast.error(i18n.t('toasts:error.variantCreateFailed'))
    }
  }

  function handleOpenVariantEditor() {
    setVariantEditorOpen(true)
  }

  // Agent operations
  async function handleCreateAgent(): Promise<AgentFile | null> {
    if (!folderPath) return null

    // Only set language if translation is enabled
    const translationResult = await getTranslationSettings()
    const translationEnabled = translationResult.ok && translationResult.data.enabled

    const newAgent = await agentManager.createNewAgent(folderPath, translationEnabled ? {
      settings: { language: appLanguage },
    } : undefined)
    return newAgent
  }

  // Trigger search focus
  function triggerSearchFocus() {
    setSearchFocusTrigger((prev) => prev + 1)
  }

  const value: AppContextValue = {
    // Folder state
    folderPath,
    isLoading,
    handleFolderSelect,
    handleChangeFolder,

    // Managers
    promptManager,
    tagManager,
    agentManager,
    editState,

    // UI state
    showNewPromptDialog,
    setShowNewPromptDialog,
    newPromptDialogMode,
    openNewPromptDialog,
    searchFocusTrigger,
    triggerSearchFocus,

    // Prompt operations
    handleCreatePrompt,
    handleSelectPrompt,
    handleDuplicatePrompt,
    handleDeletePrompt,
    handleCreateFromAI,

    // Edit mode handlers
    handleEnterEditMode,
    handleExitEditMode,
    handleEditModeChange,

    // Tag operations
    handleCreateTag,
    handleUpdateTag,
    handleDeleteTag,

    // Save and cancel
    handleSave,
    handleCancel,

    // Variable handlers
    handleVariableUpdate,
    handleVariableMove,
    handleLocalTemplateChange,

    // Notes handler
    handleNotesChange,

    // Default launchers handler
    handleDefaultLaunchersChange,

    // Default agent handler
    handleDefaultAgentChange,

    // Version restore handler
    handleRestoreVersion,

    // Variant handlers
    handleSelectVariant,
    handleCreateVariant,
    variantEditorOpen,
    setVariantEditorOpen,
    handleOpenVariantEditor,

    // Agent operations
    handleCreateAgent,

    // Prompt completion handler
    handlePromptCompleted,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
