import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useAppContext } from '@/context/AppContext'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Sparkles, Clock, PlayCircle, X, Pin } from 'lucide-react'
import { hasAIConfigured, type PromptDraft } from '@/lib/store'
import type { PromptFile } from '@/types/prompt'
import { getDefaultValues } from '@/lib/interpolate'

export function PromptsEmptyState() {
  const { t } = useTranslation(['prompts', 'common'])
  const navigate = useNavigate()
  const {
    promptManager,
    recentPromptIds,
    pinnedPromptIds,
    inProgressPrompts,
    openNewPromptDialog,
    handleCreatePrompt,
    clearDraftById,
  } = useAppContext()

  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null)

  // Check if AI is configured
  useEffect(() => {
    async function checkAI() {
      const result = await hasAIConfigured()
      if (result.ok) {
        setAiConfigured(result.data)
      }
    }
    checkAI()
  }, [])

  // Get recent prompts that still exist
  const recentPrompts: PromptFile[] = recentPromptIds
    .map((id) => promptManager.prompts.find((p) => p.id === id))
    .filter((p): p is PromptFile => p !== undefined)

  // Get pinned prompts that still exist
  const pinnedPrompts: PromptFile[] = pinnedPromptIds
    .map((id) => promptManager.prompts.find((p) => p.id === id))
    .filter((p): p is PromptFile => p !== undefined)

  function handleSelectPrompt(prompt: PromptFile) {
    navigate({ to: '/prompts/$promptId', params: { promptId: prompt.id } })
  }

  async function handleCreateBlank() {
    const newPrompt = await handleCreatePrompt()
    if (newPrompt) {
      navigate({ to: '/prompts/$promptId', params: { promptId: newPrompt.id } })
    }
  }

  function handleCreateWithAI() {
    openNewPromptDialog('ai')
  }

  // Get completion status for an in-progress prompt
  function getCompletionStatus(draft: PromptDraft, prompt: PromptFile) {
    const requiredVars = prompt.variables.filter((v) => v.required)
    const defaults = getDefaultValues(prompt.variables)

    const filledVars = requiredVars.filter((v) => {
      const draftValue = draft.variable_values[v.key]
      const defaultValue = defaults[v.key]
      // Sliders always have a value
      if (v.type === 'slider') return true
      // Check if draft has a non-empty value that differs from default
      const hasValue = draftValue !== undefined && draftValue !== ''
      const differsFromDefault = draftValue !== defaultValue
      return hasValue && differsFromDefault
    })

    return {
      filled: filledVars.length,
      total: requiredVars.length,
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-100 dark:bg-gray-900">
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="mx-auto max-w-2xl space-y-8">
            {/* Create New Section */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('emptyState.createNewPrompt')}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleCreateBlank}
                  className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 text-left transition-all hover:border-primary-300 hover:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                    <FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-gray-800 dark:text-gray-100">{t('newDialog.blankTemplate')}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {t('newDialog.startFromScratch')}
                    </p>
                  </div>
                </button>

                <button
                  onClick={handleCreateWithAI}
                  className={`flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 text-left transition-all hover:border-primary-300 hover:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-600 dark:hover:bg-primary-900/20 ${!aiConfigured ? 'opacity-60' : ''}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                    <Sparkles className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-gray-800 dark:text-gray-100">{t('newDialog.generateWithAI')}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {aiConfigured === false ? t('newDialog.configureInSettings') : t('newDialog.describeWhatYouNeed')}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Pinned Prompts Section */}
            {pinnedPrompts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Pin className="h-4 w-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('list.pinned')}
                  </h2>
                </div>
                <div className="space-y-2">
                  {pinnedPrompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      onClick={() => handleSelectPrompt(prompt)}
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:border-primary-300 hover:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                        <Pin className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-800 dark:text-gray-100">
                          {prompt.name}
                        </p>
                        {prompt.description && (
                          <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                            {prompt.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* In Progress Section */}
            {inProgressPrompts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-amber-500" />
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t('emptyState.inProgress')}
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      inProgressPrompts.forEach(({ prompt }) => clearDraftById(prompt.id))
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {t('emptyState.clearAll')}
                  </button>
                </div>
                <div className="space-y-2">
                  {inProgressPrompts.map(({ draft, prompt }) => {
                    const status = getCompletionStatus(draft, prompt)
                    return (
                      <div
                        key={prompt.id}
                        className="flex w-full items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 transition-all hover:border-amber-300 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:hover:border-amber-700 dark:hover:bg-amber-900/30"
                      >
                        <button
                          onClick={() => handleSelectPrompt(prompt)}
                          className="flex flex-1 items-center gap-3 text-left"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-800/40">
                            <PlayCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-gray-800 dark:text-gray-100">
                              {prompt.name}
                            </p>
                            <p className="text-sm text-amber-600 dark:text-amber-400">
                              {status.total > 0
                                ? t('emptyState.variablesFilled', { filled: status.filled, total: status.total })
                                : t('emptyState.variablesEntered')}
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            clearDraftById(prompt.id)
                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-amber-600 hover:bg-amber-200 dark:text-amber-400 dark:hover:bg-amber-800/40"
                          title={t('emptyState.clearProgress')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Recent Prompts Section */}
            {recentPrompts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('emptyState.recentlyUsed')}
                  </h2>
                </div>
                <div className="space-y-2">
                  {recentPrompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      onClick={() => handleSelectPrompt(prompt)}
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:border-primary-300 hover:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                        <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-800 dark:text-gray-100">
                          {prompt.name}
                        </p>
                        {prompt.description && (
                          <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                            {prompt.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick tip for keyboard shortcut */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{t('emptyState.tip')}</span> {t('emptyState.pressKey')}{' '}
                <kbd className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-medium dark:border-gray-600 dark:bg-gray-700">
                  {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
                </kbd>
                {' + '}
                <kbd className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-medium dark:border-gray-600 dark:bg-gray-700">
                  N
                </kbd>
                {' '}{t('emptyState.toCreatePrompt')}{' '}
                <kbd className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-medium dark:border-gray-600 dark:bg-gray-700">
                  {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
                </kbd>
                {' + '}
                <kbd className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-medium dark:border-gray-600 dark:bg-gray-700">
                  K
                </kbd>
                {' '}{t('emptyState.toSearch')}
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
