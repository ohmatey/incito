import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRunMode } from '@/context/RunModeContext'
import { useAppContext } from '@/context/AppContext'
import { useFeatureFlags } from '@/context/FeatureFlagsContext'
import { RunModeFieldCard } from './RunModeFieldCard'
import { AgentSelectorDropdown } from '@/components/AgentSelectorDropdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  X,
  Send,
  Square,
  Check,
  Copy,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RunModeChatProps {
  onComplete?: (values: Record<string, unknown>) => void
  onCopy?: () => void
}

export function RunModeChat({ onComplete, onCopy }: RunModeChatProps) {
  const { t } = useTranslation(['runMode', 'common'])
  const { agentManager } = useAppContext()
  const { featureFlags } = useFeatureFlags()
  const {
    prompt,
    messages,
    completedFields,
    fieldValues,
    isLoading,
    currentDisplayField,
    isFinished,
    selectedAgentId,
    agents,
    setSelectedAgentId,
    setAgents,
    sendMessage,
    submitFieldValue,
    stopGeneration,
    exitRunMode,
  } = useRunMode()

  // Sync agents from AppContext to RunModeContext
  useEffect(() => {
    setAgents(agentManager.agents)
  }, [agentManager.agents, setAgents])

  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, currentDisplayField])

  // Focus input when not showing a field
  useEffect(() => {
    if (!currentDisplayField && !isLoading && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentDisplayField, isLoading])

  if (!prompt) return null

  const requiredFields = prompt.variables.filter((v) => v.required).length
  const completedRequired = prompt.variables.filter(
    (v) => v.required && completedFields.includes(v.key)
  ).length

  function handleSend() {
    if (!input.trim() || isLoading) return
    sendMessage(input)
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleFieldSubmit(value: unknown) {
    if (currentDisplayField) {
      submitFieldValue(currentDisplayField.variableKey, value)
    }
  }

  function handleComplete() {
    onComplete?.(fieldValues)
    exitRunMode()
  }

  function handleCopy() {
    onCopy?.()
  }

  const currentVariable = currentDisplayField
    ? prompt.variables.find((v) => v.key === currentDisplayField.variableKey)
    : null

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-900">
      {/* Minimal Header */}
      <div className="flex h-12 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {prompt.name}
        </span>
        <div className="flex items-center gap-2">
          {/* Agent selector - only show if agents feature is enabled and agents exist */}
          {featureFlags.agentsEnabled && agents.length > 0 && (
            <AgentSelectorDropdown
              selectedId={selectedAgentId}
              onSelectionChange={setSelectedAgentId}
              agents={agents}
              disabled={isLoading}
            />
          )}
          <Button variant="ghost" size="icon" onClick={exitRunMode} className="h-8 w-8" aria-label={t('common:buttons.close')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef} role="log" aria-live="polite" aria-label={t('runMode:chatMessages', 'Chat messages')}>
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-4 py-2',
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                )}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start" role="status" aria-label={t('common:labels.loading')}>
              <div className="rounded-lg bg-gray-100 px-4 py-2 dark:bg-gray-800">
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" aria-hidden="true" />
              </div>
            </div>
          )}

          {/* Current field card */}
          {currentVariable && currentDisplayField && !isFinished && (
            <div className="py-2">
              <RunModeFieldCard
                variable={currentVariable}
                displayInfo={currentDisplayField}
                currentValue={fieldValues[currentVariable.key]}
                onSubmit={handleFieldSubmit}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Completion state */}
          {isFinished && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <div className="mb-3 flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden="true" />
                <h3 className="font-medium text-green-800 dark:text-green-200">
                  {t('runMode:complete')}
                </h3>
              </div>
              <p className="mb-4 text-sm text-green-700 dark:text-green-300">
                {t('runMode:completeDescription', {
                  required: completedRequired,
                  total: requiredFields,
                })}
              </p>
              <div className="flex gap-2">
                <Button onClick={handleCopy} className="gap-2">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  {t('common:buttons.copy')}
                </Button>
                <Button variant="outline" onClick={handleComplete}>
                  {t('common:buttons.done')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      {!isFinished && (
        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          <div className="mx-auto flex max-w-2xl gap-2">
            <Input
              ref={inputRef}
              name="run-mode-message"
              autoComplete="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('runMode:typeMessage')}
              disabled={isLoading}
              className="flex-1"
            />
            {isLoading ? (
              <Button variant="outline" size="icon" onClick={stopGeneration} aria-label={t('common:buttons.stop')}>
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim()}
                aria-label={t('common:buttons.send')}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
