import { useState, useCallback } from 'react'
import type { AgentFile } from '@/types/agent'
import {
  loadAgents,
  saveAgent,
  createAgent,
  duplicateAgent,
  deleteAgent,
  isDisplayNameUnique,
  type InitialAgentContent,
} from '@/lib/agents'
// Agent parser import removed - not needed in this hook
import { toast } from 'sonner'
import i18n from '@/i18n'
import {
  getPinnedAgentIds,
  addPinnedAgent,
  removePinnedAgent,
} from '@/lib/store'

export interface UseAgentManagerResult {
  agents: AgentFile[]
  selectedAgent: AgentFile | null
  pinnedAgentIds: string[]
  setAgents: React.Dispatch<React.SetStateAction<AgentFile[]>>
  setSelectedAgent: React.Dispatch<React.SetStateAction<AgentFile | null>>
  loadAgentsFromFolder: (path: string) => Promise<AgentFile[]>
  selectAgent: (agent: AgentFile) => void
  createNewAgent: (folderPath: string, initialContent?: InitialAgentContent) => Promise<AgentFile | null>
  duplicate: (agent: AgentFile, folderPath: string) => Promise<AgentFile | null>
  remove: (agent: AgentFile) => Promise<boolean>
  save: (updatedAgent: AgentFile) => Promise<boolean>
  isNameUnique: (name: string, excludePath?: string) => boolean
  pinAgent: (agentId: string) => Promise<void>
  unpinAgent: (agentId: string) => Promise<void>
  loadPinnedAgents: () => Promise<void>
}

export function useAgentManager(): UseAgentManagerResult {
  const [agents, setAgents] = useState<AgentFile[]>([])
  const [selectedAgent, setSelectedAgent] = useState<AgentFile | null>(null)
  const [pinnedAgentIds, setPinnedAgentIds] = useState<string[]>([])

  const loadAgentsFromFolder = useCallback(async (path: string): Promise<AgentFile[]> => {
    const loadedAgents = await loadAgents(path)
    setAgents(loadedAgents)
    return loadedAgents
  }, [])

  const loadPinnedAgents = useCallback(async () => {
    const result = await getPinnedAgentIds()
    if (result.ok) {
      setPinnedAgentIds(result.data)
    }
  }, [])

  const selectAgent = useCallback((agent: AgentFile) => {
    setSelectedAgent(agent)
  }, [])

  const createNewAgent = useCallback(
    async (folderPath: string, initialContent?: InitialAgentContent): Promise<AgentFile | null> => {
      try {
        const existingFileNames = agents.map((a) => a.fileName)
        const existingDisplayNames = agents.map((a) => a.name)
        const newAgent = await createAgent(folderPath, existingFileNames, existingDisplayNames, initialContent)
        setAgents((prev) => [...prev, newAgent].sort((a, b) => a.name.localeCompare(b.name)))
        setSelectedAgent(newAgent)
        toast.success(i18n.t('toasts:success.agentCreated'))
        return newAgent
      } catch (error) {
        console.error('Failed to create agent:', error)
        toast.error(i18n.t('toasts:error.agentCreateFailed'))
        return null
      }
    },
    [agents]
  )

  const duplicate = useCallback(
    async (agent: AgentFile, folderPath: string): Promise<AgentFile | null> => {
      try {
        const existingFileNames = agents.map((a) => a.fileName)
        const existingDisplayNames = agents.map((a) => a.name)
        const duplicated = await duplicateAgent(agent, folderPath, existingFileNames, existingDisplayNames)
        setAgents((prev) => [...prev, duplicated].sort((a, b) => a.name.localeCompare(b.name)))
        setSelectedAgent(duplicated)
        toast.success(i18n.t('toasts:success.agentDuplicated'))
        return duplicated
      } catch (error) {
        console.error('Failed to duplicate agent:', error)
        toast.error(i18n.t('toasts:error.agentDuplicateFailed'))
        return null
      }
    },
    [agents]
  )

  const remove = useCallback(
    async (agent: AgentFile): Promise<boolean> => {
      try {
        await deleteAgent(agent)
        setAgents((prev) => {
          const remaining = prev.filter((a) => a.path !== agent.path)

          // If deleted agent was selected, select another one
          if (selectedAgent?.path === agent.path) {
            setSelectedAgent(remaining.length > 0 ? remaining[0] : null)
          }

          return remaining
        })
        toast.success(i18n.t('toasts:success.agentDeleted'))
        return true
      } catch (error) {
        console.error('Failed to delete agent:', error)
        toast.error(i18n.t('toasts:error.agentDeleteFailed'))
        return false
      }
    },
    [selectedAgent?.path]
  )

  const save = useCallback(async (updatedAgent: AgentFile): Promise<boolean> => {
    try {
      await saveAgent(updatedAgent)
      setAgents((prev) =>
        prev
          .map((a) => (a.path === updatedAgent.path ? updatedAgent : a))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setSelectedAgent(updatedAgent)
      toast.success(i18n.t('toasts:success.agentSaved'))
      return true
    } catch (error) {
      console.error('Failed to save agent:', error)
      toast.error(i18n.t('toasts:error.agentSaveFailed'))
      return false
    }
  }, [])

  const isNameUnique = useCallback(
    (name: string, excludePath?: string): boolean => {
      return isDisplayNameUnique(name, [], excludePath, agents)
    },
    [agents]
  )

  const pinAgent = useCallback(async (agentId: string) => {
    const result = await addPinnedAgent(agentId)
    if (result.ok) {
      setPinnedAgentIds((prev) => [...prev, agentId])
    }
  }, [])

  const unpinAgent = useCallback(async (agentId: string) => {
    const result = await removePinnedAgent(agentId)
    if (result.ok) {
      setPinnedAgentIds((prev) => prev.filter((id) => id !== agentId))
    }
  }, [])

  return {
    agents,
    selectedAgent,
    pinnedAgentIds,
    setAgents,
    setSelectedAgent,
    loadAgentsFromFolder,
    selectAgent,
    createNewAgent,
    duplicate,
    remove,
    save,
    isNameUnique,
    pinAgent,
    unpinAgent,
    loadPinnedAgents,
  }
}
