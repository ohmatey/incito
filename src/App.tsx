import { useState, useEffect, useRef } from 'react'
import type { PromptFile, Variable, Tag } from '@/types/prompt'
import {
  getSavedFolderPath,
  saveFolderPath,
  clearFolderPath,
  getAllTags,
  createTag as createTagInDb,
  updateTag as updateTagInDb,
  deleteTag as deleteTagInDb,
} from '@/lib/store'
import { loadPrompts, savePrompt, createPrompt, duplicatePrompt, deletePrompt, isDisplayNameUnique } from '@/lib/prompts'
import { getDefaultValues } from '@/lib/interpolate'
import { syncVariablesWithTemplate } from '@/lib/parser'
import { FolderSelect } from '@/components/FolderSelect'
import { PromptList } from '@/components/PromptList'
import { PromptHeader } from '@/components/PromptHeader'
import { PromptEditor } from '@/components/PromptEditor'
import { VariablesPanel } from '@/components/VariablesPanel'
import { TagsPage } from '@/components/TagsPage'
import { SettingsPage } from '@/components/SettingsPage'
import { NewPromptDialog } from '@/components/NewPromptDialog'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import type { GeneratedPrompt } from '@/lib/mastra-client'

export default function App() {
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [prompts, setPrompts] = useState<PromptFile[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<PromptFile | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, unknown>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentView, setCurrentView] = useState<'prompts' | 'tags' | 'settings'>('prompts')
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null)
  const [activeVariableKey, setActiveVariableKey] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showNewPromptDialog, setShowNewPromptDialog] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Local edit state
  const [localName, setLocalName] = useState('')
  const [localDescription, setLocalDescription] = useState('')
  const [localTemplate, setLocalTemplate] = useState('')
  const [localTags, setLocalTags] = useState<string[]>([])
  const [originalVariables, setOriginalVariables] = useState<Variable[]>([])
  const [originalTags, setOriginalTags] = useState<string[]>([])
  const [nameError, setNameError] = useState<string | null>(null)

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

  // Sync local state when prompt changes
  useEffect(() => {
    if (selectedPrompt) {
      setLocalName(selectedPrompt.name)
      setLocalDescription(selectedPrompt.description)
      setLocalTemplate(selectedPrompt.template)
      setLocalTags(selectedPrompt.tags || [])
      setOriginalVariables(JSON.parse(JSON.stringify(selectedPrompt.variables)))
      setOriginalTags([...(selectedPrompt.tags || [])])
      setVariableValues(getDefaultValues(selectedPrompt.variables))
      setNameError(null)
    } else {
      setLocalName('')
      setLocalDescription('')
      setLocalTemplate('')
      setLocalTags([])
      setOriginalVariables([])
      setOriginalTags([])
      setVariableValues({})
      setNameError(null)
    }
  }, [selectedPrompt?.path])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K / Ctrl+K - Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      // Cmd+N / Ctrl+N - Open new prompt dialog
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        if (folderPath) {
          setShowNewPromptDialog(true)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [folderPath])

  // Check for unsaved changes (including variables and tags)
  const variablesChanged = selectedPrompt
    ? JSON.stringify(selectedPrompt.variables) !== JSON.stringify(originalVariables)
    : false

  const tagsChanged = selectedPrompt
    ? JSON.stringify(localTags.slice().sort()) !== JSON.stringify(originalTags.slice().sort())
    : false

  const hasUnsavedChanges = selectedPrompt
    ? localName !== selectedPrompt.name ||
      localDescription !== selectedPrompt.description ||
      localTemplate !== selectedPrompt.template ||
      variablesChanged ||
      tagsChanged
    : false

  // Validate name uniqueness when it changes
  function handleLocalNameChange(newName: string) {
    setLocalName(newName)

    if (!newName.trim()) {
      setNameError('Name cannot be empty')
      return
    }

    // Check if name is unique (excluding current prompt)
    const isUnique = isDisplayNameUnique(newName, [], selectedPrompt?.path, prompts)
    if (!isUnique) {
      setNameError('A prompt with this name already exists')
    } else {
      setNameError(null)
    }
  }

  async function handleFolderSelect(path: string) {
    setIsLoading(true)

    try {
      const loadedPrompts = await loadPrompts(path)
      setFolderPath(path)
      await saveFolderPath(path)
      setPrompts(loadedPrompts)

      // Load tags from SQLite
      const tagsResult = await getAllTags()
      if (tagsResult.ok) {
        setTags(tagsResult.data)
      } else {
        toast.error(tagsResult.error)
      }

      if (loadedPrompts.length > 0) {
        setSelectedPrompt(loadedPrompts[0])
        setIsEditMode(false)
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
    setPrompts([])
    setSelectedPrompt(null)
    setVariableValues({})
    setIsEditMode(false)
  }

  async function handleCreatePrompt() {
    if (!folderPath) return

    try {
      const existingFileNames = prompts.map((p) => p.fileName)
      const existingDisplayNames = prompts.map((p) => p.name)
      const newPrompt = await createPrompt(folderPath, existingFileNames, existingDisplayNames)
      setPrompts((prev) => [...prev, newPrompt].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedPrompt(newPrompt)
      setIsEditMode(true)
      toast.success('Created new prompt')
    } catch (err) {
      toast.error('Failed to create prompt')
    }
  }

  function handleSelectPrompt(prompt: PromptFile) {
    setSelectedPrompt(prompt)
    setIsEditMode(false)
  }

  async function handleDuplicatePrompt(prompt: PromptFile) {
    if (!folderPath) return

    try {
      const existingFileNames = prompts.map((p) => p.fileName)
      const existingDisplayNames = prompts.map((p) => p.name)
      const duplicated = await duplicatePrompt(prompt, folderPath, existingFileNames, existingDisplayNames)
      setPrompts((prev) => [...prev, duplicated].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedPrompt(duplicated)
      setIsEditMode(true)
      toast.success('Duplicated prompt')
    } catch (err) {
      toast.error('Failed to duplicate prompt')
    }
  }

  async function handleDeletePrompt(prompt: PromptFile) {
    try {
      await deletePrompt(prompt)
      setPrompts((prev) => prev.filter((p) => p.path !== prompt.path))

      if (selectedPrompt?.path === prompt.path) {
        const remaining = prompts.filter((p) => p.path !== prompt.path)
        setSelectedPrompt(remaining.length > 0 ? remaining[0] : null)
        setIsEditMode(false)
      }

      toast.success('Deleted prompt')
    } catch (err) {
      toast.error('Failed to delete prompt')
    }
  }

  async function handleCreateFromAI(generated: GeneratedPrompt) {
    if (!folderPath) return

    try {
      const existingFileNames = prompts.map((p) => p.fileName)
      const existingDisplayNames = prompts.map((p) => p.name)

      // Create the prompt file with generated content
      const newPrompt = await createPrompt(folderPath, existingFileNames, existingDisplayNames, {
        name: generated.name,
        description: generated.description,
        template: generated.template,
        variables: generated.variables.map((v) => ({
          key: v.key,
          label: v.label,
          type: v.type,
          required: v.required ?? false,
          placeholder: v.placeholder,
          preview: v.preview,
          default: v.default,
          options: v.options,
        })),
        tags: generated.tags,
      })

      setPrompts((prev) => [...prev, newPrompt].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedPrompt(newPrompt)
      setIsEditMode(true)
      toast.success('Generated prompt template')
    } catch (err) {
      toast.error('Failed to create prompt from AI')
    }
  }

  // Tag operations
  async function handleCreateTag(name: string, color: string) {
    try {
      const result = await createTagInDb(name, color)
      if (result.ok) {
        setTags((prev) => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)))
        toast.success('Created tag')
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      toast.error('Failed to create tag')
    }
  }

  async function handleUpdateTag(id: string, name: string, color: string) {
    try {
      const result = await updateTagInDb(id, name, color)
      if (result.ok) {
        // Find old tag name to update prompts
        const oldTag = tags.find((t) => t.id === id)
        const oldName = oldTag?.name

        // Update tags state
        setTags((prev) =>
          prev
            .map((t) => (t.id === id ? { ...t, name, color } : t))
            .sort((a, b) => a.name.localeCompare(b.name))
        )

        // Update prompts that use this tag (in memory and files)
        if (oldName && oldName !== name) {
          const updatedPrompts = await Promise.all(
            prompts.map(async (p) => {
              if (p.tags?.includes(oldName)) {
                const updatedPrompt = {
                  ...p,
                  tags: p.tags.map((t) => (t === oldName ? name : t)),
                }
                await savePrompt(updatedPrompt)
                return updatedPrompt
              }
              return p
            })
          )
          setPrompts(updatedPrompts)
          if (selectedPrompt?.tags?.includes(oldName)) {
            setSelectedPrompt({
              ...selectedPrompt,
              tags: selectedPrompt.tags.map((t) => (t === oldName ? name : t)),
            })
          }
        }

        toast.success('Updated tag')
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      toast.error('Failed to update tag')
    }
  }

  async function handleDeleteTag(id: string) {
    try {
      const tagToDelete = tags.find((t) => t.id === id)
      const result = await deleteTagInDb(id)
      if (result.ok && tagToDelete) {
        setTags((prev) => prev.filter((t) => t.id !== id))

        // Remove tag from all prompts
        const updatedPrompts = await Promise.all(
          prompts.map(async (p) => {
            if (p.tags?.includes(tagToDelete.name)) {
              const updatedPrompt = {
                ...p,
                tags: p.tags.filter((t) => t !== tagToDelete.name),
              }
              await savePrompt(updatedPrompt)
              return updatedPrompt
            }
            return p
          })
        )
        setPrompts(updatedPrompts)
        if (selectedPrompt?.tags?.includes(tagToDelete.name)) {
          setSelectedPrompt({
            ...selectedPrompt,
            tags: selectedPrompt.tags.filter((t) => t !== tagToDelete.name),
          })
        }

        toast.success('Deleted tag')
      } else if (!result.ok) {
        toast.error(result.error)
      }
    } catch (err) {
      toast.error('Failed to delete tag')
    }
  }

  async function handleSave() {
    if (!selectedPrompt) return

    // Validate name before saving
    if (!localName.trim()) {
      setNameError('Name cannot be empty')
      toast.error('Name cannot be empty')
      return
    }

    const isUnique = isDisplayNameUnique(localName, [], selectedPrompt.path, prompts)
    if (!isUnique) {
      setNameError('A prompt with this name already exists')
      toast.error('A prompt with this name already exists')
      return
    }

    try {
      const syncedVariables = syncVariablesWithTemplate(selectedPrompt.variables, localTemplate)

      const updatedPrompt: PromptFile = {
        ...selectedPrompt,
        name: localName,
        description: localDescription,
        template: localTemplate,
        variables: syncedVariables,
        tags: localTags,
      }

      await savePrompt(updatedPrompt)
      setPrompts((prev) =>
        prev
          .map((p) => (p.path === updatedPrompt.path ? updatedPrompt : p))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setSelectedPrompt(updatedPrompt)
      setOriginalVariables(JSON.parse(JSON.stringify(syncedVariables)))
      setOriginalTags([...localTags])
      setIsEditMode(false)
      setNameError(null)
      toast.success('Saved prompt')
    } catch (err) {
      toast.error('Failed to save prompt')
    }
  }

  function handleCancel() {
    if (selectedPrompt) {
      setLocalName(selectedPrompt.name)
      setLocalDescription(selectedPrompt.description)
      setLocalTemplate(selectedPrompt.template)
      setLocalTags([...originalTags])
      // Restore original variables
      setSelectedPrompt({
        ...selectedPrompt,
        variables: JSON.parse(JSON.stringify(originalVariables)),
      })
    }
    setIsEditMode(false)
    setNameError(null)
  }

  function handleValueChange(key: string, value: unknown) {
    setVariableValues((prev) => ({ ...prev, [key]: value }))
  }

  // Handle live template changes - sync variables as user types
  function handleLocalTemplateChange(template: string) {
    setLocalTemplate(template)

    if (!selectedPrompt) return

    // Sync variables with template (auto-detect {{variable}} patterns)
    const syncedVariables = syncVariablesWithTemplate(selectedPrompt.variables, template)

    // Update selectedPrompt locally (not saved to file yet)
    setSelectedPrompt({
      ...selectedPrompt,
      variables: syncedVariables,
    })
  }

  // Handle variable configuration updates (type, default, label)
  function handleVariableUpdate(updatedVariable: Variable) {
    if (!selectedPrompt) return

    const updatedVariables = selectedPrompt.variables.map((v) =>
      v.key === updatedVariable.key ? updatedVariable : v
    )

    setSelectedPrompt({
      ...selectedPrompt,
      variables: updatedVariables,
    })
  }

  // Handle reordering variables
  function handleVariablesReorder(variables: Variable[]) {
    if (!selectedPrompt) return

    setSelectedPrompt({
      ...selectedPrompt,
      variables,
    })
  }

  // Filter prompts by search query and selected tag
  const filteredPrompts = prompts.filter((prompt) => {
    const matchesSearch =
      prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTag = selectedTagFilter
      ? prompt.tags?.includes(selectedTagFilter)
      : true

    return matchesSearch && matchesTag
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!folderPath) {
    return (
      <>
        <FolderSelect onFolderSelect={handleFolderSelect} />
        <Toaster />
      </>
    )
  }

  return (
    <>
      <div className="flex h-screen border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
        {/* Left sidebar - Prompt List */}
        <PromptList
          prompts={filteredPrompts}
          selectedPrompt={selectedPrompt}
          onSelectPrompt={handleSelectPrompt}
          onDuplicatePrompt={handleDuplicatePrompt}
          onDeletePrompt={handleDeletePrompt}
          currentView={currentView}
          onViewChange={setCurrentView}
          tags={tags}
          selectedTagFilter={selectedTagFilter}
          onTagFilterChange={setSelectedTagFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchInputRef={searchInputRef}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onNewPrompt={() => setShowNewPromptDialog(true)}
        />

        {/* Right side - Content area */}
        {currentView === 'tags' ? (
          <TagsPage
            tags={tags}
            prompts={prompts}
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
          <div className="flex flex-1 flex-col overflow-hidden">
            <PromptHeader
              prompt={selectedPrompt}
              isEditMode={isEditMode}
              localName={localName}
              localDescription={localDescription}
              hasUnsavedChanges={hasUnsavedChanges}
              nameError={nameError}
              tags={tags}
              localTags={localTags}
              onLocalNameChange={handleLocalNameChange}
              onLocalDescriptionChange={setLocalDescription}
              onLocalTagsChange={setLocalTags}
              onCreateTag={handleCreateTag}
              onEditModeChange={setIsEditMode}
              onSave={handleSave}
              onCancel={handleCancel}
              onDelete={() => selectedPrompt && handleDeletePrompt(selectedPrompt)}
            />

            <div className="flex flex-1 overflow-hidden">
              <VariablesPanel
                prompt={selectedPrompt}
                values={variableValues}
                isEditMode={isEditMode}
                onValueChange={handleValueChange}
                onVariableUpdate={handleVariableUpdate}
                activeVariableKey={activeVariableKey}
                onActiveVariableChange={setActiveVariableKey}
                onVariablesReorder={handleVariablesReorder}
              />

              <PromptEditor
                prompt={selectedPrompt}
                values={variableValues}
                isEditMode={isEditMode}
                localTemplate={localTemplate}
                onLocalTemplateChange={handleLocalTemplateChange}
                activeVariableKey={activeVariableKey}
                onActiveVariableChange={setActiveVariableKey}
              />
            </div>
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
