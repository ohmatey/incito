import { useState, useCallback } from 'react'
import type { PromptFile } from '@/types/prompt'
import { loadPrompts as loadPromptsFromDisk, savePrompt, createPrompt, duplicatePrompt, deletePrompt, isDisplayNameUnique } from '@/lib/prompts'
import { toast } from 'sonner'
import i18n from '@/i18n'

interface UsePromptsOptions {
  folderPath: string | null
  onPromptCreated?: (prompt: PromptFile) => void
  onPromptDeleted?: (prompt: PromptFile) => void
}

export function usePrompts({ folderPath, onPromptCreated, onPromptDeleted }: UsePromptsOptions) {
  const [prompts, setPrompts] = useState<PromptFile[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<PromptFile | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadPrompts = useCallback(async (path: string): Promise<PromptFile[]> => {
    setIsLoading(true)
    try {
      const loadedPrompts = await loadPromptsFromDisk(path)
      setPrompts(loadedPrompts)
      return loadedPrompts
    } finally {
      setIsLoading(false)
    }
  }, [])

  const selectPrompt = useCallback((prompt: PromptFile | null) => {
    setSelectedPrompt(prompt)
  }, [])

  const handleCreatePrompt = useCallback(async () => {
    if (!folderPath) return

    try {
      const existingFileNames = prompts.map((p) => p.fileName)
      const existingDisplayNames = prompts.map((p) => p.name)
      const newPrompt = await createPrompt(folderPath, existingFileNames, existingDisplayNames)
      setPrompts((prev) => [...prev, newPrompt].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedPrompt(newPrompt)
      onPromptCreated?.(newPrompt)
      toast.success(i18n.t('toasts:success.promptCreated'))
      return newPrompt
    } catch (err) {
      toast.error(i18n.t('toasts:error.promptCreateFailed'))
      throw err
    }
  }, [folderPath, prompts, onPromptCreated])

  const handleDuplicatePrompt = useCallback(async (prompt: PromptFile) => {
    if (!folderPath) return

    try {
      const existingFileNames = prompts.map((p) => p.fileName)
      const existingDisplayNames = prompts.map((p) => p.name)
      const duplicated = await duplicatePrompt(prompt, folderPath, existingFileNames, existingDisplayNames)
      setPrompts((prev) => [...prev, duplicated].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedPrompt(duplicated)
      onPromptCreated?.(duplicated)
      toast.success(i18n.t('toasts:success.promptDuplicated'))
      return duplicated
    } catch (err) {
      toast.error(i18n.t('toasts:error.promptDuplicateFailed'))
      throw err
    }
  }, [folderPath, prompts, onPromptCreated])

  const handleDeletePrompt = useCallback(async (prompt: PromptFile) => {
    if (!folderPath) return
    try {
      await deletePrompt(prompt, folderPath)
      setPrompts((prev) => prev.filter((p) => p.path !== prompt.path))

      if (selectedPrompt?.path === prompt.path) {
        const remaining = prompts.filter((p) => p.path !== prompt.path)
        setSelectedPrompt(remaining.length > 0 ? remaining[0] : null)
      }

      onPromptDeleted?.(prompt)
      toast.success(i18n.t('toasts:success.promptDeleted'))
    } catch (err) {
      toast.error(i18n.t('toasts:error.promptDeleteFailed'))
      throw err
    }
  }, [folderPath, prompts, selectedPrompt, onPromptDeleted])

  const handleSavePrompt = useCallback(async (updatedPrompt: PromptFile) => {
    if (!folderPath) throw new Error('No folder path set')
    try {
      await savePrompt(updatedPrompt, folderPath)
      setPrompts((prev) =>
        prev
          .map((p) => (p.path === updatedPrompt.path ? updatedPrompt : p))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setSelectedPrompt(updatedPrompt)
      toast.success(i18n.t('toasts:success.promptSaved'))
      return updatedPrompt
    } catch (err) {
      toast.error(i18n.t('toasts:error.promptSaveFailed'))
      throw err
    }
  }, [folderPath])

  const updatePromptInMemory = useCallback((updatedPrompt: PromptFile) => {
    setSelectedPrompt(updatedPrompt)
    // Also update in the prompts list for consistency
    setPrompts((prev) =>
      prev.map((p) => (p.path === updatedPrompt.path ? updatedPrompt : p))
    )
  }, [])

  const checkNameUnique = useCallback((name: string, excludePath?: string) => {
    return isDisplayNameUnique(name, [], excludePath, prompts)
  }, [prompts])

  return {
    prompts,
    setPrompts,
    selectedPrompt,
    selectPrompt,
    isLoading,
    loadPrompts,
    createPrompt: handleCreatePrompt,
    duplicatePrompt: handleDuplicatePrompt,
    deletePrompt: handleDeletePrompt,
    savePrompt: handleSavePrompt,
    updatePromptInMemory,
    checkNameUnique,
  }
}
