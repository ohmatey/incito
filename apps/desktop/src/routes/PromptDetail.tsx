import { useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useAppContext } from '@/context/AppContext'
import { PromptHeader } from '@/components/PromptHeader'
import { CenterPane } from '@/components/CenterPane'
import { RightPanel } from '@/components/RightPanel'
import { ResizeHandle } from '@/components/ui/resize-handle'
import { PromptEditorDialog } from '@/components/PromptEditorDialog'

export function PromptDetail() {
  const { promptId } = useParams({ from: '/prompts/$promptId' })
  const navigate = useNavigate()
  const {
    promptManager,
    tagManager,
    editState,
    rightPanelTab,
    setRightPanelTab,
    rightPanelOpen,
    setRightPanelOpen,
    panelWidths,
    handleRightPanelResize,
    handlePanelResizeEnd,
    handleEditModeChange,
    handleSave,
    handleCancel,
    handleCreateTag,
    handleVariableUpdate,
    handleVariableMove,
    handleLocalTemplateChange,
    handleNotesChange,
    handleDefaultLaunchersChange,
    handleRestoreVersion,
    handleEnterEditMode,
    handleDeletePrompt,
    handlePromptCompleted,
    handleSelectPrompt,
    handleCreateVariant,
    variantEditorOpen,
    setVariantEditorOpen,
    handleOpenVariantEditor,
    handleSelectVariant,
    refreshDrafts,
    pinnedPromptIds,
  } = useAppContext()

  // Get selected prompt from URL param
  const selectedPrompt = promptManager.prompts.find((p) => p.id === promptId) || null

  // Handler for resetting form - also clears the draft
  async function handleResetForm() {
    editState.resetVariableValues()
    await editState.clearDraft()
    await refreshDrafts()
  }

  // Handler for selecting a variant - stores memory and navigates to the variant's URL
  function handleVariantSelect(prompt: import('@/types/prompt').PromptFile) {
    handleSelectVariant(prompt) // Store variant memory in context
    navigate({ to: '/prompts/$promptId', params: { promptId: prompt.id } })
  }

  // Redirect to prompts list if prompt not found
  useEffect(() => {
    if (!selectedPrompt) {
      navigate({ to: '/prompts' })
    }
  }, [selectedPrompt, navigate])

  if (!selectedPrompt) {
    return null
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Center Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <PromptHeader
          prompt={selectedPrompt}
          isEditMode={editState.isEditMode}
          rightPanelOpen={rightPanelOpen}
          hasUnsavedChanges={editState.hasUnsavedChanges}
          nameError={editState.nameError}
          onEditModeChange={handleEditModeChange}
          onRightPanelOpenChange={setRightPanelOpen}
          onTabChange={setRightPanelTab}
          onSave={handleSave}
          onCancel={handleCancel}
        />

        <CenterPane
          prompt={selectedPrompt}
          prompts={promptManager.prompts}
          pinnedPromptIds={pinnedPromptIds}
          values={editState.variableValues}
          isEditMode={editState.isEditMode}
          localName={editState.localName}
          localDescription={editState.localDescription}
          localTemplate={editState.localTemplate}
          localTags={editState.localTags}
          nameError={editState.nameError}
          tags={tagManager.tags}
          activeVariableKey={editState.activeVariableKey}
          onValueChange={editState.handleValueChange}
          onActiveVariableChange={editState.setActiveVariableKey}
          onLocalNameChange={editState.setLocalName}
          onLocalDescriptionChange={editState.setLocalDescription}
          onLocalTemplateChange={handleLocalTemplateChange}
          onLocalTagsChange={editState.setLocalTags}
          onCreateTag={handleCreateTag}
          onSelectPrompt={handleSelectPrompt}
          onPromptCompleted={handlePromptCompleted}
          onResetForm={handleResetForm}
          onRefineWithAI={async (template, instruction) => {
            const { refinePromptTemplate } = await import('@/lib/mastra-client')
            const result = await refinePromptTemplate(template, instruction)
            if (!result.ok) throw new Error(result.error)
            return result.data
          }}
        />
      </div>

      {/* Right Panel */}
      {rightPanelOpen && (
        <>
          <ResizeHandle
            side="right"
            onResize={handleRightPanelResize}
            onResizeEnd={handlePanelResizeEnd}
          />
          <RightPanel
            prompt={selectedPrompt}
            allPrompts={promptManager.prompts}
            values={editState.variableValues}
            activeTab={rightPanelTab}
            activeVariableKey={editState.activeVariableKey}
            isEditMode={editState.isEditMode}
            onActiveVariableChange={editState.setActiveVariableKey}
            onValueChange={editState.handleValueChange}
            onNotesChange={handleNotesChange}
            onRestoreVersion={handleRestoreVersion}
            onTabChange={setRightPanelTab}
            onClose={() => setRightPanelOpen(false)}
            onEditPrompt={handleEnterEditMode}
            onDeletePrompt={() => handleDeletePrompt(selectedPrompt)}
            onVariableUpdate={handleVariableUpdate}
            onVariableMove={handleVariableMove}
            onDefaultLaunchersChange={handleDefaultLaunchersChange}
            onSelectVariant={handleVariantSelect}
            onNewVariant={handleOpenVariantEditor}
            width={panelWidths.rightPanel}
          />
        </>
      )}

      {/* Variant Editor Dialog */}
      <PromptEditorDialog
        open={variantEditorOpen}
        onOpenChange={setVariantEditorOpen}
        prompt={selectedPrompt}
        mode="new-variant"
        onSave={() => {}}
        onSaveAsVariant={(template, variantLabel) => {
          handleCreateVariant(variantLabel, template)
          setVariantEditorOpen(false)
        }}
        onRefineWithAI={async (template, instruction) => {
          const { refinePromptTemplate } = await import('@/lib/mastra-client')
          const result = await refinePromptTemplate(template, instruction)
          if (!result.ok) throw new Error(result.error)
          return result.data
        }}
      />
    </div>
  )
}
