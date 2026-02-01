import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react'
import type { PromptFile } from '@/types/prompt'
import type { AgentFile } from '@/types/agent'
import type {
  RunModeMessage,
  DisplayFieldTool,
  CompleteFieldTool,
  AskFollowUpTool,
  ProviderRunResult,
} from '@/types/run.ts'
import type { Grader, GraderResultWithGrader } from '@/types/grader'
import { isAssertionGrader } from '@/types/grader'
import type { BatchRunResult } from '@/components/run-mode/BatchResultsGrid'
import { getRunModeTools, parseToolCallArgs } from '@/lib/run-mode/tools'
import {
  buildRunModeSystemPrompt,
  buildProgressContext,
} from '@/lib/run-mode/system-prompt'
import { streamChat, type StreamChatMessage } from '@/lib/mastra-client'
import { executeAssertionGrader } from '@/lib/grader-executor'
import { getPromptGraders, getGrader, saveGraderResults, getLatestPromptRunConfig, getActiveRulesForPrompt } from '@/lib/store'
import type { PlaybookRule } from '@/types/playbook'
import { toast } from 'sonner'

interface RunModeContextValue {
  // State
  isActive: boolean
  prompt: PromptFile | null
  messages: RunModeMessage[]
  completedFields: string[]
  fieldValues: Record<string, unknown>
  isLoading: boolean
  currentDisplayField: DisplayFieldTool | null
  isFinished: boolean
  selectedAgentId: string | null
  agents: AgentFile[]

  // Multi-provider state
  selectedProviderIds: string[]
  providerResults: Record<string, ProviderRunResult>

  // Grader state
  selectedGraderIds: string[]
  availableGraders: Grader[]
  graderResults: GraderResultWithGrader[]
  isRunningGraders: boolean

  // Batch run state
  batchResults: BatchRunResult[]
  isBatchRunning: boolean
  batchProgress: number
  currentBatchRun: number
  totalBatchRuns: number

  // Actions
  setSelectedAgentId: (id: string | null) => void
  setAgents: (agents: AgentFile[]) => void
  startRunMode: (prompt: PromptFile, options?: { customInstructions?: string; agentId?: string }) => Promise<void>
  exitRunMode: () => void
  sendMessage: (content: string) => Promise<void>
  submitFieldValue: (key: string, value: unknown) => Promise<void>
  stopGeneration: () => void
  setSelectedProviderIds: (ids: string[]) => void
  clearProviderResults: () => void
  updateProviderResult: (providerId: string, update: Partial<ProviderRunResult>) => void
  setSelectedGraderIds: (ids: string[]) => void
  runGraders: (input: string, output: string, runId?: string) => Promise<GraderResultWithGrader[]>
  runBatch: (count: number, input: string) => Promise<void>
  clearBatchResults: () => void
}

const RunModeContext = createContext<RunModeContextValue | null>(null)

export function useRunMode() {
  const context = useContext(RunModeContext)
  if (!context) {
    throw new Error('useRunMode must be used within a RunModeProvider')
  }
  return context
}

interface RunModeProviderProps {
  children: ReactNode
}

export function RunModeProvider({ children }: RunModeProviderProps) {
  const [isActive, setIsActive] = useState(false)
  const [prompt, setPrompt] = useState<PromptFile | null>(null)
  const [messages, setMessages] = useState<RunModeMessage[]>([])
  const [completedFields, setCompletedFields] = useState<string[]>([])
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [currentDisplayField, setCurrentDisplayField] = useState<DisplayFieldTool | null>(null)
  const [isFinished, setIsFinished] = useState(false)
  const [customInstructions, setCustomInstructions] = useState<string | undefined>()
  const [shouldStartConversation, setShouldStartConversation] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [agents, setAgents] = useState<AgentFile[]>([])

  // Multi-provider state
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([])
  const [providerResults, setProviderResults] = useState<Record<string, ProviderRunResult>>({})

  // Grader state
  const [selectedGraderIds, setSelectedGraderIds] = useState<string[]>([])
  const [availableGraders, setAvailableGraders] = useState<Grader[]>([])
  const [graderResults, setGraderResults] = useState<GraderResultWithGrader[]>([])
  const [isRunningGraders, setIsRunningGraders] = useState(false)

  // Batch run state
  const [batchResults, setBatchResults] = useState<BatchRunResult[]>([])
  const [isBatchRunning, setIsBatchRunning] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)
  const [currentBatchRun, setCurrentBatchRun] = useState(0)
  const [totalBatchRuns, setTotalBatchRuns] = useState(0)

  const abortControllerRef = useRef<AbortController | null>(null)

  const addMessage = useCallback((message: Omit<RunModeMessage, 'id' | 'timestamp'>) => {
    const newMessage: RunModeMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, newMessage])
    return newMessage
  }, [])

  const processToolCalls = useCallback(
    (toolCalls: Array<{ name: string; arguments: string }>) => {
      for (const call of toolCalls) {
        switch (call.name) {
          case 'displayField': {
            const args = parseToolCallArgs<DisplayFieldTool>(call.arguments)
            if (args) {
              setCurrentDisplayField(args)
            }
            break
          }
          case 'completeField': {
            const args = parseToolCallArgs<CompleteFieldTool>(call.arguments)
            if (args) {
              setFieldValues((prev) => ({ ...prev, [args.variableKey]: args.value }))
              setCompletedFields((prev) =>
                prev.includes(args.variableKey) ? prev : [...prev, args.variableKey]
              )
              // Clear current display field if it was just completed
              setCurrentDisplayField((current) =>
                current?.variableKey === args.variableKey ? null : current
              )
            }
            break
          }
          case 'askFollowUp': {
            const args = parseToolCallArgs<AskFollowUpTool>(call.arguments)
            if (args) {
              // The follow-up question is in the message content
              // Just track which field it relates to
              console.log('Follow-up for field:', args.relatedField)
            }
            break
          }
          case 'finishRun': {
            setIsFinished(true)
            setCurrentDisplayField(null)
            break
          }
        }
      }
    },
    []
  )

  const callAI = useCallback(
    async (chatMessages: StreamChatMessage[]) => {
      if (!prompt) return

      setIsLoading(true)
      abortControllerRef.current = new AbortController()

      try {
        // Find selected agent and get its system prompt
        const selectedAgent = selectedAgentId ? agents.find(a => a.id === selectedAgentId) : null

        // Fetch playbook rules for this prompt
        let playbookRules: PlaybookRule[] = []
        let maxPlaybookRules: number | undefined
        const rulesResult = await getActiveRulesForPrompt(prompt.id)
        if (rulesResult.ok) {
          playbookRules = rulesResult.data
        }

        // Check if prompt config has max rules setting
        const configResult = await getLatestPromptRunConfig(prompt.id)
        if (configResult.ok && configResult.data?.playbooks?.maxRulesToInject) {
          maxPlaybookRules = configResult.data.playbooks.maxRulesToInject
        }

        const systemPrompt = buildRunModeSystemPrompt(prompt, {
          customInstructions,
          agentSystemPrompt: selectedAgent?.systemPrompt,
          agentName: selectedAgent?.name,
          playbookRules,
          maxPlaybookRules,
        })
        const progressContext = buildProgressContext(
          prompt.variables,
          completedFields,
          fieldValues
        )
        const fullSystemPrompt = `${systemPrompt}\n\n${progressContext}`

        const tools = getRunModeTools(prompt.variables)

        let assistantContent = ''
        const tempId = crypto.randomUUID()
        const collectedToolCalls: Array<{ name: string; arguments: string }> = []

        // Add placeholder message
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
          },
        ])

        await streamChat({
          systemPrompt: fullSystemPrompt,
          messages: chatMessages,
          tools,
          onChunk: (chunk) => {
            assistantContent += chunk
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId ? { ...m, content: assistantContent } : m
              )
            )
          },
          onToolCall: (toolCall) => {
            collectedToolCalls.push(toolCall)
          },
          onComplete: () => {
            // Process collected tool calls
            if (collectedToolCalls.length > 0) {
              processToolCalls(collectedToolCalls)
            }
          },
          onError: (error) => {
            toast.error('Failed to get AI response')
            console.error('Run mode AI error:', error)
            // Remove placeholder
            setMessages((prev) => prev.filter((m) => m.id !== tempId))
          },
          signal: abortControllerRef.current.signal,
        })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          toast.error('Failed to get AI response')
          console.error('Run mode error:', error)
        }
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [prompt, customInstructions, completedFields, fieldValues, processToolCalls, selectedAgentId, agents]
  )

  // Effect to start the conversation after state is fully reset
  useEffect(() => {
    if (shouldStartConversation && isActive && prompt && messages.length === 0) {
      setShouldStartConversation(false)
      callAI([])
    }
  }, [shouldStartConversation, isActive, prompt, messages.length, callAI])

  // Load available graders for the prompt when it changes
  useEffect(() => {
    async function loadGraders() {
      if (!prompt) {
        setAvailableGraders([])
        setSelectedGraderIds([])
        return
      }

      const result = await getPromptGraders(prompt.id)
      if (result.ok) {
        setAvailableGraders(result.data)
        // Auto-select all enabled graders by default
        setSelectedGraderIds(result.data.filter(g => g.enabled).map(g => g.id))
      }
    }

    loadGraders()
  }, [prompt?.id])

  // Run graders on the output
  const runGraders = useCallback(
    async (input: string, output: string, runId?: string): Promise<GraderResultWithGrader[]> => {
      if (selectedGraderIds.length === 0) {
        return []
      }

      setIsRunningGraders(true)

      try {
        // Fetch all selected graders in parallel (async-parallel rule)
        const graderResults = await Promise.all(
          selectedGraderIds.map(id => getGrader(id))
        )
        const graders = graderResults
          .filter((r): r is { ok: true; data: Grader } => r.ok && r.data !== null)
          .map(r => r.data)

        // Execute graders: assertions in parallel (instant), LLM judges sequentially (rate limits)
        const assertionGraders = graders.filter(isAssertionGrader)
        const llmJudgeGraders = graders.filter(g => !isAssertionGrader(g))

        // Helper to build result object
        const buildResult = (
          grader: Grader,
          result: { score: number; passed: boolean; reason?: string; rawScore?: number; executionTimeMs: number }
        ): GraderResultWithGrader => ({
          id: crypto.randomUUID(),
          runId: runId || '',
          graderId: grader.id,
          score: result.score,
          passed: result.passed,
          reason: result.reason,
          rawScore: result.rawScore,
          executionTimeMs: result.executionTimeMs,
          createdAt: new Date().toISOString(),
          grader,
        })

        const buildErrorResult = (grader: Grader, error: unknown): GraderResultWithGrader => ({
          id: crypto.randomUUID(),
          runId: runId || '',
          graderId: grader.id,
          score: 0,
          passed: false,
          reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          executionTimeMs: 0,
          createdAt: new Date().toISOString(),
          grader,
        })

        // Execute all assertion graders in parallel (they're instant, no rate limits)
        const assertionResultsPromise = Promise.all(
          assertionGraders.map(grader => {
            try {
              const result = executeAssertionGrader(grader, output)
              return buildResult(grader, result)
            } catch (error) {
              return buildErrorResult(grader, error)
            }
          })
        )

        // Execute LLM judges sequentially to avoid rate limits
        const llmJudgeResults: GraderResultWithGrader[] = []
        for (const grader of llmJudgeGraders) {
          try {
            const response = await fetch('http://localhost:3457/graders/run-llm-judge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ grader, input, output }),
            })

            const result = response.ok
              ? await response.json()
              : {
                  score: 0,
                  passed: false,
                  reason: (await response.json()).error || 'LLM judge execution failed',
                  executionTimeMs: 0,
                }

            llmJudgeResults.push(buildResult(grader, result))
          } catch (error) {
            llmJudgeResults.push(buildErrorResult(grader, error))
          }
        }

        // Wait for assertion results (they should be done by now)
        const assertionResults = await assertionResultsPromise

        // Combine results
        const results = [...assertionResults, ...llmJudgeResults]

        // Save results to database if we have a runId
        if (runId && results.length > 0) {
          await saveGraderResults(
            results.map(r => ({
              runId: r.runId,
              graderId: r.graderId,
              score: r.score,
              passed: r.passed,
              reason: r.reason,
              rawScore: r.rawScore,
              executionTimeMs: r.executionTimeMs,
            }))
          )
        }

        setGraderResults(results)
        return results
      } catch (error) {
        console.error('Error running graders:', error)
        toast.error('Failed to run some graders')
        return []
      } finally {
        setIsRunningGraders(false)
      }
    },
    [selectedGraderIds]
  )

  const startRunMode = useCallback(
    async (newPrompt: PromptFile, options?: { customInstructions?: string; agentId?: string }) => {
      setPrompt(newPrompt)
      setMessages([])
      setCompletedFields([])
      setFieldValues({})
      setCurrentDisplayField(null)
      setIsFinished(false)
      setCustomInstructions(options?.customInstructions)
      setProviderResults({})
      setGraderResults([])

      // Load the run config to get the configured agent
      let configuredAgentId: string | undefined
      const configResult = await getLatestPromptRunConfig(newPrompt.path)
      if (configResult.ok && configResult.data?.aiPrompt?.agentId) {
        configuredAgentId = configResult.data.aiPrompt.agentId
      }

      // Priority: options.agentId > runConfig.aiPrompt.agentId > prompt.defaultAgentId
      setSelectedAgentId(options?.agentId ?? configuredAgentId ?? newPrompt.defaultAgentId ?? null)

      setIsActive(true)
      setShouldStartConversation(true)
    },
    []
  )

  const exitRunMode = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsActive(false)
    setPrompt(null)
    setMessages([])
    setCompletedFields([])
    setFieldValues({})
    setCurrentDisplayField(null)
    setIsFinished(false)
    setCustomInstructions(undefined)
    setShouldStartConversation(false)
    setSelectedAgentId(null)
    setSelectedProviderIds([])
    setProviderResults({})
    setSelectedGraderIds([])
    setGraderResults([])
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return

      // Add user message
      addMessage({ role: 'user', content })

      // Build chat history for AI
      const chatMessages: StreamChatMessage[] = [
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content },
      ]

      await callAI(chatMessages)
    },
    [messages, isLoading, addMessage, callAI]
  )

  const submitFieldValue = useCallback(
    async (key: string, value: unknown) => {
      // Update local state
      setFieldValues((prev) => ({ ...prev, [key]: value }))
      setCompletedFields((prev) => (prev.includes(key) ? prev : [...prev, key]))
      setCurrentDisplayField(null)

      // Notify AI about the submitted value
      const variable = prompt?.variables.find((v) => v.key === key)
      const displayValue =
        typeof value === 'string' ? value : JSON.stringify(value)
      const message = `I've filled in ${variable?.label || key}: ${displayValue}`

      await sendMessage(message)
    },
    [prompt, sendMessage]
  )

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsLoading(false)
  }, [])

  const clearProviderResults = useCallback(() => {
    setProviderResults({})
  }, [])

  const updateProviderResult = useCallback(
    (providerId: string, update: Partial<ProviderRunResult>) => {
      setProviderResults((prev) => ({
        ...prev,
        [providerId]: {
          ...prev[providerId],
          ...update,
        } as ProviderRunResult,
      }))
    },
    []
  )

  // Batch run execution
  const runBatch = useCallback(
    async (count: number, input: string) => {
      if (!prompt || selectedProviderIds.length === 0) {
        toast.error('No prompt or provider selected')
        return
      }

      setIsBatchRunning(true)
      setTotalBatchRuns(count)
      setCurrentBatchRun(0)
      setBatchProgress(0)

      // Initialize batch results
      const initialResults: BatchRunResult[] = Array.from({ length: count }, (_, i) => ({
        id: crypto.randomUUID(),
        runNumber: i + 1,
        status: 'pending' as const,
        content: '',
        graderResults: [],
        allGradersPassed: false,
        avgGraderScore: 0,
      }))
      setBatchResults(initialResults)

      // Execute runs sequentially to avoid rate limits and provide progress feedback
      for (let i = 0; i < count; i++) {
        setCurrentBatchRun(i + 1)
        setBatchProgress(((i) / count) * 100)

        // Update status to running
        setBatchResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: 'running' as const } : r
        ))

        try {
          // Use first selected provider for batch runs
          const providerId = selectedProviderIds[0]

          // Make API call to generate content
          const response = await fetch('http://localhost:3457/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              providerId,
              messages: [{ role: 'user', content: input }],
            }),
          })

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
          }

          const data = await response.json()
          const content = data.content || data.text || ''
          const tokens = data.usage || {}

          // Run graders on the output
          const graderResultsForRun = await runGraders(input, content)
          const allPassed = graderResultsForRun.every(r => r.passed)
          const avgScore = graderResultsForRun.length > 0
            ? graderResultsForRun.reduce((sum, r) => sum + r.score, 0) / graderResultsForRun.length
            : 1

          // Update result
          setBatchResults(prev => prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: 'completed' as const,
                  content,
                  graderResults: graderResultsForRun,
                  allGradersPassed: allPassed,
                  avgGraderScore: avgScore,
                  inputTokens: tokens.inputTokens,
                  outputTokens: tokens.outputTokens,
                  totalTokens: tokens.totalTokens,
                  estimatedCostUsd: tokens.estimatedCostUsd,
                }
              : r
          ))
        } catch (error) {
          // Update with error
          setBatchResults(prev => prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: 'error' as const,
                  error: error instanceof Error ? error.message : 'Unknown error',
                }
              : r
          ))
        }

        // Small delay between runs to avoid rate limits
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      setBatchProgress(100)
      setIsBatchRunning(false)
      toast.success(`Batch run completed: ${count} runs`)
    },
    [prompt, selectedProviderIds, runGraders]
  )

  const clearBatchResults = useCallback(() => {
    setBatchResults([])
    setBatchProgress(0)
    setCurrentBatchRun(0)
    setTotalBatchRuns(0)
  }, [])

  const value: RunModeContextValue = {
    isActive,
    prompt,
    messages,
    completedFields,
    fieldValues,
    isLoading,
    currentDisplayField,
    isFinished,
    selectedAgentId,
    agents,
    selectedProviderIds,
    providerResults,
    selectedGraderIds,
    availableGraders,
    graderResults,
    isRunningGraders,
    batchResults,
    isBatchRunning,
    batchProgress,
    currentBatchRun,
    totalBatchRuns,
    setSelectedAgentId,
    setAgents,
    startRunMode,
    exitRunMode,
    sendMessage,
    submitFieldValue,
    stopGeneration,
    setSelectedProviderIds,
    clearProviderResults,
    updateProviderResult,
    setSelectedGraderIds,
    runGraders,
    runBatch,
    clearBatchResults,
  }

  return (
    <RunModeContext.Provider value={value}>{children}</RunModeContext.Provider>
  )
}
