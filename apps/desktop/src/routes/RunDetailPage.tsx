import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, useSearch } from '@tanstack/react-router'
import type { PromptRun } from '@/types/run'
import type { PromptFile } from '@/types/prompt'
import {
  getPromptRun,
  getRunVariables,
  saveRunVariables,
  updatePromptRunStatus,
} from '@/lib/store'
import { loadPrompts } from '@/lib/prompts'
import { useAppContext } from '@/context/AppContext'
import { interpolate } from '@/lib/interpolate'
import { getStatusIcon, getLauncherIcon } from '@/lib/run-icons'
import { formatRelativeTime, formatDuration } from '@/lib/run-history'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { VariableInputCard } from '@/components/VariableInputCard'
import {
  ArrowLeft,
  Play,
  Copy,
  Check,
  Clock,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

export function RunDetailPage() {
  const { t } = useTranslation(['common', 'runMode', 'prompts'])
  const { runId } = useParams({ from: '/runs/$runId' })
  const { variable: urlVariable } = useSearch({ from: '/runs/$runId' })
  const navigate = useNavigate()
  const { folderPath } = useAppContext()

  const [run, setRun] = useState<PromptRun | null>(null)
  const [prompt, setPrompt] = useState<PromptFile | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, unknown>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)
  const [copied, setCopied] = useState(false)
  // Sync active variable with URL for deep linking
  const activeVariableKey = urlVariable ?? null

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

  // Derive status booleans for cleaner conditionals (rerender-derived-state)
  const isPending = run?.status === 'pending'
  const isCompleted = run?.status === 'completed'

  // Memoize interpolated content to avoid expensive recomputation
  const interpolatedContent = useMemo(() => {
    if (!prompt) return run?.promptName ?? ''
    return interpolate(prompt.template, variableValues, prompt.variables)
  }, [prompt, variableValues, run?.promptName])

  const handleValueChange = useCallback((key: string, value: unknown) => {
    setVariableValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Sync active variable to URL for shareable deep links
  const setActiveVariable = useCallback((key: string | null) => {
    navigate({
      to: '/runs/$runId',
      params: { runId },
      search: { variable: key ?? undefined },
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

      // Copy interpolated content (use memoized value)
      await navigator.clipboard.writeText(interpolatedContent)

      // Mark run as completed
      await updatePromptRunStatus(run.id, 'completed')

      // Update local state
      setRun((prev) => prev ? { ...prev, status: 'completed', completedAt: new Date().toISOString() } : null)

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
    if (!prompt) return
    // Use memoized interpolated content
    await navigator.clipboard.writeText(interpolatedContent)
    toast.success(t('prompts:centerPane.copied'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [prompt, interpolatedContent, t])

  const handleBack = useCallback(() => {
    navigate({ to: '/runs' })
  }, [navigate])

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
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('common:actions.back')}
        </Button>
      </div>
    )
  }

  return (
    <main className="flex h-full flex-1 flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack} aria-label={t('common:actions.back')}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="flex items-center gap-2">
            {getStatusIcon(run.status)}
            <div className="flex flex-col">
              <h1 className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" aria-hidden="true" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {run.promptName}
                </span>
              </h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  {getLauncherIcon(run.launcherId)}
                  <span className="capitalize">{run.launcherId.replace('_', ' ')}</span>
                </span>
                <span>{formatRelativeTime(run.startedAt)}</span>
                {run.executionTimeMs && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {formatDuration(run.executionTimeMs)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <nav className="flex items-center gap-2" aria-label="Run actions">
          {isPending && (
            <Button
              onClick={handleExecute}
              disabled={!isFormValid || isExecuting}
            >
              {isExecuting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {t('runMode:execute', 'Execute & Copy')}
            </Button>
          )}
          {isCompleted && (
            <Button variant="outline" onClick={handleCopyOutput}>
              {copied ? (
                <Check className="mr-2 h-4 w-4 text-green-500" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {t('prompts:centerPane.copyPrompt')}
            </Button>
          )}
        </nav>
      </header>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main area - Template preview */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              <h2 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                {isPending ? t('runMode:preview', 'Preview') : t('runMode:output', 'Output')}
              </h2>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200">
                  {interpolatedContent}
                </pre>
              </div>

              {run.errorMessage && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-900/20">
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
          </ScrollArea>
        </div>

        {/* Right panel - Variables */}
        <aside className="w-80 shrink-0 border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" aria-label={t('prompts:variables.title')}>
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h2 className="font-medium text-gray-900 dark:text-gray-100">
              {t('prompts:variables.title')}
            </h2>
            {prompt && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {prompt.variables.filter((v) => v.required).length} {t('prompts:variables.required').toLowerCase()},{' '}
                {prompt.variables.filter((v) => !v.required).length} {t('prompts:variables.optional').toLowerCase()}
              </p>
            )}
          </div>
          <ScrollArea className="h-[calc(100%-60px)]">
            <div className="space-y-3 p-4">
              {prompt?.variables.map((variable) => (
                <VariableInputCard
                  key={variable.key}
                  variable={variable}
                  value={variableValues[variable.key]}
                  isActive={activeVariableKey === variable.key}
                  onValueChange={isPending ? (value) => handleValueChange(variable.key, value) : () => {}}
                  onActiveChange={isPending ? (active) => setActiveVariable(active ? variable.key : null) : () => {}}
                />
              ))}
              {!prompt?.variables.length && (
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
          </ScrollArea>
        </aside>
      </div>
    </main>
  )
}
