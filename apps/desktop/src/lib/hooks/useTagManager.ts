import { useState, useCallback } from 'react'
import type { Tag, PromptFile } from '@/types/prompt'
import {
  getAllTags,
  createTag as createTagInDb,
  updateTag as updateTagInDb,
  deleteTag as deleteTagInDb,
} from '@/lib/store'
import { savePrompt } from '@/lib/prompts'
import { toast } from 'sonner'

export interface UseTagManagerResult {
  tags: Tag[]
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>
  loadTags: () => Promise<Tag[]>
  createTag: (name: string, color: string) => Promise<Tag | null>
  updateTag: (
    id: string,
    name: string,
    color: string,
    prompts: PromptFile[],
    setPrompts: React.Dispatch<React.SetStateAction<PromptFile[]>>,
    selectedPrompt: PromptFile | null,
    setSelectedPrompt: React.Dispatch<React.SetStateAction<PromptFile | null>>
  ) => Promise<boolean>
  deleteTag: (
    id: string,
    prompts: PromptFile[],
    setPrompts: React.Dispatch<React.SetStateAction<PromptFile[]>>,
    selectedPrompt: PromptFile | null,
    setSelectedPrompt: React.Dispatch<React.SetStateAction<PromptFile | null>>
  ) => Promise<boolean>
}

export function useTagManager(): UseTagManagerResult {
  const [tags, setTags] = useState<Tag[]>([])

  const loadTags = useCallback(async (): Promise<Tag[]> => {
    const result = await getAllTags()
    if (result.ok) {
      setTags(result.data)
      return result.data
    } else {
      toast.error(result.error)
      return []
    }
  }, [])

  const createTag = useCallback(async (name: string, color: string): Promise<Tag | null> => {
    try {
      const result = await createTagInDb(name, color)
      if (result.ok) {
        setTags((prev) => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)))
        toast.success('Created tag')
        return result.data
      } else {
        toast.error(result.error)
        return null
      }
    } catch (err) {
      toast.error('Failed to create tag')
      return null
    }
  }, [])

  const updateTag = useCallback(async (
    id: string,
    name: string,
    color: string,
    prompts: PromptFile[],
    setPrompts: React.Dispatch<React.SetStateAction<PromptFile[]>>,
    selectedPrompt: PromptFile | null,
    setSelectedPrompt: React.Dispatch<React.SetStateAction<PromptFile | null>>
  ): Promise<boolean> => {
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
        return true
      } else {
        toast.error(result.error)
        return false
      }
    } catch (err) {
      toast.error('Failed to update tag')
      return false
    }
  }, [tags])

  const deleteTag = useCallback(async (
    id: string,
    prompts: PromptFile[],
    setPrompts: React.Dispatch<React.SetStateAction<PromptFile[]>>,
    selectedPrompt: PromptFile | null,
    setSelectedPrompt: React.Dispatch<React.SetStateAction<PromptFile | null>>
  ): Promise<boolean> => {
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
        return true
      } else if (!result.ok) {
        toast.error(result.error)
        return false
      }
      return false
    } catch (err) {
      toast.error('Failed to delete tag')
      return false
    }
  }, [tags])

  return {
    tags,
    setTags,
    loadTags,
    createTag,
    updateTag,
    deleteTag,
  }
}
