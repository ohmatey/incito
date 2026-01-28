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
import type {
  RunModeMessage,
  DisplayFieldTool,
  CompleteFieldTool,
  AskFollowUpTool,
} from '@/types/run.ts'
import { getRunModeTools, parseToolCallArgs } from '@/lib/run-mode/tools'
import {
  buildRunModeSystemPrompt,
  buildProgressContext,
} from '@/lib/run-mode/system-prompt'
import { streamChat, type StreamChatMessage } from '@/lib/mastra-client'
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

  // Actions
  startRunMode: (prompt: PromptFile, customInstructions?: string) => void
  exitRunMode: () => void
  sendMessage: (content: string) => Promise<void>
  submitFieldValue: (key: string, value: unknown) => Promise<void>
  stopGeneration: () => void
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
        const systemPrompt = buildRunModeSystemPrompt(prompt, customInstructions)
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
    [prompt, customInstructions, completedFields, fieldValues, processToolCalls]
  )

  // Effect to start the conversation after state is fully reset
  useEffect(() => {
    if (shouldStartConversation && isActive && prompt && messages.length === 0) {
      setShouldStartConversation(false)
      callAI([])
    }
  }, [shouldStartConversation, isActive, prompt, messages.length, callAI])

  const startRunMode = useCallback(
    (newPrompt: PromptFile, instructions?: string) => {
      setPrompt(newPrompt)
      setMessages([])
      setCompletedFields([])
      setFieldValues({})
      setCurrentDisplayField(null)
      setIsFinished(false)
      setCustomInstructions(instructions)
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

  const value: RunModeContextValue = {
    isActive,
    prompt,
    messages,
    completedFields,
    fieldValues,
    isLoading,
    currentDisplayField,
    isFinished,
    startRunMode,
    exitRunMode,
    sendMessage,
    submitFieldValue,
    stopGeneration,
  }

  return (
    <RunModeContext.Provider value={value}>{children}</RunModeContext.Provider>
  )
}
