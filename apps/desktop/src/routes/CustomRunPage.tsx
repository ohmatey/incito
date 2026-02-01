import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useAppContext } from '@/context/AppContext'
import { useCustomRunState } from '@/hooks/useCustomRunState'
import { ModeSelector } from '@/components/custom-run/ModeSelector'
import { CustomRunConfigPanel } from '@/components/custom-run/CustomRunConfigPanel'
import { ExecutionPanel } from '@/components/custom-run/ExecutionPanel'
import { SavePromptDialog } from '@/components/custom-run/SavePromptDialog'
import { Button } from '@/components/ui/button'
import { ResizeHandle } from '@/components/ui/resize-handle'
import { ArrowLeft, Save } from 'lucide-react'
import type { PromptFile } from '@/types/prompt'

export function CustomRunPage() {
  const { t } = useTranslation(['customRun', 'common'])
  const navigate = useNavigate()
  const search = useSearch({ from: '/runs/new' })
  const { promptManager, agentManager } = useAppContext()

  // Get base prompt if provided via URL param
  const basePromptId = search.base
  const basePrompt = basePromptId
    ? promptManager.prompts.find((p) => p.id === basePromptId)
    : undefined

  // State management
  const customRunState = useCustomRunState({
    basePrompt,
    mode: basePrompt ? 'existing' : 'scratch',
  })

  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [configPanelWidth, setConfigPanelWidth] = useState(400)

  // Handle prompt selection in existing mode
  function handleSelectPrompt(prompt: PromptFile) {
    customRunState.initializeFromPrompt(prompt)
  }

  // Handle back navigation
  function handleBack() {
    navigate({ to: '/runs' })
  }

  // Handle save
  function handleSave() {
    setShowSaveDialog(true)
  }

  // Handle config panel resize
  function handleConfigPanelResize(delta: number) {
    setConfigPanelWidth((prev) => Math.max(300, Math.min(600, prev + delta)))
  }

  const { state } = customRunState
  const showModeSelector = !basePromptId && state.mode === 'scratch' && !state.promptTemplate

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8"
            aria-label={t('common:buttons.back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('customRun:title')}
          </h1>
          {state.promptName && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              — {state.promptName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!state.promptTemplate}
            className="gap-1.5"
          >
            <Save className="h-4 w-4" />
            {t('customRun:save.button')}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mode selector or config panel */}
        {showModeSelector ? (
          <div className="flex flex-1 items-center justify-center">
            <ModeSelector
              onSelectMode={(mode) => {
                if (mode === 'scratch') {
                  customRunState.setMode('scratch')
                  // Set a minimal template to start editing
                  customRunState.setPromptName(t('customRun:defaultName'))
                  customRunState.setPromptTemplate('')
                }
              }}
              onSelectPrompt={handleSelectPrompt}
              prompts={promptManager.prompts}
            />
          </div>
        ) : (
          <>
            {/* Left panel - Configuration */}
            <div
              className="flex shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              style={{ width: configPanelWidth }}
            >
              <CustomRunConfigPanel
                state={state}
                agents={agentManager.agents}
                onPromptNameChange={customRunState.setPromptName}
                onPromptDescriptionChange={customRunState.setPromptDescription}
                onPromptTemplateChange={customRunState.setPromptTemplate}
                onVariablesChange={customRunState.setVariables}
                onAgentIdChange={customRunState.setAgentId}
                onSystemPromptChange={customRunState.setSystemPrompt}
                onTemperatureChange={customRunState.setTemperature}
                onMaxTokensChange={customRunState.setMaxTokens}
                onProviderIdChange={customRunState.setDefaultProviderId}
                onGraderIdsChange={customRunState.setGraderIds}
              />
            </div>

            <ResizeHandle
              side="left"
              onResize={handleConfigPanelResize}
            />

            {/* Right panel - Execution */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <ExecutionPanel
                state={state}
                variables={state.variables}
                variableValues={state.variableValues}
                onVariableValueChange={customRunState.setVariableValue}
                onExecute={customRunState.execute}
                onStopExecution={customRunState.stopExecution}
                onClearOutput={customRunState.clearOutput}
              />
            </div>
          </>
        )}
      </div>

      {/* Save dialog */}
      <SavePromptDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        saveConfig={customRunState.getSaveConfig()}
        isFromExisting={state.mode === 'existing'}
        basePromptPath={state.basePromptPath}
        onSaved={(promptId) => {
          navigate({ to: '/prompts/$promptId', params: { promptId } })
        }}
      />
    </div>
  )
}
