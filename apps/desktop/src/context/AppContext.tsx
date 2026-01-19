import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { PromptFile, Variable, Note } from '@/types/prompt'
import type { RightPanelTab } from '@/components/PromptHeader'
import { getSavedFolderPath, saveFolderPath, clearFolderPath, getRecentPromptIds, addRecentPrompt, removeRecentPrompt, getAllPromptDrafts, deletePromptDraft, getPanelWidths, savePanelWidths, getPinnedPromptIds, addPinnedPrompt, removePinnedPrompt, type PromptDraft, type PanelWidths } from '@/lib/store'
import { savePrompt, createVariant } from '@/lib/prompts'
import { syncVariablesWithTemplate } from '@/lib/parser'
import { usePromptManager, useTagManager, usePromptEditState } from '@/lib/hooks'
import { toast } from 'sonner'
import type { GeneratedPrompt } from '@/lib/mastra-client'

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
  const [searchFocusTrigger, setSearchFocusTrigger] = useState(0)

  // Right panel state
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('preview')
  const [rightPanelOpen, setRightPanelOpen] = useState(true)

  // Panel widths state
  const [panelWidths, setPanelWidths] = useState<PanelWidths>({ promptList: 200, rightPanel: 300 })

  // Recent prompts state
  const [recentPromptIds, setRecentPromptIds] = useState<string[]>([])

  // Pinned prompts state
  const [pinnedPromptIds, setPinnedPromptIds] = useState<string[]>([])

  // In-progress prompts state (drafts matched with their prompts)
  const [inProgressPrompts, setInProgressPrompts] = useState<Array<{ draft: PromptDraft; prompt: PromptFile }>>([])

  // Variant editor dialog state
  const [variantEditorOpen, setVariantEditorOpen] = useState(false)

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

  // Folder operations
  async function handleFolderSelect(path: string) {
    setIsLoading(true)

    try {
      const loadedPrompts = await promptManager.loadPromptsFromFolder(path)
      setFolderPath(path)
      await saveFolderPath(path)

      // Load tags from SQLite
      await tagManager.loadTags()

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
    setInProgressPrompts([])
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
    setRightPanelOpen(true)

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

  // Variant handlers
  function handleSelectVariant(prompt: PromptFile) {
    // Select variant while preserving current edit/run mode
    promptManager.selectPrompt(prompt)
    setRightPanelOpen(true)
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
      toast.success(`Created variant: ${variantLabel}`)
    } catch (err) {
      toast.error('Failed to create variant')
      console.error(err)
    }
  }

  function handleOpenVariantEditor() {
    setVariantEditorOpen(true)
  }

  // Trigger search focus
  function triggerSearchFocus() {
    setSearchFocusTrigger((prev) => prev + 1)
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

  const value: AppContextValue = {
    // Folder state
    folderPath,
    isLoading,
    handleFolderSelect,
    handleChangeFolder,

    // Managers
    promptManager,
    tagManager,
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
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
