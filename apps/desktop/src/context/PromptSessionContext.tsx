import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { PromptFile } from '@/types/prompt'
import {
  getRecentPromptIds,
  addRecentPrompt,
  removeRecentPrompt,
  getPinnedPromptIds,
  addPinnedPrompt,
  removePinnedPrompt,
  getAllPromptDrafts,
  deletePromptDraft,
  type PromptDraft,
} from '@/lib/store'

interface PromptSessionContextValue {
  // Recent prompts
  recentPromptIds: string[]
  addToRecent: (promptId: string) => Promise<void>
  removeFromRecent: (promptId: string) => Promise<void>

  // Pinned prompts
  pinnedPromptIds: string[]
  togglePinPrompt: (promptId: string) => Promise<void>

  // In-progress prompts (drafts with their prompts)
  inProgressPrompts: Array<{ draft: PromptDraft; prompt: PromptFile }>
  refreshDrafts: (prompts: PromptFile[]) => Promise<void>
  clearDraftById: (promptId: string) => Promise<void>
  setInProgressPrompts: React.Dispatch<React.SetStateAction<Array<{ draft: PromptDraft; prompt: PromptFile }>>>

  // Variant selection memory
  selectedVariantByParent: Record<string, string>
  setSelectedVariantByParent: React.Dispatch<React.SetStateAction<Record<string, string>>>
  getRememberedVariantId: (parentFileName: string) => string | undefined
  rememberVariantSelection: (prompt: PromptFile) => void
  clearVariantSelection: (prompt: PromptFile) => void

  // Initialize session data (called after folder loads)
  initializeSession: (prompts: PromptFile[]) => Promise<void>
  resetSession: () => void
}

const PromptSessionContext = createContext<PromptSessionContextValue | null>(null)

export function usePromptSession() {
  const context = useContext(PromptSessionContext)
  if (!context) {
    throw new Error('usePromptSession must be used within PromptSessionProvider')
  }
  return context
}

interface PromptSessionProviderProps {
  children: ReactNode
}

export function PromptSessionProvider({ children }: PromptSessionProviderProps) {
  // Recent prompts state
  const [recentPromptIds, setRecentPromptIds] = useState<string[]>([])

  // Pinned prompts state
  const [pinnedPromptIds, setPinnedPromptIds] = useState<string[]>([])

  // In-progress prompts state (drafts matched with their prompts)
  const [inProgressPrompts, setInProgressPrompts] = useState<Array<{ draft: PromptDraft; prompt: PromptFile }>>([])

  // Track selected variant for each parent prompt (parentFileName -> variantId)
  const [selectedVariantByParent, setSelectedVariantByParent] = useState<Record<string, string>>({})

  // Recent prompts operations
  async function addToRecent(promptId: string) {
    await addRecentPrompt(promptId)
    setRecentPromptIds((prev) => {
      const filtered = prev.filter((id) => id !== promptId)
      return [promptId, ...filtered].slice(0, 10)
    })
  }

  async function removeFromRecent(promptId: string) {
    await removeRecentPrompt(promptId)
    setRecentPromptIds((prev) => prev.filter((id) => id !== promptId))
  }

  // Pinned prompts operations
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

  // Drafts operations
  const refreshDrafts = useCallback(async (prompts: PromptFile[]) => {
    const draftsResult = await getAllPromptDrafts()
    if (draftsResult.ok) {
      const matched = draftsResult.data
        .map((draft) => {
          const prompt = prompts.find((p) => p.id === draft.prompt_id)
          return prompt ? { draft, prompt } : null
        })
        .filter((item): item is { draft: PromptDraft; prompt: PromptFile } => item !== null)
      setInProgressPrompts(matched)
    }
  }, [])

  async function clearDraftById(promptId: string) {
    await deletePromptDraft(promptId)
    setInProgressPrompts((prev) => prev.filter((item) => item.prompt.id !== promptId))
  }

  // Variant memory operations
  function getRememberedVariantId(parentFileName: string): string | undefined {
    return selectedVariantByParent[parentFileName]
  }

  function rememberVariantSelection(prompt: PromptFile) {
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

  function clearVariantSelection(prompt: PromptFile) {
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

  // Initialize session data after folder loads
  async function initializeSession(prompts: PromptFile[]) {
    const [recentResult, pinnedResult, draftsResult] = await Promise.all([
      getRecentPromptIds(),
      getPinnedPromptIds(),
      getAllPromptDrafts(),
    ])

    if (recentResult.ok) {
      setRecentPromptIds(recentResult.data)
    }
    if (pinnedResult.ok) {
      setPinnedPromptIds(pinnedResult.data)
    }
    if (draftsResult.ok) {
      const matched = draftsResult.data
        .map((draft) => {
          const prompt = prompts.find((p) => p.id === draft.prompt_id)
          return prompt ? { draft, prompt } : null
        })
        .filter((item): item is { draft: PromptDraft; prompt: PromptFile } => item !== null)
      setInProgressPrompts(matched)
    }
  }

  // Reset session state
  function resetSession() {
    setRecentPromptIds([])
    setPinnedPromptIds([])
    setInProgressPrompts([])
    setSelectedVariantByParent({})
  }

  const value: PromptSessionContextValue = {
    recentPromptIds,
    addToRecent,
    removeFromRecent,
    pinnedPromptIds,
    togglePinPrompt,
    inProgressPrompts,
    refreshDrafts,
    clearDraftById,
    setInProgressPrompts,
    selectedVariantByParent,
    setSelectedVariantByParent,
    getRememberedVariantId,
    rememberVariantSelection,
    clearVariantSelection,
    initializeSession,
    resetSession,
  }

  return (
    <PromptSessionContext.Provider value={value}>
      {children}
    </PromptSessionContext.Provider>
  )
}
