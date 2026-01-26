import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useAppContext } from '@/context/AppContext'
import { PromptHeader } from '@/components/PromptHeader'
import { CenterPane } from '@/components/CenterPane'
import { RightPanel } from '@/components/RightPanel'
import { ResizeHandle } from '@/components/ui/resize-handle'
import { PromptEditorDialog } from '@/components/PromptEditorDialog'

export function PromptDetail() {
  const { t } = useTranslation('common')
  const { promptId } = useParams({ from: '/prompts/$promptId' })
  const navigate = useNavigate()
  const {
    isLoading,
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
  // First try the prompts array, then fall back to selectedPrompt (handles race condition after creation)
  // In edit mode, prefer selectedPrompt which has live variable updates
  const promptFromArray = promptManager.prompts.find((p) => p.id === promptId) || null
  const promptFromSelected = promptManager.selectedPrompt?.id === promptId ? promptManager.selectedPrompt : null
  const selectedPrompt = editState.isEditMode
    ? (promptFromSelected || promptFromArray)
    : (promptFromArray || promptFromSelected)

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

  // Redirect to prompts list if prompt not found after a delay
  // The delay allows state to propagate after creating a new prompt
  useEffect(() => {
    if (!selectedPrompt && !isLoading) {
      const timeout = setTimeout(() => {
        navigate({ to: '/prompts' })
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [selectedPrompt, isLoading, navigate])

  // Show loading state while prompt is being found
  // This handles the race condition after creating a new prompt
  if (!selectedPrompt) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('labels.loading')}</p>
      </div>
    )
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
          onUndo={editState.undo}
          onRedo={editState.redo}
          canUndo={editState.canUndo}
          canRedo={editState.canRedo}
          getLastChangeSource={editState.getLastChangeSource}
          onRefineWithAI={async (template, instruction) => {
            const { refinePromptTemplate } = await import('@/lib/mastra-client')
            const result = await refinePromptTemplate(template, instruction)
            if (!result.ok) throw new Error(result.error)
            return result.data
          }}
          onFillWithAI={async (context) => {
            const { fillFormFieldsWithContext } = await import('@/lib/mastra-client')
            const result = await fillFormFieldsWithContext(context, selectedPrompt.variables)
            if (!result.ok) throw new Error(result.error)
            // Apply the filled values using setValuesWithSource with 'ai_fill' source for undo support
            if (Object.keys(result.data.fields).length > 0) {
              editState.setValuesWithSource(result.data.fields, 'ai_fill')
            }
            return {
              filledCount: result.data.filledCount,
              totalCount: result.data.totalCount,
            }
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
