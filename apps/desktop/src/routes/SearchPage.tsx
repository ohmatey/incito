import { useNavigate } from '@tanstack/react-router'
import { useAppContext } from '@/context/AppContext'
import { SearchPage as SearchPageComponent } from '@/components/SearchPage'
import type { PromptFile } from '@/types/prompt'

export function SearchPage() {
  const navigate = useNavigate()
  const {
    promptManager,
    tagManager,
    handleDuplicatePrompt,
    handleDeletePrompt,
    pinnedPromptIds,
    togglePinPrompt,
    searchFocusTrigger,
  } = useAppContext()

  // UX FIX: On search page, never show a prompt as selected
  // Selection is only relevant on the prompts page
  function handleSelectPrompt(prompt: PromptFile) {
    // Navigate to the prompt detail page
    navigate({ to: '/prompts/$promptId', params: { promptId: prompt.id } })
  }

  async function handleDuplicateAndNavigate(prompt: PromptFile) {
    const duplicated = await handleDuplicatePrompt(prompt)
    if (duplicated) {
      navigate({ to: '/prompts/$promptId', params: { promptId: duplicated.id } })
    }
  }

  return (
    <SearchPageComponent
      prompts={promptManager.prompts}
      tags={tagManager.tags}
      pinnedPromptIds={pinnedPromptIds}
      selectedPrompt={null} // Always null on search page - fixes the UX bug
      onSelectPrompt={handleSelectPrompt}
      onDuplicatePrompt={handleDuplicateAndNavigate}
      onDeletePrompt={handleDeletePrompt}
      onTogglePinPrompt={togglePinPrompt}
      focusTrigger={searchFocusTrigger}
    />
  )
}
