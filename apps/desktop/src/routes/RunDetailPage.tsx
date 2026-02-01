import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, useSearch } from '@tanstack/react-router'
import type { PromptRun } from '@/types/run'
import type { PromptFile, Variable, Tag } from '@/types/prompt'
import {
  getPromptRun,
  getRunVariables,
  saveRunVariables,
  updatePromptRunStatus,
  hasAIConfigured,
} from '@/lib/store'
import { loadPrompts } from '@/lib/prompts'
import { fillFormFieldsWithContext } from '@/lib/mastra-client'
import { useAppContext } from '@/context/AppContext'
import { useLayout } from '@/context/LayoutContext'
import { useFeatureFlags } from '@/context/FeatureFlagsContext'
import { interpolate } from '@/lib/interpolate'
import { formatRelativeTime } from '@/lib/run-history'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ResizeHandle } from '@/components/ui/resize-handle'
import { EmptyState } from '@/components/ui/empty-state'
import { VariableInputCard } from '@/components/VariableInputCard'
import { AiFillFieldModal } from '@/components/AiFillFieldModal'
import { TagBadge } from '@/components/TagBadge'
import {
  Play,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  FileText,
  Sparkles,
  ChevronDown,
  X,
  PanelLeft,
  PanelLeftClose,
  RotateCcw,
  Undo2,
  Redo2,
  MessageSquare,
  Settings,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { FeedbackTab } from '@/components/feedback'
import { RunConfigEditor } from '@/components/run-mode/RunConfigEditor'

type RunPanelTab = 'prompt' | 'output' | 'feedback' | 'config'

export function RunDetailPage() {
  const { t } = useTranslation(['common', 'runMode', 'prompts'])
  const { runId } = useParams({ from: '/runs/$runId' })
  const { variable: urlVariable, collapsed: shouldCollapse, tab: initialTab } = useSearch({ from: '/runs/$runId' })
  const navigate = useNavigate()
  const { folderPath, tagManager } = useAppContext()
  const {
    panelWidths,
    handleRightPanelResize,
    handlePanelResizeEnd,
    listPanelCollapsed,
    toggleListPanelCollapsed,
  } = useLayout()
  const { featureFlags } = useFeatureFlags()

  const [run, setRun] = useState<PromptRun | null>(null)
  const [prompt, setPrompt] = useState<PromptFile | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, unknown>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [aiConfigured, setAiConfigured] = useState(false)
  const [aiFillModalOpen, setAiFillModalOpen] = useState(false)
  const [aiFillTargetVariable, setAiFillTargetVariable] = useState<Variable | null>(null)
  const [rightPanelTab, setRightPanelTab] = useState<RunPanelTab>(
    initialTab === 'output' || initialTab === 'feedback' ? initialTab : 'prompt'
  )
  const [rightPanelOpen, setRightPanelOpen] = useState(true)

  // Undo/Redo state management
  const [history, setHistory] = useState<Record<string, unknown>[]>([{}])
  const [historyIndex, setHistoryIndex] = useState(0)
  const isUndoRedoAction = useRef(false)

  // Fill with AI state
  const [showFillAiPanel, setShowFillAiPanel] = useState(false)
  const [fillContext, setFillContext] = useState('')
  const [isFilling, setIsFilling] = useState(false)

  // Sync active variable with URL for deep linking
  const activeVariableKey = urlVariable ?? null

  // Apply navigation params (from prompt toolbar run button) and clean up URL
  useEffect(() => {
    if (shouldCollapse || initialTab) {
      if (shouldCollapse && !listPanelCollapsed) {
        toggleListPanelCollapsed()
      }
      // Clean up the URL params after applying
      navigate({
        to: '/runs/$runId',
        params: { runId },
        search: { variable: urlVariable ?? undefined, collapsed: false, tab: undefined },
        replace: true,
      })
    }
  }, [shouldCollapse, initialTab, listPanelCollapsed, toggleListPanelCollapsed, navigate, runId, urlVariable])

  // Load AI configuration status
  useEffect(() => {
    async function checkAI() {
      const result = await hasAIConfigured()
      if (result.ok) {
        setAiConfigured(result.data)
      }
    }
    checkAI()
  }, [])

  // Load run data - use Promise.all for parallel fetching (async-parallel)
  useEffect(() => {
    async function loadRunData() {
      setIsLoading(true)
      try {
        // Fetch run, variables, and prompts in parallel (async-parallel optimization)
        const [runResult, varsResult, prompts] = await Promise.all([
          getPromptRun(runId),
          getRunVariables(runId),
          folderPath ? loadPrompts(folderPath) : Promise.resolve([]),
        ])

        if (!runResult.ok || !runResult.data) {
          toast.error(t('common:errors.notFound'))
          navigate({ to: '/runs' })
          return
        }
        setRun(runResult.data)

        // If run is completed, show output tab by default
        if (runResult.data.status === 'completed') {
          setRightPanelTab('output')
        }

        // Process saved variables
        let savedVars: { variableKey: string; variableValue: string }[] = []
        if (varsResult.ok) {
          savedVars = varsResult.data
          // Convert to values map
          const valuesMap: Record<string, unknown> = {}
          for (const v of varsResult.data) {
            try {
              // Try to parse JSON for complex values
              valuesMap[v.variableKey] = JSON.parse(v.variableValue)
            } catch {
              // Use as string if not JSON
              valuesMap[v.variableKey] = v.variableValue
            }
          }
          setVariableValues(valuesMap)
        }

        // Find and set the prompt
        const foundPrompt = prompts.find((p) => p.id === runResult.data!.promptId)
        if (foundPrompt) {
          setPrompt(foundPrompt)
          // Initialize values with defaults if pending and no saved values
          if (runResult.data.status === 'pending' && savedVars.length === 0) {
            const defaults: Record<string, unknown> = {}
            for (const v of foundPrompt.variables) {
              if (v.default !== undefined) {
                defaults[v.key] = v.default
              }
            }
            setVariableValues(defaults)
          }
        }
      } catch (err) {
        console.error('Failed to load run:', err)
        toast.error(t('common:errors.loadFailed'))
      } finally {
        setIsLoading(false)
      }
    }
    loadRunData()
  }, [runId, folderPath, navigate, t])

  // Memoize form validation to avoid recomputation on unrelated re-renders
  const isFormValid = useMemo(() => {
    if (!prompt) return false
    return prompt.variables
      .filter((v) => v.required)
      .every((v) => {
        const value = variableValues[v.key]
        if (value === undefined || value === null || value === '') return false
        if (Array.isArray(value) && value.length === 0) return false
        return true
      })
  }, [prompt, variableValues])

  // Get tag objects for display
  const promptTags = useMemo(() => {
    if (!prompt?.tags) return []
    return prompt.tags
      .map((name) => tagManager.tags.find((t) => t.name === name))
      .filter((t): t is Tag => t !== undefined)
  }, [prompt?.tags, tagManager.tags])

  // Reset form to defaults
  const handleResetForm = useCallback(() => {
    if (!prompt) return
    const defaults: Record<string, unknown> = {}
    for (const v of prompt.variables) {
      if (v.default !== undefined) {
        defaults[v.key] = v.default
      }
    }
    setVariableValues(defaults)
    // Add to history
    setHistory(prev => [...prev.slice(0, historyIndex + 1), defaults])
    setHistoryIndex(prev => prev + 1)
  }, [prompt, historyIndex])

  // Undo/Redo handlers
  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const handleUndo = useCallback(() => {
    if (!canUndo) return
    isUndoRedoAction.current = true
    const newIndex = historyIndex - 1
    setHistoryIndex(newIndex)
    setVariableValues(history[newIndex])
  }, [canUndo, historyIndex, history])

  const handleRedo = useCallback(() => {
    if (!canRedo) return
    isUndoRedoAction.current = true
    const newIndex = historyIndex + 1
    setHistoryIndex(newIndex)
    setVariableValues(history[newIndex])
  }, [canRedo, historyIndex, history])

  // Fill with AI handler
  const handleFillWithAI = useCallback(async () => {
    if (!prompt || !fillContext.trim()) return

    setIsFilling(true)
    try {
      const result = await fillFormFieldsWithContext(fillContext, prompt.variables)
      if (!result.ok) {
        throw new Error(result.error)
      }

      setShowFillAiPanel(false)
      setFillContext('')

      if (result.data.filledCount === 0) {
        toast.info(t('prompts:centerPane.noMatchingInfo'), {
          description: t('prompts:centerPane.addMoreDetails'),
        })
      } else {
        // Apply filled values
        const newValues = { ...variableValues, ...result.data.fields }
        setVariableValues(newValues)
        // Add to history
        setHistory(prev => [...prev.slice(0, historyIndex + 1), newValues])
        setHistoryIndex(prev => prev + 1)
        toast.success(t('prompts:centerPane.filledFields', { filled: result.data.filledCount, total: result.data.totalCount }))
      }
    } catch (error) {
      console.error('Failed to fill fields:', error)
      const errorMessage = error instanceof Error ? error.message : t('prompts:centerPane.fillFailed')
      toast.error(errorMessage)
    } finally {
      setIsFilling(false)
    }
  }, [prompt, fillContext, variableValues, historyIndex, t])

  // Derive status booleans for cleaner conditionals (rerender-derived-state)
  const isPending = run?.status === 'pending'
  const isCompleted = run?.status === 'completed'

  // Memoize interpolated content to avoid expensive recomputation
  const interpolatedContent = useMemo(() => {
    if (!prompt) return run?.promptName ?? ''
    return interpolate(prompt.template, variableValues, prompt.variables)
  }, [prompt, variableValues, run?.promptName])

  const handleValueChange = useCallback((key: string, value: unknown) => {
    // Skip history update for undo/redo actions
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false
      return
    }
    setVariableValues((prev) => {
      const newValues = { ...prev, [key]: value }
      // Add to history
      setHistory(h => [...h.slice(0, historyIndex + 1), newValues])
      setHistoryIndex(i => i + 1)
      return newValues
    })
  }, [historyIndex])

  // Sync active variable to URL for shareable deep links
  const setActiveVariable = useCallback((key: string | null) => {
    navigate({
      to: '/runs/$runId',
      params: { runId },
      search: { variable: key ?? undefined, collapsed: false, tab: undefined },
      replace: true,
    })
  }, [navigate, runId])

  const handleExecute = useCallback(async () => {
    if (!run || !prompt) return

    setIsExecuting(true)
    try {
      // Save variables to the run
      const varsToSave = prompt.variables.map((v) => ({
        key: v.key,
        value: variableValues[v.key],
        type: v.type,
      }))
      await saveRunVariables(run.id, varsToSave)

      // Copy the interpolated output
      await navigator.clipboard.writeText(interpolatedContent)

      // Mark run as completed
      await updatePromptRunStatus(run.id, 'completed')

      // Update local state
      setRun((prev) => prev ? { ...prev, status: 'completed', completedAt: new Date().toISOString() } : null)

      // Switch to output tab to show results
      setRightPanelTab('output')

      toast.success(t('prompts:centerPane.copied'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to execute run:', err)
      await updatePromptRunStatus(run.id, 'error', (err as Error).message)
      toast.error(t('common:errors.executionFailed'))
    } finally {
      setIsExecuting(false)
    }
  }, [run, prompt, variableValues, interpolatedContent, t])

  const handleCopyOutput = useCallback(async () => {
    await navigator.clipboard.writeText(interpolatedContent)
    toast.success(t('prompts:centerPane.copied'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [interpolatedContent, t])

  // Tab configuration
  const tabConfig = {
    prompt: {
      icon: <FileText className="h-4 w-4" aria-hidden="true" />,
      label: t('runMode:tabs.prompt', 'Prompt'),
    },
    output: {
      icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
      label: t('runMode:tabs.output', 'Output'),
    },
    feedback: {
      icon: <MessageSquare className="h-4 w-4" aria-hidden="true" />,
      label: t('common:tabs.feedback', 'Feedback'),
    },
    config: {
      icon: <Settings className="h-4 w-4" aria-hidden="true" />,
      label: t('runMode:tabs.config', 'Config'),
    },
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-gray-100 dark:bg-gray-900" role="status" aria-label={t('common:labels.loading')}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400 motion-reduce:animate-none" />
      </div>
    )
  }

  if (!run) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 bg-gray-100 px-4 text-center dark:bg-gray-900" role="alert">
        <AlertCircle className="h-12 w-12 text-gray-300 dark:text-gray-600" aria-hidden="true" />
        <h1 className="text-lg font-medium text-gray-700 dark:text-gray-300">
          {t('common:errors.notFound')}
        </h1>
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Center Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
          {/* Left side - Collapse button and Title */}
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleListPanelCollapsed}
              className="h-8 w-8"
              aria-label={listPanelCollapsed ? t('common:header.expandSidebar') : t('common:header.collapseSidebar')}
            >
              {listPanelCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
            <div className="flex flex-col min-w-0">
              <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">
                {run.promptName}
              </h1>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatRelativeTime(run.startedAt)}
              </span>
            </div>
          </div>

          {/* Right side - Controls */}
          <nav className="flex items-center gap-2" aria-label="Run actions">
            {isPending && (
              rightPanelOpen ? (
                <Button
                  size="icon"
                  onClick={handleExecute}
                  disabled={!isFormValid || isExecuting}
                  aria-label={t('runMode:execute', 'Run Prompt')}
                >
                  {isExecuting ? (
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleExecute}
                  disabled={!isFormValid || isExecuting}
                >
                  {isExecuting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  {t('runMode:execute', 'Run Prompt')}
                </Button>
              )
            )}
            {isCompleted && (
              rightPanelOpen ? (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyOutput}
                  aria-label={t('prompts:centerPane.copyPrompt')}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <Button variant="outline" onClick={handleCopyOutput}>
                  {copied ? (
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {t('prompts:centerPane.copyPrompt')}
                </Button>
              )
            )}

            {/* Panel toggle when closed */}
            {!rightPanelOpen && (
              <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md">
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-l-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setRightPanelOpen(true)}
                  aria-label={t('runMode:openPanel', { tab: tabConfig[rightPanelTab].label })}
                >
                  {tabConfig[rightPanelTab].icon}
                  <span>{tabConfig[rightPanelTab].label}</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-center h-8 w-6 border-l border-gray-200 dark:border-gray-700 text-gray-500 rounded-r-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label={t('runMode:switchTab', 'Switch tab')}
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(Object.keys(tabConfig) as RunPanelTab[])
                      .filter((tab) => tab !== rightPanelTab)
                      .map((tab) => (
                        <DropdownMenuItem
                          key={tab}
                          onClick={() => {
                            setRightPanelTab(tab)
                            setRightPanelOpen(true)
                          }}
                          className="gap-2 cursor-pointer"
                        >
                          {tabConfig[tab].icon}
                          {tabConfig[tab].label}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </nav>
        </header>

        {/* Main form area */}
        <div className="flex flex-1 flex-col overflow-hidden bg-gray-100 dark:bg-gray-900">
          <ScrollArea className="min-h-0 flex-1 overflow-auto">
            <div className="p-6">
              <div className="mx-auto max-w-2xl space-y-4">
                {/* Description */}
                {prompt?.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {prompt.description}
                  </p>
                )}

                {/* Tags */}
                {promptTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {promptTags.map((tag) => (
                      <TagBadge key={tag.id} tag={tag} />
                    ))}
                  </div>
                )}

                {/* Variable inputs */}
                <div className="space-y-3 pt-2">
                  {/* Form actions - Fill with AI, Undo, Redo, Reset */}
                  {prompt && prompt.variables.length > 0 && isPending && (
                    <div className="flex justify-end gap-1">
                      {aiConfigured && !showFillAiPanel && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowFillAiPanel(true)}
                          className="gap-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          title={t('prompts:centerPane.fillWithAI')}
                        >
                          <Sparkles className="h-4 w-4" />
                          {t('prompts:centerPane.fillWithAI')}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleUndo}
                        disabled={!canUndo}
                        className="gap-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                        title={t('prompts:centerPane.undo')}
                      >
                        <Undo2 className="h-4 w-4" />
                        {t('prompts:centerPane.undo')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRedo}
                        disabled={!canRedo}
                        className="gap-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                        title={t('prompts:centerPane.redo')}
                      >
                        <Redo2 className="h-4 w-4" />
                        {t('prompts:centerPane.redo')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetForm}
                        className="gap-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        title={t('prompts:centerPane.reset')}
                      >
                        <RotateCcw className="h-4 w-4" />
                        {t('prompts:centerPane.reset')}
                      </Button>
                    </div>
                  )}

                  {/* Fill with AI Panel */}
                  {aiConfigured && showFillAiPanel && isPending && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t('prompts:centerPane.fillWithAI')}
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setShowFillAiPanel(false)}
                        >
                          {t('prompts:centerPane.hide')}
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        {t('prompts:centerPane.fillWithAIDescription')}
                      </p>
                      <Textarea
                        name="fill-context"
                        value={fillContext}
                        onChange={(e) => setFillContext(e.target.value)}
                        className="min-h-[120px] text-sm resize-none border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-900"
                        placeholder={t('prompts:centerPane.fillContextPlaceholder')}
                      />
                      <p className="mt-2 font-mono text-[10px] text-gray-400 dark:text-gray-500">
                        {t('prompts:centerPane.aiDisclaimer')}
                      </p>
                      <Button
                        onClick={handleFillWithAI}
                        disabled={isFilling || !fillContext.trim()}
                        className="mt-3 gap-2"
                        size="sm"
                      >
                        {isFilling ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {isFilling ? t('prompts:centerPane.filling') : t('prompts:centerPane.fillFields')}
                      </Button>
                    </div>
                  )}

                  {prompt && prompt.variables.length > 0 ? (
                    prompt.variables.map((variable) => (
                      <VariableInputCard
                        key={variable.key}
                        variable={variable}
                        value={variableValues[variable.key]}
                        isActive={activeVariableKey === variable.key}
                        onValueChange={isPending ? (value) => handleValueChange(variable.key, value) : () => {}}
                        onActiveChange={isPending ? (active) => setActiveVariable(active ? variable.key : null) : () => {}}
                        aiConfigured={aiConfigured && isPending}
                        onAiFillClick={isPending ? () => {
                          setAiFillTargetVariable(variable)
                          setAiFillModalOpen(true)
                        } : undefined}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <Check className="h-8 w-8 text-green-500" aria-hidden="true" />
                      <p className="font-medium text-gray-700 dark:text-gray-300">
                        {t('runMode:noVariablesTitle')}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('runMode:noVariablesDescription')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Error message */}
                {run.errorMessage && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-900/20">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <AlertCircle className="h-4 w-4" aria-hidden="true" />
                      <span className="font-medium">{t('common:labels.error')}</span>
                    </div>
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {run.errorMessage}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Right Panel */}
      {rightPanelOpen && (
        <>
          <ResizeHandle
            side="right"
            onResize={handleRightPanelResize}
            onResizeEnd={handlePanelResizeEnd}
          />
          <aside
            className="flex flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
            style={{ width: `${panelWidths.rightPanel}px`, minWidth: '200px', maxWidth: '600px' }}
          >
            {/* Panel Header with Tabs */}
            <div className="flex h-14 items-center justify-between border-b border-gray-200 px-3 dark:border-gray-700">
              {/* Tab Dropdown */}
              <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-l-md">
                  {tabConfig[rightPanelTab].icon}
                  <span>{tabConfig[rightPanelTab].label}</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-center h-8 w-6 border-l border-gray-200 dark:border-gray-700 text-gray-500 rounded-r-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label={t('runMode:switchTab', 'Switch tab')}
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(Object.keys(tabConfig) as RunPanelTab[])
                      .filter((tab) => tab !== rightPanelTab)
                      .map((tab) => (
                        <DropdownMenuItem
                          key={tab}
                          onClick={() => setRightPanelTab(tab)}
                          className="gap-2 cursor-pointer"
                        >
                          {tabConfig[tab].icon}
                          {tabConfig[tab].label}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRightPanelOpen(false)}
                className="h-8 w-8"
                aria-label={t('common:buttons.closePanel', 'Close panel')}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {/* Panel Content */}
            <ScrollArea className="flex-1">
              {rightPanelTab === 'prompt' && (
                <div className="p-4">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200">
                    {prompt?.template || ''}
                  </pre>
                </div>
              )}

              {rightPanelTab === 'output' && (
                isPending ? (
                  <EmptyState
                    icon={Sparkles}
                    title={t('runMode:outputEmpty.title', 'No output yet')}
                    description={t('runMode:outputEmpty.description', 'Fill in the variables and run the prompt to see the output.')}
                    action={{
                      label: t('runMode:execute', 'Run Prompt'),
                      onClick: handleExecute,
                      icon: Play,
                    }}
                    variant="inline"
                  />
                ) : (
                  <div className="p-4">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200">
                      {interpolatedContent}
                    </pre>
                  </div>
                )
              )}

              {rightPanelTab === 'feedback' && run && prompt && (
                <FeedbackTab
                  runId={run.id}
                  promptPath={prompt.path}
                  interpolatedPrompt={interpolatedContent}
                  playbooksEnabled={featureFlags.playbooksEnabled && featureFlags.runsEnabled}
                />
              )}

              {rightPanelTab === 'config' && prompt && (
                <RunConfigEditor prompt={prompt} />
              )}
            </ScrollArea>
          </aside>
        </>
      )}

      {/* AI Fill Field Modal */}
      {prompt && (
        <AiFillFieldModal
          open={aiFillModalOpen}
          onOpenChange={setAiFillModalOpen}
          variable={aiFillTargetVariable}
          otherVariables={prompt.variables.filter(v => v.key !== aiFillTargetVariable?.key)}
          currentValues={variableValues}
          onGenerate={(value) => {
            if (aiFillTargetVariable) {
              handleValueChange(aiFillTargetVariable.key, value)
            }
          }}
        />
      )}
    </div>
  )
}
