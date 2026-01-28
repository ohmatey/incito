import { useNavigate } from '@tanstack/react-router'
import { useAppContext } from '@/context/AppContext'
import { useRunMode } from '@/context/RunModeContext'
import { SearchPage as SearchPageComponent } from '@/components/SearchPage'
import type { PromptFile } from '@/types/prompt'
import type { AgentFile } from '@/types/agent'

export function SearchPage() {
  const navigate = useNavigate()
  const runMode = useRunMode()
  const {
    promptManager,
    tagManager,
    agentManager,
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

  function handleSelectAgent(agent: AgentFile) {
    navigate({ to: '/agents/$agentId', params: { agentId: agent.id }, search: { edit: false } })
  }

  function handleRunPrompt(prompt: PromptFile) {
    // Navigate to prompt and start run mode
    navigate({ to: '/prompts/$promptId', params: { promptId: prompt.id } })
    // Start run mode after navigation (small delay to allow prompt to load)
    setTimeout(() => {
      runMode.startRunMode(prompt)
    }, 100)
  }

  async function handleDuplicateAndNavigate(prompt: PromptFile) {
    const duplicated = await handleDuplicatePrompt(prompt)
    if (duplicated) {
      navigate({ to: '/prompts/$promptId', params: { promptId: duplicated.id } })
    }
  }

  async function handleDeleteAgent(agent: AgentFile) {
    await agentManager.remove(agent)
  }

  function handleTogglePinAgent(agentId: string) {
    const isPinned = agentManager.pinnedAgentIds.includes(agentId)
    if (isPinned) {
      agentManager.unpinAgent(agentId)
    } else {
      agentManager.pinAgent(agentId)
    }
  }

  return (
    <SearchPageComponent
      prompts={promptManager.prompts}
      agents={agentManager.agents}
      tags={tagManager.tags}
      pinnedPromptIds={pinnedPromptIds}
      pinnedAgentIds={agentManager.pinnedAgentIds}
      selectedPrompt={null} // Always null on search page - fixes the UX bug
      onSelectPrompt={handleSelectPrompt}
      onSelectAgent={handleSelectAgent}
      onRunPrompt={handleRunPrompt}
      onDuplicatePrompt={handleDuplicateAndNavigate}
      onDeletePrompt={handleDeletePrompt}
      onDeleteAgent={handleDeleteAgent}
      onTogglePinPrompt={togglePinPrompt}
      onTogglePinAgent={handleTogglePinAgent}
      focusTrigger={searchFocusTrigger}
    />
  )
}
