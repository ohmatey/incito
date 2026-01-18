import { useState } from 'react'
import type { PromptFile, Note, Variable } from '@/types/prompt'
import type { RightPanelTab } from './PromptHeader'
import { RightPanelHeader } from './right-panel/RightPanelHeader'
import { PreviewTab } from './right-panel/PreviewTab'
import { HistoryTab } from './right-panel/HistoryTab'
import { NotesTab } from './right-panel/NotesTab'
import { ConfigTab } from './right-panel/ConfigTab'
import { InstructionsTab } from './right-panel/InstructionsTab'

interface RightPanelProps {
  prompt: PromptFile | null
  values: Record<string, unknown>
  activeTab: RightPanelTab
  activeVariableKey: string | null
  isEditMode?: boolean
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
}

export function RightPanel({
  prompt,
  values,
  activeTab,
  activeVariableKey,
  isEditMode = false,
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
}: RightPanelProps) {
  const [isAddingNote, setIsAddingNote] = useState(false)

  return (
    <div className="flex h-full w-[300px] flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <RightPanelHeader
        activeTab={activeTab}
        onTabChange={onTabChange}
        onClose={onClose}
        onAddNote={() => setIsAddingNote(true)}
      />
      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' && (
          <PreviewTab
            prompt={prompt}
            values={values}
            activeVariableKey={activeVariableKey}
            onActiveVariableChange={onActiveVariableChange}
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
            onEditPrompt={onEditPrompt}
            onDeletePrompt={onDeletePrompt}
            onDefaultLaunchersChange={onDefaultLaunchersChange}
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
      </div>
    </div>
  )
}
