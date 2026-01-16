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

interface UseTagsOptions {
  prompts: PromptFile[]
  setPrompts: React.Dispatch<React.SetStateAction<PromptFile[]>>
  selectedPrompt: PromptFile | null
  setSelectedPrompt: (prompt: PromptFile | null) => void
}

export function useTags({ prompts, setPrompts, selectedPrompt, setSelectedPrompt }: UseTagsOptions) {
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null)

  const loadTags = useCallback(async () => {
    const result = await getAllTags()
    if (result.ok) {
      setTags(result.data)
      return result.data
    } else {
      toast.error(result.error)
      return []
    }
  }, [])

  const handleCreateTag = useCallback(async (name: string, color: string) => {
    const result = await createTagInDb(name, color)
    if (result.ok) {
      setTags((prev) => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)))
      toast.success('Created tag')
      return result.data
    } else {
      toast.error(result.error)
      return null
    }
  }, [])

  const handleUpdateTag = useCallback(async (id: string, name: string, color: string) => {
    // Find old tag name to update prompts
    const oldTag = tags.find((t) => t.id === id)
    const oldName = oldTag?.name

    const result = await updateTagInDb(id, name, color)
    if (result.ok) {
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
  }, [tags, prompts, setPrompts, selectedPrompt, setSelectedPrompt])

  const handleDeleteTag = useCallback(async (id: string) => {
    const tagToDelete = tags.find((t) => t.id === id)
    if (!tagToDelete) return false

    const result = await deleteTagInDb(id)
    if (result.ok) {
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
    } else {
      toast.error(result.error)
      return false
    }
  }, [tags, prompts, setPrompts, selectedPrompt, setSelectedPrompt])

  return {
    tags,
    setTags,
    selectedTagFilter,
    setSelectedTagFilter,
    loadTags,
    createTag: handleCreateTag,
    updateTag: handleUpdateTag,
    deleteTag: handleDeleteTag,
  }
}
