import { useState, useCallback, useRef, useEffect } from 'react'
import type { Variable, PromptFile } from '@/types/prompt'
import type { AIPromptSettings, ProviderRunSettings, EvalConfig } from '@/types/prompt-config'
import type {
  CustomRunState,
  CustomRunMode,
  CustomRunExecutionState,
  CustomRunHistoryEntry,
  SavePromptConfig,
} from '@/types/custom-run'
import { getInitialCustomRunState } from '@/types/custom-run'
import { streamWithProvider } from '@/lib/mastra-client'
import { getProviderConfig, getDefaultProviderConfig } from '@/lib/store'
import { interpolate } from '@/lib/interpolate'
import { extractVariablesFromTemplate } from '@/lib/parser'

interface UseCustomRunStateOptions {
  basePrompt?: PromptFile | null
  mode?: CustomRunMode
}

interface UseCustomRunStateReturn {
  // State
  state: CustomRunState

  // Mode
  setMode: (mode: CustomRunMode) => void

  // Prompt config setters
  setPromptName: (name: string) => void
  setPromptDescription: (description: string) => void
  setPromptTemplate: (template: string) => void
  setVariables: (variables: Variable[]) => void
  addVariable: (variable: Variable) => void
  updateVariable: (key: string, updates: Partial<Variable>) => void
  removeVariable: (key: string) => void

  // AI config setters
  setAiPrompt: (settings: AIPromptSettings) => void
  setAgentId: (agentId: string | null) => void
  setSystemPrompt: (systemPrompt: string) => void
  setTemperature: (temperature: number) => void
  setMaxTokens: (maxTokens: number | undefined) => void

  // Provider config setters
  setProvider: (settings: ProviderRunSettings) => void
  setDefaultProviderId: (providerId: string | undefined) => void

  // Eval config setters
  setEvals: (settings: EvalConfig) => void
  setGraderIds: (graderIds: string[]) => void
  toggleGrader: (graderId: string) => void

  // Variable values
  setVariableValue: (key: string, value: unknown) => void
  setVariableValues: (values: Record<string, unknown>) => void
  clearVariableValues: () => void

  // Execution
  execute: () => Promise<void>
  stopExecution: () => void
  clearOutput: () => void

  // History
  clearHistory: () => void

  // Initialize from base prompt
  initializeFromPrompt: (prompt: PromptFile) => void

  // Get save config
  getSaveConfig: () => SavePromptConfig

  // Reset
  reset: () => void
}

export function useCustomRunState(options: UseCustomRunStateOptions = {}): UseCustomRunStateReturn {
  const { basePrompt, mode: initialMode = 'scratch' } = options

  const [state, setState] = useState<CustomRunState>(() => {
    const initial = getInitialCustomRunState(initialMode)
    if (basePrompt) {
      return {
        ...initial,
        mode: 'existing',
        basePromptId: basePrompt.id,
        basePromptPath: basePrompt.path,
        promptName: basePrompt.name,
        promptDescription: basePrompt.description,
        promptTemplate: basePrompt.template,
        variables: [...basePrompt.variables],
        aiPrompt: basePrompt.runConfig?.aiPrompt ?? initial.aiPrompt,
        provider: basePrompt.runConfig?.provider ?? initial.provider,
        evals: basePrompt.runConfig?.evals ?? initial.evals,
      }
    }
    return initial
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  // Keep a ref to current state to avoid stale closures in execute callback
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Mode setter
  const setMode = useCallback((mode: CustomRunMode) => {
    setState((prev) => ({ ...prev, mode }))
  }, [])

  // Prompt config setters
  const setPromptName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, promptName: name }))
  }, [])

  const setPromptDescription = useCallback((description: string) => {
    setState((prev) => ({ ...prev, promptDescription: description }))
  }, [])

  const setPromptTemplate = useCallback((template: string) => {
    setState((prev) => {
      // Auto-extract variables from template
      const extractedVars = extractVariablesFromTemplate(template)
      const existingKeys = new Set(prev.variables.map((v) => v.key))

      // Add new variables that were extracted but don't exist yet
      const newVariables = [...prev.variables]
      for (const key of extractedVars) {
        if (!existingKeys.has(key)) {
          newVariables.push({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
            type: 'text',
            required: true,
          })
        }
      }

      return { ...prev, promptTemplate: template, variables: newVariables }
    })
  }, [])

  const setVariables = useCallback((variables: Variable[]) => {
    setState((prev) => ({ ...prev, variables }))
  }, [])

  const addVariable = useCallback((variable: Variable) => {
    setState((prev) => ({
      ...prev,
      variables: [...prev.variables, variable],
    }))
  }, [])

  const updateVariable = useCallback((key: string, updates: Partial<Variable>) => {
    setState((prev) => ({
      ...prev,
      variables: prev.variables.map((v) => (v.key === key ? { ...v, ...updates } : v)),
    }))
  }, [])

  const removeVariable = useCallback((key: string) => {
    setState((prev) => ({
      ...prev,
      variables: prev.variables.filter((v) => v.key !== key),
      variableValues: Object.fromEntries(
        Object.entries(prev.variableValues).filter(([k]) => k !== key)
      ),
    }))
  }, [])

  // AI config setters
  const setAiPrompt = useCallback((settings: AIPromptSettings) => {
    setState((prev) => ({ ...prev, aiPrompt: settings }))
  }, [])

  const setAgentId = useCallback((agentId: string | null) => {
    setState((prev) => ({
      ...prev,
      aiPrompt: { ...prev.aiPrompt, agentId: agentId ?? undefined },
    }))
  }, [])

  const setSystemPrompt = useCallback((systemPrompt: string) => {
    setState((prev) => ({
      ...prev,
      aiPrompt: { ...prev.aiPrompt, systemPrompt },
    }))
  }, [])

  const setTemperature = useCallback((temperature: number) => {
    setState((prev) => ({
      ...prev,
      aiPrompt: { ...prev.aiPrompt, temperature },
    }))
  }, [])

  const setMaxTokens = useCallback((maxTokens: number | undefined) => {
    setState((prev) => ({
      ...prev,
      aiPrompt: { ...prev.aiPrompt, maxTokens },
    }))
  }, [])

  // Provider config setters
  const setProvider = useCallback((settings: ProviderRunSettings) => {
    setState((prev) => ({ ...prev, provider: settings }))
  }, [])

  const setDefaultProviderId = useCallback((providerId: string | undefined) => {
    setState((prev) => ({
      ...prev,
      provider: { ...prev.provider, defaultProviderId: providerId },
    }))
  }, [])

  // Eval config setters
  const setEvals = useCallback((settings: EvalConfig) => {
    setState((prev) => ({ ...prev, evals: settings }))
  }, [])

  const setGraderIds = useCallback((graderIds: string[]) => {
    setState((prev) => ({
      ...prev,
      evals: { ...prev.evals, graderIds },
    }))
  }, [])

  const toggleGrader = useCallback((graderId: string) => {
    setState((prev) => {
      const currentIds = prev.evals.graderIds
      const newIds = currentIds.includes(graderId)
        ? currentIds.filter((id) => id !== graderId)
        : [...currentIds, graderId]
      return {
        ...prev,
        evals: { ...prev.evals, graderIds: newIds },
      }
    })
  }, [])

  // Variable values
  const setVariableValue = useCallback((key: string, value: unknown) => {
    setState((prev) => ({
      ...prev,
      variableValues: { ...prev.variableValues, [key]: value },
    }))
  }, [])

  const setVariableValues = useCallback((values: Record<string, unknown>) => {
    setState((prev) => ({
      ...prev,
      variableValues: values,
    }))
  }, [])

  const clearVariableValues = useCallback(() => {
    setState((prev) => ({ ...prev, variableValues: {} }))
  }, [])

  // Execution - uses stateRef for stable reference to avoid stale closures
  const execute = useCallback(async () => {
    // Abort any existing execution
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    // Capture current state at execution time via ref
    const currentState = stateRef.current

    setState((prev) => ({
      ...prev,
      executionState: 'running' as CustomRunExecutionState,
      currentOutput: '',
      currentError: undefined,
    }))

    const startTime = Date.now()

    try {
      // Interpolate template with variable values
      const interpolatedPrompt = interpolate(
        currentState.promptTemplate,
        currentState.variableValues,
        currentState.variables
      )

      // Get provider config
      let providerConfig = null
      if (currentState.provider.defaultProviderId) {
        const result = await getProviderConfig(currentState.provider.defaultProviderId)
        if (result.ok) {
          providerConfig = result.data
        }
      }
      if (!providerConfig) {
        const defaultResult = await getDefaultProviderConfig()
        if (defaultResult.ok) {
          providerConfig = defaultResult.data
        }
      }

      if (!providerConfig) {
        throw new Error('No provider configured. Please configure a provider in Settings.')
      }

      // Build system prompt
      const systemPrompt = currentState.aiPrompt.systemPrompt || 'You are a helpful assistant.'

      // Build messages for the API
      const messages = [
        { role: 'user' as const, content: interpolatedPrompt },
      ]

      let fullOutput = ''
      let inputTokens: number | undefined
      let outputTokens: number | undefined

      // Stream the response using callback-based API
      await new Promise<void>((resolve, reject) => {
        streamWithProvider({
          providerConfig: {
            provider: providerConfig!.provider,
            apiKey: providerConfig!.apiKey,
            model: providerConfig!.model,
            claudeCodeExecutablePath: providerConfig!.claudeCodeExecutablePath,
          },
          systemPrompt,
          messages,
          onChunk: (chunk) => {
            if (controller.signal.aborted) return
            fullOutput += chunk
            setState((prev) => ({ ...prev, currentOutput: fullOutput }))
          },
          onComplete: (usage) => {
            inputTokens = usage?.inputTokens
            outputTokens = usage?.outputTokens
            resolve()
          },
          onError: (error) => {
            reject(error)
          },
          signal: controller.signal,
        })
      })

      const executionTimeMs = Date.now() - startTime

      // Add to history - use stateRef for latest variableValues
      const historyEntry: CustomRunHistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        variableValues: { ...stateRef.current.variableValues },
        output: fullOutput,
        executionTimeMs,
        inputTokens,
        outputTokens,
      }

      setState((prev) => ({
        ...prev,
        executionState: 'completed' as CustomRunExecutionState,
        currentOutput: fullOutput,
        runHistory: [historyEntry, ...prev.runHistory],
      }))
    } catch (error) {
      if (controller.signal.aborted) {
        setState((prev) => ({
          ...prev,
          executionState: 'idle' as CustomRunExecutionState,
        }))
        return
      }

      const errorMessage = error instanceof Error ? error.message : String(error)
      const executionTimeMs = Date.now() - startTime

      // Add error to history
      const historyEntry: CustomRunHistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        variableValues: { ...stateRef.current.variableValues },
        output: '',
        executionTimeMs,
        error: errorMessage,
      }

      setState((prev) => ({
        ...prev,
        executionState: 'error' as CustomRunExecutionState,
        currentError: errorMessage,
        runHistory: [historyEntry, ...prev.runHistory],
      }))
    } finally {
      abortControllerRef.current = null
    }
  }, []) // No dependencies needed - uses stateRef for current state

  const stopExecution = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setState((prev) => ({
      ...prev,
      executionState: 'idle' as CustomRunExecutionState,
    }))
  }, [])

  const clearOutput = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentOutput: '',
      currentError: undefined,
      executionState: 'idle' as CustomRunExecutionState,
    }))
  }, [])

  // History
  const clearHistory = useCallback(() => {
    setState((prev) => ({ ...prev, runHistory: [] }))
  }, [])

  // Initialize from base prompt
  const initializeFromPrompt = useCallback((prompt: PromptFile) => {
    setState((prev) => ({
      ...prev,
      mode: 'existing',
      basePromptId: prompt.id,
      basePromptPath: prompt.path,
      promptName: prompt.name,
      promptDescription: prompt.description,
      promptTemplate: prompt.template,
      variables: [...prompt.variables],
      aiPrompt: prompt.runConfig?.aiPrompt ?? prev.aiPrompt,
      provider: prompt.runConfig?.provider ?? prev.provider,
      evals: prompt.runConfig?.evals ?? prev.evals,
      variableValues: {},
      currentOutput: '',
      currentError: undefined,
      executionState: 'idle' as CustomRunExecutionState,
    }))
  }, [])

  // Get save config - uses stateRef for stable reference
  const getSaveConfig = useCallback((): SavePromptConfig => {
    const currentState = stateRef.current
    return {
      name: currentState.promptName,
      description: currentState.promptDescription,
      template: currentState.promptTemplate,
      variables: currentState.variables,
      tags: [],
      aiPrompt: currentState.aiPrompt,
      provider: currentState.provider,
      evals: currentState.evals,
    }
  }, []) // No dependencies needed - uses stateRef

  // Reset
  const reset = useCallback(() => {
    setState(getInitialCustomRunState('scratch'))
  }, [])

  return {
    state,
    setMode,
    setPromptName,
    setPromptDescription,
    setPromptTemplate,
    setVariables,
    addVariable,
    updateVariable,
    removeVariable,
    setAiPrompt,
    setAgentId,
    setSystemPrompt,
    setTemperature,
    setMaxTokens,
    setProvider,
    setDefaultProviderId,
    setEvals,
    setGraderIds,
    toggleGrader,
    setVariableValue,
    setVariableValues,
    clearVariableValues,
    execute,
    stopExecution,
    clearOutput,
    clearHistory,
    initializeFromPrompt,
    getSaveConfig,
    reset,
  }
}
