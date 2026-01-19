import { Outlet, useNavigate, useParams } from '@tanstack/react-router'
import { useAppContext } from '@/context/AppContext'
import { PromptList } from '@/components/PromptList'
import { ResizeHandle } from '@/components/ui/resize-handle'
import type { PromptFile } from '@/types/prompt'

export function PromptsPage() {
  const navigate = useNavigate()
  const { promptId } = useParams({ strict: false })
  const {
    promptManager,
    editState,
    setShowNewPromptDialog,
    handleDuplicatePrompt,
    handleDeletePrompt,
    setRightPanelOpen,
    panelWidths,
    handlePromptListResize,
    handlePanelResizeEnd,
    pinnedPromptIds,
    togglePinPrompt,
    getRememberedVariantId,
  } = useAppContext()

  // Derive selected prompt from URL param
  const selectedPrompt = promptId
    ? promptManager.prompts.find((p) => p.id === promptId) || null
    : null

  // Update promptManager's selectedPrompt when URL changes
  // This syncs the URL-based selection with the state
  if (selectedPrompt && promptManager.selectedPrompt?.id !== selectedPrompt.id) {
    promptManager.selectPrompt(selectedPrompt)
    editState.setIsEditMode(false)
    setRightPanelOpen(true)
  }

  function handleSelectPrompt(prompt: PromptFile) {
    // Check if there's a remembered variant for this prompt
    const rememberedVariantId = getRememberedVariantId(prompt.fileName)
    const targetId = rememberedVariantId || prompt.id
    navigate({ to: '/prompts/$promptId', params: { promptId: targetId } })
  }

  async function handleDuplicateAndNavigate(prompt: PromptFile) {
    const duplicated = await handleDuplicatePrompt(prompt)
    if (duplicated) {
      navigate({ to: '/prompts/$promptId', params: { promptId: duplicated.id } })
    }
  }

  return (
    <>
      <PromptList
        prompts={promptManager.prompts}
        pinnedPromptIds={pinnedPromptIds}
        selectedPrompt={selectedPrompt}
        onSelectPrompt={handleSelectPrompt}
        onDuplicatePrompt={handleDuplicateAndNavigate}
        onDeletePrompt={handleDeletePrompt}
        onTogglePinPrompt={togglePinPrompt}
        onNewPrompt={() => setShowNewPromptDialog(true)}
        width={panelWidths.promptList}
      />
      <ResizeHandle
        side="left"
        onResize={handlePromptListResize}
        onResizeEnd={handlePanelResizeEnd}
      />
      <Outlet />
    </>
  )
}
