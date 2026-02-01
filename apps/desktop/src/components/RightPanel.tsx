import { useState } from 'react'
import type { PromptFile, Note, Variable } from '@/types/prompt'
import type { AgentFile } from '@/types/agent'
import type { RightPanelTab } from './PromptHeader'
import { RightPanelHeader } from './right-panel/RightPanelHeader'
import { PreviewTab } from './right-panel/PreviewTab'
import { HistoryTab } from './right-panel/HistoryTab'
import { NotesTab } from './right-panel/NotesTab'
import { ConfigTab } from './right-panel/ConfigTab'
import { InstructionsTab } from './right-panel/InstructionsTab'
import { RunsTab } from './right-panel/RunsTab'
import { PromptSettingsTab } from './prompt-settings'

interface RightPanelProps {
  prompt: PromptFile | null
  allPrompts: PromptFile[]
  agents: AgentFile[]
  agentsEnabled?: boolean
  playbooksEnabled?: boolean
  values: Record<string, unknown>
  activeTab: RightPanelTab
  activeVariableKey: string | null
  isEditMode?: boolean
  runsEnabled?: boolean
  onActiveVariableChange: (key: string | null) => void
  onValueChange: (key: string, value: unknown) => void
  onNotesChange: (notes: Note[]) => void
  onRestoreVersion: (content: string) => void
  onTabChange: (tab: RightPanelTab) => void
  onClose: () => void
  onEditPrompt: () => void
  onDeletePrompt: () => void
  onVariableUpdate?: (variable: Variable) => void
  onVariableMove?: (fromIndex: number, toIndex: number) => void
  onDefaultLaunchersChange: (launchers: string[]) => void
  onDefaultAgentChange: (agentId: string | null) => void
  onSelectVariant?: (prompt: PromptFile) => void
  onNewVariant?: () => void
  width?: number
}

export function RightPanel({
  prompt,
  allPrompts,
  agents,
  agentsEnabled = false,
  playbooksEnabled = false,
  values,
  activeTab,
  activeVariableKey,
  isEditMode = false,
  runsEnabled = false,
  onActiveVariableChange,
  onValueChange,
  onNotesChange,
  onRestoreVersion,
  onTabChange,
  onClose,
  onEditPrompt,
  onDeletePrompt,
  onVariableUpdate,
  onVariableMove,
  onDefaultLaunchersChange,
  onDefaultAgentChange,
  onSelectVariant,
  onNewVariant,
  width = 300,
}: RightPanelProps) {
  const [isAddingNote, setIsAddingNote] = useState(false)

  return (
    <div
      className="flex h-full flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      style={{ width: `${width}px`, minWidth: '200px', maxWidth: '600px' }}
    >
      <RightPanelHeader
        activeTab={activeTab}
        isEditMode={isEditMode}
        promptId={prompt?.id}
        onTabChange={onTabChange}
        onClose={onClose}
        onAddNote={() => setIsAddingNote(true)}
        runsEnabled={runsEnabled}
      />
      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' && (
          <PreviewTab
            prompt={prompt}
            allPrompts={allPrompts}
            values={values}
            activeVariableKey={activeVariableKey}
            onActiveVariableChange={onActiveVariableChange}
            onSelectVariant={onSelectVariant}
            onNewVariant={onNewVariant}
          />
        )}
        {activeTab === 'history' && <HistoryTab prompt={prompt} onRestore={onRestoreVersion} />}
        {activeTab === 'notes' && (
          <NotesTab
            prompt={prompt}
            onNotesChange={onNotesChange}
            isAddingNote={isAddingNote}
            onAddingNoteChange={setIsAddingNote}
          />
        )}
        {activeTab === 'config' && (
          <ConfigTab
            prompt={prompt}
            agents={agents}
            agentsEnabled={agentsEnabled}
            playbooksEnabled={playbooksEnabled}
            runsEnabled={runsEnabled}
            onEditPrompt={onEditPrompt}
            onDeletePrompt={onDeletePrompt}
            onDefaultLaunchersChange={onDefaultLaunchersChange}
            onDefaultAgentChange={onDefaultAgentChange}
          />
        )}
        {activeTab === 'instructions' && (
          <InstructionsTab
            prompt={prompt}
            values={values}
            activeVariableKey={activeVariableKey}
            isEditMode={isEditMode}
            onValueChange={onValueChange}
            onActiveVariableChange={onActiveVariableChange}
            onVariableUpdate={onVariableUpdate}
            onVariableMove={onVariableMove}
          />
        )}
        {activeTab === 'runs' && runsEnabled && prompt && <RunsTab prompt={prompt} />}
        {activeTab === 'settings' && prompt && <PromptSettingsTab prompt={prompt} />}
      </div>
    </div>
  )
}
