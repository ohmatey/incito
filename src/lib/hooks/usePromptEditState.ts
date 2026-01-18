import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { PromptFile, Variable } from '@/types/prompt'
import { getDefaultValues } from '@/lib/interpolate'
import { syncVariablesWithTemplate } from '@/lib/parser'
import { isDisplayNameUnique } from '@/lib/prompts'
import { getPromptDraft, savePromptDraft, deletePromptDraft } from '@/lib/store'

export interface UsePromptEditStateResult {
  // Edit mode
  isEditMode: boolean
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>
  enterEditMode: () => void
  exitEditMode: () => void

  // Local state values
  localName: string
  localDescription: string
  localTemplate: string
  localTags: string[]
  setLocalName: (name: string) => void
  setLocalDescription: React.Dispatch<React.SetStateAction<string>>
  setLocalTemplate: (template: string, selectedPrompt: PromptFile | null, updateVariables: (vars: Variable[]) => void) => void
  setLocalTags: React.Dispatch<React.SetStateAction<string[]>>

  // Original values for comparison
  originalVariables: Variable[]
  originalTags: string[]

  // Validation
  nameError: string | null
  setNameError: React.Dispatch<React.SetStateAction<string | null>>
  validateName: (name: string, prompts: PromptFile[], excludePath?: string) => boolean

  // Variable values for preview
  variableValues: Record<string, unknown>
  setVariableValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
  handleValueChange: (key: string, value: unknown) => void

  // Active variable tracking
  activeVariableKey: string | null
  setActiveVariableKey: React.Dispatch<React.SetStateAction<string | null>>

  // Unsaved changes detection
  hasUnsavedChanges: boolean
  variablesChanged: boolean
  tagsChanged: boolean

  // Reset/restore
  resetToSaved: (prompt: PromptFile, updateVariables: (vars: Variable[]) => void) => void
  syncFromPrompt: (prompt: PromptFile | null) => void
  resetVariableValues: () => void

  // Draft management
  clearDraft: () => Promise<void>
}

export function usePromptEditState(
  selectedPrompt: PromptFile | null,
  prompts: PromptFile[]
): UsePromptEditStateResult {
  // Edit mode
  const [isEditMode, setIsEditMode] = useState(false)

  // Local state values
  const [localName, setLocalNameState] = useState('')
  const [localDescription, setLocalDescription] = useState('')
  const [localTemplate, setLocalTemplateState] = useState('')
  const [localTags, setLocalTags] = useState<string[]>([])

  // Original values for comparison
  const [originalVariables, setOriginalVariables] = useState<Variable[]>([])
  const [originalTags, setOriginalTags] = useState<string[]>([])

  // Validation
  const [nameError, setNameError] = useState<string | null>(null)

  // Variable values for preview
  const [variableValues, setVariableValues] = useState<Record<string, unknown>>({})

  // Active variable tracking
  const [activeVariableKey, setActiveVariableKey] = useState<string | null>(null)

  // Debounce timer ref for auto-saving drafts
  const saveDraftTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sync local state when prompt changes (and load draft if exists)
  useEffect(() => {
    if (selectedPrompt) {
      setLocalNameState(selectedPrompt.name)
      setLocalDescription(selectedPrompt.description)
      setLocalTemplateState(selectedPrompt.template)
      setLocalTags(selectedPrompt.tags || [])
      setOriginalVariables(JSON.parse(JSON.stringify(selectedPrompt.variables)))
      setOriginalTags([...(selectedPrompt.tags || [])])
      setNameError(null)

      // Load draft if exists, otherwise use defaults
      const defaultValues = getDefaultValues(selectedPrompt.variables)
      const variableKeys = selectedPrompt.variables.map((v) => v.key)

      getPromptDraft(selectedPrompt.id).then((result) => {
        if (result.ok && result.data) {
          // Filter draft values to only include keys that still exist in the prompt
          const filteredDraftValues: Record<string, unknown> = {}
          for (const key of variableKeys) {
            if (key in result.data.variable_values) {
              filteredDraftValues[key] = result.data.variable_values[key]
            } else if (key in defaultValues) {
              filteredDraftValues[key] = defaultValues[key]
            }
          }
          setVariableValues(filteredDraftValues)
        } else {
          setVariableValues(defaultValues)
        }
      })
    } else {
      setLocalNameState('')
      setLocalDescription('')
      setLocalTemplateState('')
      setLocalTags([])
      setOriginalVariables([])
      setOriginalTags([])
      setVariableValues({})
      setNameError(null)
    }
  }, [selectedPrompt?.path])

  // Edit mode handlers
  const enterEditMode = useCallback(() => {
    setIsEditMode(true)
  }, [])

  const exitEditMode = useCallback(() => {
    setIsEditMode(false)
  }, [])

  // Name validation and setting
  const setLocalName = useCallback((newName: string) => {
    setLocalNameState(newName)

    if (!newName.trim()) {
      setNameError('Name cannot be empty')
      return
    }

    const isUnique = isDisplayNameUnique(newName, [], selectedPrompt?.path, prompts)
    if (!isUnique) {
      setNameError('A prompt with this name already exists')
    } else {
      setNameError(null)
    }
  }, [selectedPrompt?.path, prompts])

  const validateName = useCallback((name: string, allPrompts: PromptFile[], excludePath?: string): boolean => {
    if (!name.trim()) {
      setNameError('Name cannot be empty')
      return false
    }

    const isUnique = isDisplayNameUnique(name, [], excludePath, allPrompts)
    if (!isUnique) {
      setNameError('A prompt with this name already exists')
      return false
    }

    setNameError(null)
    return true
  }, [])

  // Template setting with variable sync
  const setLocalTemplate = useCallback((
    template: string,
    currentPrompt: PromptFile | null,
    updateVariables: (vars: Variable[]) => void
  ) => {
    setLocalTemplateState(template)

    if (!currentPrompt) return

    // Sync variables with template (auto-detect {{variable}} patterns)
    const syncedVariables = syncVariablesWithTemplate(currentPrompt.variables, template)
    updateVariables(syncedVariables)
  }, [])

  // Value change handler with auto-save draft
  const handleValueChange = useCallback((key: string, value: unknown) => {
    setVariableValues((prev) => {
      const newValues = { ...prev, [key]: value }

      // Auto-save draft with debounce
      if (selectedPrompt) {
        if (saveDraftTimeoutRef.current) {
          clearTimeout(saveDraftTimeoutRef.current)
        }

        saveDraftTimeoutRef.current = setTimeout(() => {
          // Check if values differ from defaults before saving
          const defaults = getDefaultValues(selectedPrompt.variables)
          const hasChanges = Object.keys(newValues).some((k) => {
            const newVal = newValues[k]
            const defaultVal = defaults[k]
            // Handle empty strings and undefined as equivalent for comparison
            const normalizedNew = newVal === '' ? undefined : newVal
            const normalizedDefault = defaultVal === '' ? undefined : defaultVal
            return normalizedNew !== normalizedDefault
          })

          if (hasChanges) {
            savePromptDraft(selectedPrompt.id, newValues)
          } else {
            // If no changes from defaults, remove the draft
            deletePromptDraft(selectedPrompt.id)
          }
        }, 500)
      }

      return newValues
    })
  }, [selectedPrompt])

  // Unsaved changes detection
  const variablesChanged = useMemo(() => {
    return selectedPrompt
      ? JSON.stringify(selectedPrompt.variables) !== JSON.stringify(originalVariables)
      : false
  }, [selectedPrompt, originalVariables])

  const tagsChanged = useMemo(() => {
    return selectedPrompt
      ? JSON.stringify(localTags.slice().sort()) !== JSON.stringify(originalTags.slice().sort())
      : false
  }, [selectedPrompt, localTags, originalTags])

  const hasUnsavedChanges = useMemo(() => {
    return selectedPrompt
      ? localName !== selectedPrompt.name ||
        localDescription !== selectedPrompt.description ||
        localTemplate !== selectedPrompt.template ||
        variablesChanged ||
        tagsChanged
      : false
  }, [selectedPrompt, localName, localDescription, localTemplate, variablesChanged, tagsChanged])

  // Reset to saved state
  const resetToSaved = useCallback((prompt: PromptFile, updateVariables: (vars: Variable[]) => void) => {
    setLocalNameState(prompt.name)
    setLocalDescription(prompt.description)
    setLocalTemplateState(prompt.template)
    setLocalTags([...originalTags])
    updateVariables(JSON.parse(JSON.stringify(originalVariables)))
    setNameError(null)
  }, [originalTags, originalVariables])

  // Manual sync from prompt (used after save)
  const syncFromPrompt = useCallback((prompt: PromptFile | null) => {
    if (prompt) {
      setOriginalVariables(JSON.parse(JSON.stringify(prompt.variables)))
      setOriginalTags([...(prompt.tags || [])])
      setLocalTags([...(prompt.tags || [])])
    }
  }, [])

  // Reset variable values to defaults
  const resetVariableValues = useCallback(() => {
    if (selectedPrompt) {
      setVariableValues(getDefaultValues(selectedPrompt.variables))
    }
  }, [selectedPrompt])

  // Clear draft for current prompt
  const clearDraft = useCallback(async () => {
    if (selectedPrompt) {
      // Cancel any pending save
      if (saveDraftTimeoutRef.current) {
        clearTimeout(saveDraftTimeoutRef.current)
        saveDraftTimeoutRef.current = null
      }
      await deletePromptDraft(selectedPrompt.id)
    }
  }, [selectedPrompt])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveDraftTimeoutRef.current) {
        clearTimeout(saveDraftTimeoutRef.current)
      }
    }
  }, [])

  return {
    // Edit mode
    isEditMode,
    setIsEditMode,
    enterEditMode,
    exitEditMode,

    // Local state values
    localName,
    localDescription,
    localTemplate,
    localTags,
    setLocalName,
    setLocalDescription,
    setLocalTemplate,
    setLocalTags,

    // Original values
    originalVariables,
    originalTags,

    // Validation
    nameError,
    setNameError,
    validateName,

    // Variable values
    variableValues,
    setVariableValues,
    handleValueChange,

    // Active variable
    activeVariableKey,
    setActiveVariableKey,

    // Unsaved changes
    hasUnsavedChanges,
    variablesChanged,
    tagsChanged,

    // Reset/restore
    resetToSaved,
    syncFromPrompt,
    resetVariableValues,

    // Draft management
    clearDraft,
  }
}
