import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { PromptFile, Variable, Note } from '@/types/prompt'
import type { AgentFile } from '@/types/agent'
import type { RightPanelTab } from '@/components/PromptHeader'
import { getSavedFolderPath, saveFolderPath, clearFolderPath, getRecentPromptIds, addRecentPrompt, removeRecentPrompt, getAllPromptDrafts, deletePromptDraft, getPanelWidths, savePanelWidths, getListPanelCollapsed, saveListPanelCollapsed, getPinnedPromptIds, addPinnedPrompt, removePinnedPrompt, getTranslationSettings, getFeatureFlags, saveFeatureFlags, type PromptDraft, type PanelWidths, type FeatureFlags } from '@/lib/store'
import { savePrompt, createVariant } from '@/lib/prompts'
import { syncVariablesWithTemplate } from '@/lib/parser'
import { usePromptManager, useTagManager, usePromptEditState } from '@/lib/hooks'
import { useAgentManager } from '@/lib/hooks/useAgentManager'
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

  // Recent prompts
  recentPromptIds: string[]

  // Pinned prompts
  pinnedPromptIds: string[]
  togglePinPrompt: (promptId: string) => Promise<void>

  // In-progress prompts (drafts with their prompts)
  inProgressPrompts: Array<{ draft: PromptDraft; prompt: PromptFile }>
  refreshDrafts: () => Promise<void>
  handlePromptCompleted: () => Promise<void>
  clearDraftById: (promptId: string) => Promise<void>

  // UI state
  showNewPromptDialog: boolean
  setShowNewPromptDialog: (show: boolean) => void
  newPromptDialogMode: 'blank' | 'ai'
  openNewPromptDialog: (mode?: 'blank' | 'ai') => void
  searchFocusTrigger: number
  triggerSearchFocus: () => void
  rightPanelTab: RightPanelTab
  setRightPanelTab: (tab: RightPanelTab) => void
  rightPanelOpen: boolean
  setRightPanelOpen: (open: boolean) => void

  // Panel widths
  panelWidths: PanelWidths
  handlePromptListResize: (delta: number) => void
  handleRightPanelResize: (delta: number) => void
  handlePanelResizeEnd: () => void

  // List panel collapse state
  listPanelCollapsed: boolean
  toggleListPanelCollapsed: () => void

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

  // Version restore handler
  handleRestoreVersion: (content: string) => Promise<void>

  // Variant handlers
  handleSelectVariant: (prompt: PromptFile) => void
  handleCreateVariant: (variantLabel: string, template: string) => Promise<void>
  variantEditorOpen: boolean
  setVariantEditorOpen: (open: boolean) => void
  handleOpenVariantEditor: () => void
  getRememberedVariantId: (parentFileName: string) => string | undefined

  // Agent operations
  handleCreateAgent: () => Promise<AgentFile | null>

  // Feature flags
  featureFlags: FeatureFlags
  updateFeatureFlags: (flags: Partial<FeatureFlags>) => Promise<void>
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

  // Open new prompt dialog with optional mode
  function openNewPromptDialog(mode: 'blank' | 'ai' = 'blank') {
    setNewPromptDialogMode(mode)
    setShowNewPromptDialog(true)
  }

  // Right panel state
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('preview')
  const [rightPanelOpen, setRightPanelOpen] = useState(false)

  // Panel widths state
  const [panelWidths, setPanelWidths] = useState<PanelWidths>({ promptList: 200, rightPanel: 300 })

  // List panel collapsed state
  const [listPanelCollapsed, setListPanelCollapsed] = useState(false)

  // Recent prompts state
  const [recentPromptIds, setRecentPromptIds] = useState<string[]>([])

  // Pinned prompts state
  const [pinnedPromptIds, setPinnedPromptIds] = useState<string[]>([])

  // In-progress prompts state (drafts matched with their prompts)
  const [inProgressPrompts, setInProgressPrompts] = useState<Array<{ draft: PromptDraft; prompt: PromptFile }>>([])

  // Variant editor dialog state
  const [variantEditorOpen, setVariantEditorOpen] = useState(false)

  // Track selected variant for each parent prompt (parentFileName -> variantId)
  const [selectedVariantByParent, setSelectedVariantByParent] = useState<Record<string, string>>({})

  // Feature flags state
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({
    agentsEnabled: false,
    resourcesEnabled: false,
    translationsEnabled: false,
    mcpServerEnabled: false,
    runsEnabled: false,
  })

  // Custom hooks
  const promptManager = usePromptManager()
  const tagManager = useTagManager()
  const agentManager = useAgentManager()
  const editState = usePromptEditState(promptManager.selectedPrompt, promptManager.prompts)
  const { language: appLanguage } = useLanguage()

  // Load saved folder path and feature flags on mount
  useEffect(() => {
    async function loadSavedFolder() {
      // Load feature flags
      const flagsResult = await getFeatureFlags()
      if (flagsResult.ok) {
        setFeatureFlags(flagsResult.data)
      }

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
      const loadedPrompts = await promptManager.loadPromptsFromFolder(path)
      setFolderPath(path)
      await saveFolderPath(path)

      // Load tags from SQLite
      await tagManager.loadTags()

      // Load agents from same folder
      await agentManager.loadAgentsFromFolder(path)
      await agentManager.loadPinnedAgents()

      // Load recent prompts
      const recentResult = await getRecentPromptIds()
      if (recentResult.ok) {
        setRecentPromptIds(recentResult.data)
      }

      // Load pinned prompts
      const pinnedResult = await getPinnedPromptIds()
      if (pinnedResult.ok) {
        setPinnedPromptIds(pinnedResult.data)
      }

      // Load panel widths
      const panelWidthsResult = await getPanelWidths()
      if (panelWidthsResult.ok) {
        setPanelWidths(panelWidthsResult.data)
      }

      // Load list panel collapsed state
      const collapsedResult = await getListPanelCollapsed()
      if (collapsedResult.ok) {
        setListPanelCollapsed(collapsedResult.data)
      }

      // Load in-progress drafts
      const draftsResult = await getAllPromptDrafts()
      if (draftsResult.ok) {
        const matched = draftsResult.data
          .map((draft) => {
            const prompt = loadedPrompts.find((p) => p.id === draft.prompt_id)
            return prompt ? { draft, prompt } : null
          })
          .filter((item): item is { draft: PromptDraft; prompt: PromptFile } => item !== null)
        setInProgressPrompts(matched)
      }

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
    setInProgressPrompts([])
    setSelectedVariantByParent({})
  }

  // Refresh drafts (in-progress prompts)
  async function refreshDrafts() {
    const draftsResult = await getAllPromptDrafts()
    if (draftsResult.ok) {
      // Match drafts with their prompts, filtering out orphaned drafts
      const matched = draftsResult.data
        .map((draft) => {
          const prompt = promptManager.prompts.find((p) => p.id === draft.prompt_id)
          return prompt ? { draft, prompt } : null
        })
        .filter((item): item is { draft: PromptDraft; prompt: PromptFile } => item !== null)
      setInProgressPrompts(matched)
    }
  }

  // Handle prompt completion (copy/launch success)
  async function handlePromptCompleted() {
    await editState.clearDraft()
    await refreshDrafts()
  }

  // Clear a draft by prompt ID (used from empty state page)
  async function clearDraftById(promptId: string) {
    await deletePromptDraft(promptId)
    await refreshDrafts()

    // Clear variant memory for this prompt
    const prompt = promptManager.prompts.find((p) => p.id === promptId)
    if (prompt) {
      setSelectedVariantByParent((prev) => {
        const next = { ...prev }
        delete next[prompt.fileName]
        if (prompt.variantOf && prev[prompt.variantOf] === prompt.id) {
          delete next[prompt.variantOf]
        }
        return next
      })
    }
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
    await addRecentPrompt(prompt.id)
    setRecentPromptIds((prev) => {
      const filtered = prev.filter((id) => id !== prompt.id)
      return [prompt.id, ...filtered].slice(0, 10)
    })
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
    await promptManager.remove(prompt)
    editState.setIsEditMode(false)

    // Remove from recent prompts
    await removeRecentPrompt(prompt.id)
    setRecentPromptIds((prev) => prev.filter((id) => id !== prompt.id))

    // Remove any draft for this prompt
    await deletePromptDraft(prompt.id)
    setInProgressPrompts((prev) => prev.filter((item) => item.prompt.id !== prompt.id))

    // Remove from pinned prompts
    await removePinnedPrompt(prompt.id)
    setPinnedPromptIds((prev) => prev.filter((id) => id !== prompt.id))

    // Clear variant memory for this prompt
    setSelectedVariantByParent((prev) => {
      const next = { ...prev }
      // If this was a parent prompt, remove its entry
      delete next[prompt.fileName]
      // If this was a variant, remove it if it was the remembered one for its parent
      if (prompt.variantOf && prev[prompt.variantOf] === prompt.id) {
        delete next[prompt.variantOf]
      }
      return next
    })
  }

  async function togglePinPrompt(promptId: string) {
    const isPinned = pinnedPromptIds.includes(promptId)
    if (isPinned) {
      await removePinnedPrompt(promptId)
      setPinnedPromptIds((prev) => prev.filter((id) => id !== promptId))
    } else {
      await addPinnedPrompt(promptId)
      setPinnedPromptIds((prev) => [...prev, promptId])
    }
  }

  async function handleCreateFromAI(generated: GeneratedPrompt): Promise<PromptFile | null> {
    if (!folderPath) return null

    const newPrompt = await promptManager.createFromAI(folderPath, generated)
    // AI-generated prompts open in view mode (not edit mode) since they already have content
    return newPrompt
  }

  // Edit mode handlers
  function handleEnterEditMode() {
    editState.enterEditMode()
    setRightPanelTab('instructions')
  }

  function handleExitEditMode() {
    editState.exitEditMode()
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
    } catch (error) {
      console.error('Failed to save notes:', error)
      toast.error(i18n.t('toasts:error.notesSaveFailed'))
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
    } catch (error) {
      console.error('Failed to save launchers:', error)
      toast.error(i18n.t('toasts:error.launchersSaveFailed'))
    }
  }

  // Version restore handler
  async function handleRestoreVersion(content: string) {
    await promptManager.restoreVersion(content)
  }

  // Variant handlers
  function handleSelectVariant(prompt: PromptFile) {
    // Select variant while preserving current edit/run mode
    promptManager.selectPrompt(prompt)

    // Remember which variant was selected for its parent
    if (prompt.variantOf) {
      // User selected a variant - remember it
      setSelectedVariantByParent((prev) => ({
        ...prev,
        [prompt.variantOf!]: prompt.id,
      }))
    } else {
      // User selected the original - clear any remembered variant
      setSelectedVariantByParent((prev) => {
        const next = { ...prev }
        delete next[prompt.fileName]
        return next
      })
    }
  }

  function getRememberedVariantId(parentFileName: string): string | undefined {
    return selectedVariantByParent[parentFileName]
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

  // Feature flags update
  async function updateFeatureFlags(flags: Partial<FeatureFlags>) {
    const newFlags = { ...featureFlags, ...flags }
    const result = await saveFeatureFlags(flags)
    if (result.ok) {
      setFeatureFlags(newFlags)
    } else {
      toast.error(result.error)
    }
  }

  // Panel resize handlers
  function handlePromptListResize(delta: number) {
    setPanelWidths((prev) => ({
      ...prev,
      promptList: Math.min(400, Math.max(150, prev.promptList + delta)),
    }))
  }

  function handleRightPanelResize(delta: number) {
    setPanelWidths((prev) => ({
      ...prev,
      rightPanel: Math.min(600, Math.max(200, prev.rightPanel + delta)),
    }))
  }

  async function handlePanelResizeEnd() {
    await savePanelWidths(panelWidths)
  }

  // List panel collapse toggle
  function toggleListPanelCollapsed() {
    setListPanelCollapsed((prev) => {
      const newCollapsed = !prev
      // Fire and forget - don't block UI for persistence
      saveListPanelCollapsed(newCollapsed)
      return newCollapsed
    })
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

    // Recent prompts
    recentPromptIds,

    // Pinned prompts
    pinnedPromptIds,
    togglePinPrompt,

    // In-progress prompts
    inProgressPrompts,
    refreshDrafts,
    handlePromptCompleted,
    clearDraftById,

    // UI state
    showNewPromptDialog,
    setShowNewPromptDialog,
    newPromptDialogMode,
    openNewPromptDialog,
    searchFocusTrigger,
    triggerSearchFocus,
    rightPanelTab,
    setRightPanelTab,
    rightPanelOpen,
    setRightPanelOpen,

    // Panel widths
    panelWidths,
    handlePromptListResize,
    handleRightPanelResize,
    handlePanelResizeEnd,

    // List panel collapse
    listPanelCollapsed,
    toggleListPanelCollapsed,

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

    // Version restore handler
    handleRestoreVersion,

    // Variant handlers
    handleSelectVariant,
    handleCreateVariant,
    variantEditorOpen,
    setVariantEditorOpen,
    handleOpenVariantEditor,
    getRememberedVariantId,

    // Agent operations
    handleCreateAgent,

    // Feature flags
    featureFlags,
    updateFeatureFlags,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
