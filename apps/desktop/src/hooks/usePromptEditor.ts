import { useState, useEffect, useCallback } from 'react'
import type { PromptFile, Variable } from '@/types/prompt'
import { syncVariablesWithTemplate } from '@/lib/parser'

interface UsePromptEditorOptions {
  selectedPrompt: PromptFile | null
  checkNameUnique: (name: string, excludePath?: string) => boolean
  onSave: (prompt: PromptFile) => Promise<void>
}

export function usePromptEditor({ selectedPrompt, checkNameUnique, onSave }: UsePromptEditorOptions) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [localName, setLocalName] = useState('')
  const [localDescription, setLocalDescription] = useState('')
  const [localTemplate, setLocalTemplate] = useState('')
  const [localTags, setLocalTags] = useState<string[]>([])
  const [originalVariables, setOriginalVariables] = useState<Variable[]>([])
  const [originalTags, setOriginalTags] = useState<string[]>([])
  const [nameError, setNameError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Sync local state when prompt changes
  useEffect(() => {
    if (selectedPrompt) {
      setLocalName(selectedPrompt.name)
      setLocalDescription(selectedPrompt.description)
      setLocalTemplate(selectedPrompt.template)
      setLocalTags(selectedPrompt.tags || [])
      setOriginalVariables(JSON.parse(JSON.stringify(selectedPrompt.variables)))
      setOriginalTags([...(selectedPrompt.tags || [])])
      setNameError(null)
    } else {
      setLocalName('')
      setLocalDescription('')
      setLocalTemplate('')
      setLocalTags([])
      setOriginalVariables([])
      setOriginalTags([])
      setNameError(null)
    }
  }, [selectedPrompt?.path])

  // Check for unsaved changes
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
  const handleLocalNameChange = useCallback((newName: string) => {
    setLocalName(newName)

    if (!newName.trim()) {
      setNameError('Name cannot be empty')
      return
    }

    const isUnique = checkNameUnique(newName, selectedPrompt?.path)
    if (!isUnique) {
      setNameError('A prompt with this name already exists')
    } else {
      setNameError(null)
    }
  }, [checkNameUnique, selectedPrompt?.path])

  // Handle live template changes - sync variables as user types
  const handleLocalTemplateChange = useCallback((template: string, currentPrompt: PromptFile | null) => {
    setLocalTemplate(template)

    if (!currentPrompt) return null

    // Sync variables with template (auto-detect {{variable}} patterns)
    const syncedVariables = syncVariablesWithTemplate(currentPrompt.variables, template)

    // Return updated prompt (caller decides what to do with it)
    return {
      ...currentPrompt,
      variables: syncedVariables,
    }
  }, [])

  const handleSave = useCallback(async (promptToSave: PromptFile) => {
    if (!promptToSave) return

    // Validate name before saving
    if (!localName.trim()) {
      setNameError('Name cannot be empty')
      return
    }

    const isUnique = checkNameUnique(localName, promptToSave.path)
    if (!isUnique) {
      setNameError('A prompt with this name already exists')
      return
    }

    setIsSaving(true)
    try {
      const syncedVariables = syncVariablesWithTemplate(promptToSave.variables, localTemplate)

      const updatedPrompt: PromptFile = {
        ...promptToSave,
        name: localName,
        description: localDescription,
        template: localTemplate,
        variables: syncedVariables,
        tags: localTags,
      }

      await onSave(updatedPrompt)
      setOriginalVariables(JSON.parse(JSON.stringify(syncedVariables)))
      setOriginalTags([...localTags])
      setIsEditMode(false)
      setNameError(null)
      return updatedPrompt
    } finally {
      setIsSaving(false)
    }
  }, [localName, localDescription, localTemplate, localTags, checkNameUnique, onSave])

  const handleCancel = useCallback((currentPrompt: PromptFile | null) => {
    if (currentPrompt) {
      setLocalName(currentPrompt.name)
      setLocalDescription(currentPrompt.description)
      setLocalTemplate(currentPrompt.template)
      setLocalTags([...originalTags])
    }
    setIsEditMode(false)
    setNameError(null)
    // Return restored variables for caller to update prompt state
    return originalVariables
  }, [originalTags, originalVariables])

  return {
    isEditMode,
    setIsEditMode,
    localName,
    localDescription,
    localTemplate,
    localTags,
    setLocalTags,
    nameError,
    hasUnsavedChanges,
    isSaving,
    handleLocalNameChange,
    handleLocalDescriptionChange: setLocalDescription,
    handleLocalTemplateChange,
    handleSave,
    handleCancel,
  }
}
