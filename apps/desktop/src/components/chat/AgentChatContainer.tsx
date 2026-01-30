import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { AgentFile, ChatAttachment } from '@/types/agent'
import type { ChatMessage, ChatSession } from '@/types/agent'
import { ChatHeader } from './ChatHeader'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import {
  createChatSession,
  getChatSessions,
  getChatMessages,
  addChatMessage,
  getTranslationSettings,
} from '@/lib/store'
import { streamAgentChat } from '@/lib/mastra-client'
import { toast } from 'sonner'
import { LANGUAGES } from '@/i18n/types'
import { useAppContext } from '@/context/AppContext'

function buildSystemPromptWithLanguage(basePrompt: string, languageCode?: string, translationEnabled?: boolean): string {
  if (!translationEnabled || !languageCode) return basePrompt

  const language = LANGUAGES.find((l) => l.code === languageCode)
  if (!language) return basePrompt

  const languageInstruction = `\n\nIMPORTANT: You must respond in ${language.name} (${language.nativeName}).`
  return basePrompt + languageInstruction
}

interface AgentChatContainerProps {
  agent: AgentFile
  onEdit?: () => void
}

export function AgentChatContainer({ agent, onEdit }: AgentChatContainerProps) {
  const { t } = useTranslation('agents')
  const { listPanelCollapsed, toggleListPanelCollapsed } = useAppContext()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [translationEnabled, setTranslationEnabled] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Load translation settings on mount
  useEffect(() => {
    async function loadTranslationSettings() {
      const result = await getTranslationSettings()
      if (result.ok) {
        setTranslationEnabled(result.data.enabled)
      }
    }
    loadTranslationSettings()
  }, [])

  // Load sessions when agent changes
  useEffect(() => {
    async function loadSessions() {
      const result = await getChatSessions(agent.id)
      if (result.ok) {
        setSessions(result.data)
        // Select the most recent session or create one
        if (result.data.length > 0) {
          setCurrentSession(result.data[0])
        } else {
          handleNewSession()
        }
      }
    }
    loadSessions()
  }, [agent.id])

  // Load messages when session changes
  useEffect(() => {
    async function loadMessages() {
      if (!currentSession) {
        setMessages([])
        return
      }
      const result = await getChatMessages(currentSession.id)
      if (result.ok) {
        setMessages(result.data)
      }
    }
    loadMessages()
  }, [currentSession?.id])

  const handleNewSession = useCallback(async () => {
    const result = await createChatSession(agent.id, t('chat.newSession'))
    if (result.ok) {
      setCurrentSession(result.data)
      setSessions((prev) => [result.data, ...prev])
      setMessages([])
    }
  }, [agent.id, t])

  const handleSendMessage = useCallback(async (attachments: ChatAttachment[]) => {
    if ((!input.trim() && attachments.length === 0) || !currentSession || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Add user message to UI and database (text only saved to DB)
    const userMsgResult = await addChatMessage(currentSession.id, 'user', userMessage)
    if (userMsgResult.ok) {
      // Add attachments to the message for UI display (not persisted)
      const messageWithAttachments: ChatMessage = {
        ...userMsgResult.data,
        attachments: attachments.length > 0 ? attachments : undefined,
      }
      setMessages((prev) => [...prev, messageWithAttachments])
    }

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      // Stream the response
      let assistantContent = ''
      const tempId = crypto.randomUUID()

      // Add placeholder message
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          sessionId: currentSession.id,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
        },
      ])

      const systemPromptWithLanguage = buildSystemPromptWithLanguage(
        agent.systemPrompt,
        agent.settings.language,
        translationEnabled
      )

      await streamAgentChat({
        agentId: agent.id,
        systemPrompt: systemPromptWithLanguage,
        messages: [...messages, { id: '', sessionId: currentSession.id, role: 'user', content: userMessage, timestamp: '', attachments }],
        settings: agent.settings,
        attachments,
        onChunk: (chunk) => {
          assistantContent += chunk
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...m, content: assistantContent } : m
            )
          )
        },
        onComplete: async () => {
          // Save final message to database
          const assistantMsgResult = await addChatMessage(
            currentSession.id,
            'assistant',
            assistantContent
          )
          if (assistantMsgResult.ok) {
            // Replace temp message with saved one
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId ? assistantMsgResult.data : m
              )
            )
          }
        },
        onError: (error) => {
          toast.error(t('chat.error'))
          console.error('Chat error:', error)
          // Remove the placeholder message
          setMessages((prev) => prev.filter((m) => m.id !== tempId))
        },
        signal: abortControllerRef.current.signal,
      })
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast.error(t('chat.error'))
        console.error('Chat error:', error)
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [input, currentSession, isLoading, agent, messages, t, translationEnabled])

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsLoading(false)
  }, [])

  return (
    <div className="flex h-full flex-1 flex-col bg-white dark:bg-gray-900">
      <ChatHeader
        agent={agent}
        sessions={sessions}
        currentSession={currentSession}
        listPanelCollapsed={listPanelCollapsed}
        onSelectSession={setCurrentSession}
        onNewSession={handleNewSession}
        onEdit={onEdit}
        onToggleListPanel={toggleListPanelCollapsed}
      />
      <ChatMessages messages={messages} isLoading={isLoading} />
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSendMessage}
        onStop={handleStop}
        isLoading={isLoading}
        placeholder={t('chat.placeholder')}
      />
    </div>
  )
}
