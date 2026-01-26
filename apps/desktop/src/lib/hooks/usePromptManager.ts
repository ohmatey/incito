import { useState, useCallback } from 'react'
import type { PromptFile, Variable } from '@/types/prompt'
import { loadPrompts, savePrompt, createPrompt, duplicatePrompt, deletePrompt, isDisplayNameUnique } from '@/lib/prompts'
import { parsePromptFile } from '@/lib/parser'
import { toast } from 'sonner'
import type { GeneratedPrompt } from '@/lib/mastra-client'
import i18n from '@/i18n'

export interface UsePromptManagerResult {
  prompts: PromptFile[]
  selectedPrompt: PromptFile | null
  setPrompts: React.Dispatch<React.SetStateAction<PromptFile[]>>
  setSelectedPrompt: React.Dispatch<React.SetStateAction<PromptFile | null>>
  loadPromptsFromFolder: (path: string) => Promise<PromptFile[]>
  selectPrompt: (prompt: PromptFile) => void
  createNewPrompt: (folderPath: string) => Promise<PromptFile | null>
  createFromAI: (folderPath: string, generated: GeneratedPrompt) => Promise<PromptFile | null>
  duplicate: (prompt: PromptFile, folderPath: string) => Promise<PromptFile | null>
  remove: (prompt: PromptFile) => Promise<boolean>
  save: (updatedPrompt: PromptFile) => Promise<boolean>
  updateSelectedPromptVariables: (variables: Variable[]) => void
  restoreVersion: (content: string) => Promise<boolean>
  isNameUnique: (name: string, excludePath?: string) => boolean
}

export function usePromptManager(): UsePromptManagerResult {
  const [prompts, setPrompts] = useState<PromptFile[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<PromptFile | null>(null)

  const loadPromptsFromFolder = useCallback(async (path: string): Promise<PromptFile[]> => {
    const loadedPrompts = await loadPrompts(path)
    setPrompts(loadedPrompts)
    return loadedPrompts
  }, [])

  const selectPrompt = useCallback((prompt: PromptFile) => {
    setSelectedPrompt(prompt)
  }, [])

  const createNewPrompt = useCallback(async (folderPath: string): Promise<PromptFile | null> => {
    try {
      const existingFileNames = prompts.map((p) => p.fileName)
      const existingDisplayNames = prompts.map((p) => p.name)
      const newPrompt = await createPrompt(folderPath, existingFileNames, existingDisplayNames)
      setPrompts((prev) => [...prev, newPrompt].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedPrompt(newPrompt)
      toast.success(i18n.t('toasts:success.promptCreated'))
      return newPrompt
    } catch (error) {
      console.error('Failed to create prompt:', error)
      toast.error(i18n.t('toasts:error.promptCreateFailed'))
      return null
    }
  }, [prompts])

  const createFromAI = useCallback(async (folderPath: string, generated: GeneratedPrompt): Promise<PromptFile | null> => {
    try {
      const existingFileNames = prompts.map((p) => p.fileName)
      const existingDisplayNames = prompts.map((p) => p.name)

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
          options: v.options
            ?.filter(opt => opt && opt.trim() !== '')
            .map(opt => ({ label: opt, value: opt })),
        })),
        tags: generated.tags,
      })

      setPrompts((prev) => [...prev, newPrompt].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedPrompt(newPrompt)
      toast.success(i18n.t('toasts:success.promptGenerated'))
      return newPrompt
    } catch (error) {
      console.error('Failed to generate prompt from AI:', error)
      toast.error(i18n.t('toasts:error.promptGenerateFailed'))
      return null
    }
  }, [prompts])

  const duplicate = useCallback(async (prompt: PromptFile, folderPath: string): Promise<PromptFile | null> => {
    try {
      const existingFileNames = prompts.map((p) => p.fileName)
      const existingDisplayNames = prompts.map((p) => p.name)
      const duplicated = await duplicatePrompt(prompt, folderPath, existingFileNames, existingDisplayNames)
      setPrompts((prev) => [...prev, duplicated].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedPrompt(duplicated)
      toast.success(i18n.t('toasts:success.promptDuplicated'))
      return duplicated
    } catch (error) {
      console.error('Failed to duplicate prompt:', error)
      toast.error(i18n.t('toasts:error.promptDuplicateFailed'))
      return null
    }
  }, [prompts])

  const remove = useCallback(async (prompt: PromptFile): Promise<boolean> => {
    try {
      await deletePrompt(prompt)
      setPrompts((prev) => {
        const remaining = prev.filter((p) => p.path !== prompt.path)

        // If deleted prompt was selected, select another one
        if (selectedPrompt?.path === prompt.path) {
          setSelectedPrompt(remaining.length > 0 ? remaining[0] : null)
        }

        return remaining
      })
      toast.success(i18n.t('toasts:success.promptDeleted'))
      return true
    } catch (error) {
      console.error('Failed to delete prompt:', error)
      toast.error(i18n.t('toasts:error.promptDeleteFailed'))
      return false
    }
  }, [selectedPrompt?.path])

  const save = useCallback(async (updatedPrompt: PromptFile): Promise<boolean> => {
    try {
      await savePrompt(updatedPrompt)
      setPrompts((prev) =>
        prev
          .map((p) => (p.path === updatedPrompt.path ? updatedPrompt : p))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setSelectedPrompt(updatedPrompt)
      toast.success(i18n.t('toasts:success.promptSaved'))
      return true
    } catch (error) {
      console.error('Failed to save prompt:', error)
      toast.error(i18n.t('toasts:error.promptSaveFailed'))
      return false
    }
  }, [])

  const updateSelectedPromptVariables = useCallback((variables: Variable[]) => {
    setSelectedPrompt((prev) => {
      if (!prev) return null
      return { ...prev, variables }
    })
  }, [])

  const restoreVersion = useCallback(async (content: string): Promise<boolean> => {
    if (!selectedPrompt) return false

    try {
      const restoredPrompt = parsePromptFile(content, selectedPrompt.fileName, selectedPrompt.path)
      setSelectedPrompt(restoredPrompt)
      setPrompts((prev) =>
        prev
          .map((p) => (p.path === restoredPrompt.path ? restoredPrompt : p))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      await savePrompt(restoredPrompt)
      toast.success(i18n.t('toasts:success.versionRestored'))
      return true
    } catch (error) {
      console.error('Failed to restore version:', error)
      toast.error(i18n.t('toasts:error.versionRestoreFailed'))
      return false
    }
  }, [selectedPrompt])

  const isNameUnique = useCallback((name: string, excludePath?: string): boolean => {
    return isDisplayNameUnique(name, [], excludePath, prompts)
  }, [prompts])

  return {
    prompts,
    selectedPrompt,
    setPrompts,
    setSelectedPrompt,
    loadPromptsFromFolder,
    selectPrompt,
    createNewPrompt,
    createFromAI,
    duplicate,
    remove,
    save,
    updateSelectedPromptVariables,
    restoreVersion,
    isNameUnique,
  }
}
