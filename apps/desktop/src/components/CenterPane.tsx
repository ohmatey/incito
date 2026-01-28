import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppContext } from '@/context/AppContext'
import type { PromptFile, Tag, LanguageCode } from '@/types/prompt'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { HighlightedTextarea } from '@/components/ui/highlighted-textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { VariableInputCard } from './VariableInputCard'
import { TagBadge } from './TagBadge'
import { TagSelector } from './TagSelector'
import { AiFillFieldModal } from './AiFillFieldModal'
import { AddonsSection } from './addons'

// Lazy load TranslationPreview since it's only shown when the modal opens
const TranslationPreview = lazy(() => import('./translation/TranslationPreview').then(m => ({ default: m.TranslationPreview })))
import type { Variable } from '@/types/prompt'
import { interpolate } from '@/lib/interpolate'
import { AVAILABLE_LAUNCHERS, getLaunchersByIds, type Launcher } from '@/lib/launchers'
import { startRun, completeRun } from '@/lib/run-history'
import { hasAIConfigured, getTranslationSettings } from '@/lib/store'
import { translatePromptText, type TranslationResultData } from '@/lib/mastra-client'
import { detectLanguage, getLanguageInfo, getLanguageShortCode } from '@/lib/language-detect'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { openUrl } from '@tauri-apps/plugin-opener'
import { toast } from 'sonner'
import { Copy, Check, ExternalLink, MoreHorizontal, Pin, FileText, Plus, RotateCcw, Sparkles, Loader2, Undo2, Redo2, Languages, ChevronUp } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

interface FillWithAIResult {
  filledCount: number
  totalCount: number
}

interface CenterPaneProps {
  prompt: PromptFile | null
  prompts: PromptFile[]
  pinnedPromptIds: string[]
  values: Record<string, unknown>
  isEditMode: boolean
  localName: string
  localDescription: string
  localTemplate: string
  localTags: string[]
  nameError: string | null
  tags: Tag[]
  activeVariableKey: string | null
  onValueChange: (key: string, value: unknown) => void
  onActiveVariableChange: (key: string | null) => void
  onLocalNameChange: (name: string) => void
  onLocalDescriptionChange: (description: string) => void
  onLocalTemplateChange: (template: string) => void
  onLocalTagsChange: (tags: string[]) => void
  onCreateTag: (name: string, color: string) => void
  onSelectPrompt: (prompt: PromptFile) => void
  onPromptCompleted?: () => void
  onResetForm?: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  getLastChangeSource?: (key: string) => 'user' | 'ai_fill' | 'ai_refine' | 'reset' | null
  onRefineWithAI?: (template: string, instruction: string) => Promise<string>
  onFillWithAI?: (context: string) => Promise<FillWithAIResult>
}

export function CenterPane({
  prompt,
  prompts,
  pinnedPromptIds,
  values,
  isEditMode,
  localName,
  localDescription,
  localTemplate,
  localTags,
  nameError,
  tags,
  activeVariableKey,
  onValueChange,
  onActiveVariableChange,
  onLocalNameChange,
  onLocalDescriptionChange,
  onLocalTemplateChange,
  onLocalTagsChange,
  onCreateTag,
  onSelectPrompt,
  onPromptCompleted,
  onResetForm,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  getLastChangeSource,
  onRefineWithAI,
  onFillWithAI,
}: CenterPaneProps) {
  const { t } = useTranslation(['prompts', 'common', 'toasts', 'translation'])
  const { featureFlags } = useAppContext()
  const [copied, setCopied] = useState(false)
  const [aiInstruction, setAiInstruction] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [aiConfigured, setAiConfigured] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [showFillAiPanel, setShowFillAiPanel] = useState(false)
  const [fillContext, setFillContext] = useState('')
  const [isFilling, setIsFilling] = useState(false)
  const [aiFillModalOpen, setAiFillModalOpen] = useState(false)
  const [aiFillTargetVariable, setAiFillTargetVariable] = useState<Variable | null>(null)

  // Translation state
  const [translationEnabled, setTranslationEnabled] = useState(false)
  const [translationSettings, setTranslationSettings] = useState<{
    enabled: boolean
    sourceLanguages: LanguageCode[]
    targetLanguage: LanguageCode
  } | null>(null)
  const [showTranslationPreview, setShowTranslationPreview] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationResult, setTranslationResult] = useState<TranslationResultData | null>(null)
  const [translationError, setTranslationError] = useState<string | null>(null)
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageCode | null>(null)
  const [pendingLauncher, setPendingLauncher] = useState<Launcher | null>(null)

  // Consolidated keyboard shortcuts (Cmd/Ctrl+Enter for copy, Cmd/Ctrl+Shift+Up/Down for navigation)
  useEffect(() => {
    if (!prompt || isEditMode) return

    // Capture prompt reference for closure
    const currentPrompt = prompt

    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey
      if (!isMod) return

      // Cmd/Ctrl+Enter: Copy prompt
      if (e.key === 'Enter' && currentPrompt.isValid) {
        e.preventDefault()
        const requiredVars = currentPrompt.variables.filter((v) => v.required)
        const allFilled = requiredVars.every((v) => {
          const value = values[v.key]
          if (v.type === 'slider') return true
          return value !== undefined && value !== ''
        })
        if (allFilled) {
          const content = interpolate(currentPrompt.template, values, currentPrompt.variables)
          writeText(content).then(() => {
            setCopied(true)
            toast.success(t('toasts:success.copied'))
            setTimeout(() => setCopied(false), 2000)
            onPromptCompleted?.()
          })
        } else {
          toast.error(t('centerPane.fillRequiredFirst'))
        }
        return
      }

      // Cmd/Ctrl+Shift+Up/Down: Navigate between variables
      if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && currentPrompt.variables.length > 0) {
        e.preventDefault()
        const variables = currentPrompt.variables
        const currentIndex = activeVariableKey
          ? variables.findIndex((v) => v.key === activeVariableKey)
          : -1

        let nextIndex: number
        if (e.key === 'ArrowUp') {
          nextIndex = currentIndex <= 0 ? variables.length - 1 : currentIndex - 1
        } else {
          nextIndex = currentIndex >= variables.length - 1 ? 0 : currentIndex + 1
        }

        const nextVariable = variables[nextIndex]
        onActiveVariableChange(nextVariable.key)

        // Focus the input element
        const inputId = `var-${nextVariable.key}`
        const inputEl = document.getElementById(inputId) as HTMLElement | null
        if (inputEl) {
          inputEl.focus()
          inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [prompt, isEditMode, values, activeVariableKey, onActiveVariableChange, onPromptCompleted, t])

  // Load AI configuration status
  useEffect(() => {
    async function checkAI() {
      const result = await hasAIConfigured()
      if (result.ok) {
        setAiConfigured(result.data)
      }
    }
    checkAI()
  }, [isEditMode])

  // Load translation settings
  useEffect(() => {
    async function loadTranslationSettings() {
      const result = await getTranslationSettings()
      if (result.ok) {
        setTranslationSettings(result.data)
        setTranslationEnabled(result.data.enabled)
      }
    }
    loadTranslationSettings()
  }, [])

  // Helper function to get interpolated content (defined early for use in effects)
  const getInterpolatedContentEarly = useCallback(() => {
    if (!prompt) return ''
    return interpolate(prompt.template, values, prompt.variables)
  }, [prompt, values])

  // Helper to track a prompt run
  const trackRun = useCallback(async (launcherId: 'copy' | 'run_mode' | string) => {
    if (!prompt) return

    const runId = await startRun({
      promptId: prompt.id,
      promptPath: prompt.path,
      promptName: prompt.name,
      launcher: launcherId as 'copy' | 'run_mode' | 'agent' | 'api',
    })

    if (runId) {
      await completeRun({
        runId,
        variableValues: values,
        success: true,
      })
    }
  }, [prompt, values])

  // Detect language when prompt changes (only if translations feature is enabled)
  useEffect(() => {
    if (!prompt || !translationSettings?.enabled || !featureFlags.translationsEnabled) {
      setDetectedLanguage(null)
      return
    }

    const content = getInterpolatedContentEarly()
    if (content) {
      const detected = detectLanguage(content)
      if (detected && detected.code !== translationSettings.targetLanguage) {
        setDetectedLanguage(detected.code)
      } else {
        setDetectedLanguage(null)
      }
    }
  }, [prompt, values, translationSettings, getInterpolatedContentEarly, featureFlags.translationsEnabled])

  // Reset AI panel state when exiting edit mode
  useEffect(() => {
    if (!isEditMode) {
      setShowAiPanel(false)
      setAiInstruction('')
    }
  }, [isEditMode])

  // Reset fill AI panel state when entering edit mode or switching prompts
  useEffect(() => {
    setShowFillAiPanel(false)
    setFillContext('')
  }, [isEditMode, prompt?.id])

  const handleRefine = useCallback(async () => {
    if (!onRefineWithAI || !aiInstruction.trim()) return

    setIsRefining(true)
    try {
      const refined = await onRefineWithAI(localTemplate, aiInstruction)
      onLocalTemplateChange(refined)
      setAiInstruction('')
      toast.success(t('centerPane.templateRefined'))
    } catch (error) {
      console.error('Failed to refine:', error)
      toast.error(t('centerPane.refineFailed'))
    } finally {
      setIsRefining(false)
    }
  }, [localTemplate, aiInstruction, onRefineWithAI, onLocalTemplateChange])

  const handleFillWithAI = useCallback(async () => {
    if (!onFillWithAI || !fillContext.trim()) return

    setIsFilling(true)
    try {
      const result = await onFillWithAI(fillContext)
      setShowFillAiPanel(false)
      setFillContext('')
      if (result.filledCount === 0) {
        toast.info(t('centerPane.noMatchingInfo'), {
          description: t('centerPane.addMoreDetails'),
        })
      } else {
        toast.success(t('centerPane.filledFields', { filled: result.filledCount, total: result.totalCount }))
      }
    } catch (error) {
      console.error('Failed to fill fields:', error)
      const errorMessage = error instanceof Error ? error.message : t('centerPane.fillFailed')
      toast.error(errorMessage)
    } finally {
      setIsFilling(false)
    }
  }, [fillContext, onFillWithAI])

  // Translation handlers
  const handleTranslate = useCallback(async (skipCache = false) => {
    if (!translationSettings || !detectedLanguage) return

    const content = getInterpolatedContentEarly()
    if (!content) return

    setIsTranslating(true)
    setTranslationError(null)

    try {
      const result = await translatePromptText({
        text: content,
        sourceLanguage: detectedLanguage,
        targetLanguage: translationSettings.targetLanguage,
        context: 'coding',
        skipCache,
      })

      if (result.ok) {
        setTranslationResult(result.data)
      } else {
        setTranslationError(result.error)
      }
    } catch (error) {
      setTranslationError(error instanceof Error ? error.message : 'Translation failed')
    } finally {
      setIsTranslating(false)
    }
  }, [translationSettings, detectedLanguage, getInterpolatedContentEarly])

  const handleCopyWithTranslation = useCallback(async () => {
    if (!translationEnabled || !detectedLanguage || !translationSettings) {
      // No translation needed, copy directly
      const content = getInterpolatedContentEarly()
      await writeText(content)
      setCopied(true)
      toast.success(t('toasts:success.copied'))
      setTimeout(() => setCopied(false), 2000)
      trackRun('copy')
      onPromptCompleted?.()
      return
    }

    // Show translation preview
    setPendingLauncher(null)
    setShowTranslationPreview(true)
    handleTranslate()
  }, [translationEnabled, detectedLanguage, translationSettings, getInterpolatedContentEarly, handleTranslate, onPromptCompleted, t, trackRun])

  const handleLaunchWithTranslation = useCallback(async (launcher: Launcher) => {
    if (!translationEnabled || !detectedLanguage || !translationSettings) {
      // No translation needed, launch directly
      const content = getInterpolatedContentEarly()

      try {
        if (!launcher.supportsDeepLink) {
          await writeText(content)
          await openUrl(launcher.getUrl(content))
          toast.success(t('centerPane.copiedAndOpened', { app: launcher.name }), {
            description: t('centerPane.pasteToContinue'),
          })
        } else {
          await openUrl(launcher.getUrl(content))
          toast.success(t('centerPane.openedIn', { app: launcher.name }))
        }
        trackRun(launcher.id)
        onPromptCompleted?.()
      } catch (error) {
        console.error(`Failed to open ${launcher.name}:`, error)
        toast.error(t('centerPane.failedToOpen', { app: launcher.name }))
      }
      return
    }

    // Show translation preview with pending launcher
    setPendingLauncher(launcher)
    setShowTranslationPreview(true)
    handleTranslate()
  }, [translationEnabled, detectedLanguage, translationSettings, getInterpolatedContentEarly, handleTranslate, onPromptCompleted, t, trackRun])

  const handleTranslationCopyOriginal = useCallback(async () => {
    const content = getInterpolatedContentEarly()
    await writeText(content)
    toast.success(t('toasts:success.copied'))
    setShowTranslationPreview(false)
    trackRun('copy')
    onPromptCompleted?.()
  }, [getInterpolatedContentEarly, onPromptCompleted, t, trackRun])

  const handleTranslationCopyTranslated = useCallback(async (text: string) => {
    await writeText(text)
    toast.success(t('toasts:success.copied'))
    setShowTranslationPreview(false)
    trackRun('copy')
    onPromptCompleted?.()
  }, [onPromptCompleted, t, trackRun])

  const handleTranslationLaunch = useCallback(async (text: string, launcherName: string) => {
    const launcher = AVAILABLE_LAUNCHERS.find(l => l.name === launcherName) || pendingLauncher
    if (!launcher) return

    try {
      if (!launcher.supportsDeepLink) {
        await writeText(text)
        await openUrl(launcher.getUrl(text))
        toast.success(t('centerPane.copiedAndOpened', { app: launcher.name }), {
          description: t('centerPane.pasteToContinue'),
        })
      } else {
        await openUrl(launcher.getUrl(text))
        toast.success(t('centerPane.openedIn', { app: launcher.name }))
      }
      setShowTranslationPreview(false)
      trackRun(launcher.id)
      onPromptCompleted?.()
    } catch (error) {
      console.error(`Failed to open ${launcher.name}:`, error)
      toast.error(t('centerPane.failedToOpen', { app: launcher.name }))
    }
  }, [pendingLauncher, onPromptCompleted, t, trackRun])

  // Get Tag objects for display from tag names
  const promptTagObjects = localTags
    .map((name) => tags.find((t) => t.name === name))
    .filter((t): t is Tag => t !== undefined)

  function handleTagToggle(tagName: string) {
    if (localTags.includes(tagName)) {
      onLocalTagsChange(localTags.filter((t) => t !== tagName))
    } else {
      onLocalTagsChange([...localTags, tagName])
    }
  }

  function handleTagRemove(tagName: string) {
    onLocalTagsChange(localTags.filter((t) => t !== tagName))
  }

  function handleCreateTag(name: string, color: string) {
    onCreateTag(name, color)
    onLocalTagsChange([...localTags, name])
  }

  // Use the early-defined version for all interpolation
  const getInterpolatedContent = getInterpolatedContentEarly

  const getCompletionStatus = useCallback(() => {
    if (!prompt) return { filled: 0, total: 0, ready: false }
    const requiredVars = prompt.variables.filter((v) => v.required)
    const filledVars = requiredVars.filter((v) => {
      const value = values[v.key]
      // Sliders always have a value (either set, default, or min), so they're always "filled"
      if (v.type === 'slider') {
        return true
      }
      return value !== undefined && value !== ''
    })
    return {
      filled: filledVars.length,
      total: requiredVars.length,
      ready: filledVars.length === requiredVars.length,
    }
  }, [prompt, values])

  const completionStatus = getCompletionStatus()
  const canCopy = useCallback(() => completionStatus.ready, [completionStatus.ready])

  async function handleCopy() {
    await handleCopyWithTranslation()
  }

  // Copy original without translation
  async function handleCopyOriginal() {
    const content = getInterpolatedContent()
    await writeText(content)
    setCopied(true)
    toast.success(t('toasts:success.copied'))
    setTimeout(() => setCopied(false), 2000)
    onPromptCompleted?.()
  }

  // Get default launchers for this prompt
  const defaultLaunchers = getLaunchersByIds(prompt?.defaultLaunchers ?? [])

  async function handleOpenInApp(app: Launcher) {
    await handleLaunchWithTranslation(app)
  }

  if (!prompt) {
    const pinnedPrompts = prompts.filter((p) => pinnedPromptIds.includes(p.id))
    const hasPrompts = prompts.length > 0

    return (
      <div className="flex h-full flex-1 flex-col bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          {hasPrompts ? (
            <>
              {pinnedPrompts.length > 0 && (
                <div className="mb-8 w-full max-w-md">
                  <h3 className="mb-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('centerPane.pinnedPrompts')}
                  </h3>
                  <div className="grid gap-2">
                    {pinnedPrompts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onSelectPrompt(p)}
                        className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-700"
                      >
                        <Pin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-gray-900 dark:text-gray-100">
                            {p.name}
                          </div>
                          {p.description && (
                            <div className="truncate text-sm text-gray-500 dark:text-gray-400">
                              {p.description}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('centerPane.selectToStart')}
              </p>
            </>
          ) : (
            <div className="w-full max-w-md">
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
                  <FileText className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('centerPane.createFirst')}
                </h3>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                  {t('centerPane.createFirstDescription')}
                </p>
                <Button
                  onClick={() => {
                    // Trigger new prompt dialog via keyboard shortcut simulation
                    const event = new KeyboardEvent('keydown', {
                      key: 'n',
                      metaKey: true,
                      bubbles: true,
                    })
                    document.dispatchEvent(event)
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {t('list.newPrompt')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!prompt.isValid) {
    return (
      <div className="flex h-full flex-1 flex-col bg-gray-100 dark:bg-gray-900">
        <div className="flex-1 p-6">
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <h3 className="font-medium text-red-600 dark:text-red-400">{t('centerPane.parseErrors')}</h3>
              <ul className="mt-2 space-y-1 text-sm text-red-600 dark:text-red-400">
                {prompt.errors.map((error, i) => (
                  <li key={i}>
                    <span className="font-mono text-xs">{error.field}</span>: {error.message}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-medium text-gray-700 dark:text-gray-300">{t('centerPane.rawContent')}</h3>
              <pre className="overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 shadow-inner dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-200">
                {prompt.rawContent}
              </pre>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isEditMode) {
    return (
      <div className="flex h-full flex-1 flex-col bg-gray-100 dark:bg-gray-900">
        <ScrollArea className="flex-1">
          <div className="p-6">
            <div className="mx-auto max-w-2xl space-y-4">
            {/* Name input */}
            <div>
              <Input
                value={localName}
                onChange={(e) => onLocalNameChange(e.target.value)}
                className={`border-gray-200 bg-white text-lg font-semibold dark:border-gray-700 dark:bg-gray-800 ${
                  nameError
                    ? 'text-red-500 dark:text-red-400 border-red-300 dark:border-red-600'
                    : 'text-gray-800 dark:text-gray-100'
                }`}
                placeholder={t('centerPane.promptNamePlaceholder')}
              />
              {nameError && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">{nameError}</p>
              )}
            </div>

            {/* Description input */}
            <div>
              <Textarea
                value={localDescription}
                onChange={(e) => onLocalDescriptionChange(e.target.value)}
                className="min-h-[60px] resize-none border-gray-200 bg-white text-sm dark:border-gray-700 dark:bg-gray-800"
                placeholder={t('centerPane.addDescriptionPlaceholder')}
              />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              {promptTagObjects.map((tag) => (
                <TagBadge
                  key={tag.id}
                  tag={tag}
                  onRemove={() => handleTagRemove(tag.name)}
                />
              ))}
              <TagSelector
                tags={tags}
                selectedTagNames={localTags}
                onTagToggle={handleTagToggle}
                onCreateTag={handleCreateTag}
              />
            </div>

            {/* Template editor with AI refinement */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('centerPane.template')}
                </Label>
                {aiConfigured && onRefineWithAI && !showAiPanel && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 h-7 text-xs"
                    onClick={() => setShowAiPanel(true)}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {t('centerPane.refineWithAI')}
                  </Button>
                )}
              </div>

              <HighlightedTextarea
                value={localTemplate}
                onValueChange={onLocalTemplateChange}
                className="min-h-[300px] w-full resize-y border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                placeholder={t('centerPane.templatePlaceholder')}
              />

              {/* AI Refinement Panel */}
              {aiConfigured && onRefineWithAI && showAiPanel && (
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('centerPane.refineWithAI')}
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowAiPanel(false)}
                    >
                      {t('centerPane.hide')}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {t('centerPane.describeImprovement')}
                  </p>
                  <Textarea
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                    className="min-h-[100px] text-sm resize-none border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-900"
                    placeholder={t('centerPane.refinePlaceholder')}
                  />
                  <p className="mt-2 font-mono text-[10px] text-gray-400 dark:text-gray-500">
                    {t('common:ai.disclaimer')}
                  </p>
                  <Button
                    onClick={handleRefine}
                    disabled={isRefining || !aiInstruction.trim()}
                    className="mt-3 gap-2"
                    size="sm"
                  >
                    {isRefining ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {isRefining ? t('centerPane.refining') : t('centerPane.refine')}
                  </Button>
                </div>
              )}
            </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    )
  }

  // Run mode
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-gray-100 dark:bg-gray-900">
      <ScrollArea className="min-h-0 flex-1 overflow-auto">
        <div className="p-6">
          <div className="mx-auto max-w-2xl space-y-4">
          {/* Description */}
          {prompt.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {prompt.description}
            </p>
          )}

          {/* Tags */}
          {promptTagObjects.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {promptTagObjects.map((tag) => (
                <TagBadge key={tag.id} tag={tag} />
              ))}
            </div>
          )}

          {/* Variable inputs */}
          <div className="space-y-3 pt-2">
            {/* Undo/Redo/Reset/Fill with AI buttons - top right above fields */}
            {prompt.variables.length > 0 && (
              <div className="flex justify-end gap-1">
                {aiConfigured && onFillWithAI && !showFillAiPanel && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFillAiPanel(true)}
                    className="gap-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    title={t('centerPane.fillWithAI')}
                  >
                    <Sparkles className="h-4 w-4" />
                    {t('centerPane.fillWithAI')}
                  </Button>
                )}
                {onUndo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="gap-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                    title={t('centerPane.undo')}
                  >
                    <Undo2 className="h-4 w-4" />
                    {t('centerPane.undo')}
                  </Button>
                )}
                {onRedo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRedo}
                    disabled={!canRedo}
                    className="gap-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                    title={t('centerPane.redo')}
                  >
                    <Redo2 className="h-4 w-4" />
                    {t('centerPane.redo')}
                  </Button>
                )}
                {onResetForm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onResetForm}
                    className="gap-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    title={t('centerPane.reset')}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t('centerPane.reset')}
                  </Button>
                )}
              </div>
            )}

            {/* Fill with AI Panel */}
            {aiConfigured && onFillWithAI && showFillAiPanel && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('centerPane.fillWithAI')}
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowFillAiPanel(false)}
                  >
                    {t('centerPane.hide')}
                  </Button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {t('centerPane.fillWithAIDescription')}
                </p>
                <Textarea
                  value={fillContext}
                  onChange={(e) => setFillContext(e.target.value)}
                  className="min-h-[120px] text-sm resize-none border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-900"
                  placeholder={t('centerPane.fillContextPlaceholder')}
                />
                <p className="mt-2 font-mono text-[10px] text-gray-400 dark:text-gray-500">
                  {t('centerPane.aiDisclaimer')}
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
                  {isFilling ? t('centerPane.filling') : t('centerPane.fillFields')}
                </Button>
              </div>
            )}

            {prompt.variables.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('centerPane.noVariablesHint')}
              </p>
            ) : (
              prompt.variables.map((variable) => {
                const changeSource = getLastChangeSource?.(variable.key)
                const isAiFilled = changeSource === 'ai_fill' || changeSource === 'ai_refine'
                return (
                  <VariableInputCard
                    key={variable.key}
                    variable={variable}
                    value={values[variable.key]}
                    isActive={activeVariableKey === variable.key}
                    isAiFilled={isAiFilled}
                    onValueChange={(value) => onValueChange(variable.key, value)}
                    onActiveChange={(active) => onActiveVariableChange(active ? variable.key : null)}
                    aiConfigured={aiConfigured}
                    onAiFillClick={() => {
                      setAiFillTargetVariable(variable)
                      setAiFillModalOpen(true)
                    }}
                  />
                )
              })
            )}

            {/* Addons Section - disabled in copy mode, active in run mode */}
            <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
              <AddonsSection />
            </div>
          </div>
          </div>
        </div>
      </ScrollArea>

      {/* Action bar */}
      <div className="shrink-0 px-6 pb-6">
        <div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {/* Status bar - show when there are required variables OR translation is available */}
          {(completionStatus.total > 0 || (featureFlags.translationsEnabled && translationSettings?.enabled && detectedLanguage)) && (
            <div className="flex items-center gap-3 border-b border-gray-100 px-3 py-2 dark:border-gray-700">
              {/* Completion status */}
              {completionStatus.total > 0 && (
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                      <div
                        className={`h-full transition-all duration-300 ${
                          completionStatus.ready
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }`}
                        style={{
                          width: `${(completionStatus.filled / completionStatus.total) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                      {completionStatus.filled}/{completionStatus.total}
                    </span>
                  </div>
                </div>
              )}

              {/* Translation toggle - only show when translation feature and settings are enabled */}
              {featureFlags.translationsEnabled && translationSettings?.enabled && detectedLanguage && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <Languages className="h-4 w-4 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {t('translation:toggle.label', {
                            language: getLanguageInfo(translationSettings.targetLanguage)?.name || translationSettings.targetLanguage
                          })}
                        </span>
                        <Switch
                          checked={translationEnabled}
                          onCheckedChange={setTranslationEnabled}
                          className="scale-75"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {translationEnabled
                          ? t('translation:toggle.enabled')
                          : t('translation:toggle.disabled')}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 p-2">
            {/* Copy button - with dropdown only when translation feature and settings are enabled */}
            {featureFlags.translationsEnabled && translationSettings?.enabled && translationEnabled && detectedLanguage ? (
              <DropdownMenu>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={!canCopy() ? 0 : undefined}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            disabled={!canCopy()}
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                          >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copied
                              ? t('centerPane.copied')
                              : t('translation:copyButton.copyWithTranslation', {
                                  source: getLanguageShortCode(detectedLanguage),
                                  target: getLanguageShortCode(translationSettings.targetLanguage)
                                })}
                            <ChevronUp className="h-3 w-3 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                      </span>
                    </TooltipTrigger>
                    {!canCopy() && (
                      <TooltipContent>
                        <p>{t('centerPane.fillRequiredToContinue')}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent align="start" side="top" className="w-56">
                  <DropdownMenuItem
                    onClick={handleCopy}
                    className="cursor-pointer"
                  >
                    <Languages className="mr-2 h-4 w-4" />
                    <span>
                      {t('translation:copyButton.copyWithTranslation', {
                        source: getLanguageShortCode(detectedLanguage),
                        target: getLanguageShortCode(translationSettings.targetLanguage)
                      })}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleCopyOriginal}
                    className="cursor-pointer"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{t('translation:copyButton.copyOriginal')}</span>
                      <span className="text-xs text-muted-foreground">
                        {t('translation:copyButton.copyOriginalDescription')}
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={!canCopy() ? 0 : undefined}>
                      <Button
                        onClick={handleCopy}
                        disabled={!canCopy()}
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? t('centerPane.copied') : t('centerPane.copyPrompt')}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canCopy() && (
                    <TooltipContent>
                      <p>{t('centerPane.fillRequiredToContinue')}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}

            <div className="flex-1" />

            {/* Launcher buttons - only show configured quick launch options */}
            <div className="flex items-center gap-1.5">
              {defaultLaunchers.map((launcher) => (
                <Button
                  key={launcher.id}
                  onClick={() => handleOpenInApp(launcher)}
                  disabled={!canCopy()}
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                >
                  {launcher.name}
                  <ExternalLink className="h-4 w-4" />
                </Button>
              ))}

              {/* All launchers menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!canCopy()}
                    size="sm"
                    className="px-2"
                    aria-label="More launch options"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>{t('centerPane.launchIn')}</DropdownMenuLabel>
                  {AVAILABLE_LAUNCHERS.map((launcher) => (
                    <DropdownMenuItem
                      key={launcher.id}
                      onClick={() => handleOpenInApp(launcher)}
                      className="cursor-pointer"
                    >
                      <span>{launcher.name}</span>
                      <ExternalLink className="ml-auto h-4 w-4 opacity-50" />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* AI Fill Field Modal */}
      <AiFillFieldModal
        open={aiFillModalOpen}
        onOpenChange={setAiFillModalOpen}
        variable={aiFillTargetVariable}
        otherVariables={prompt.variables.filter(v => v.key !== aiFillTargetVariable?.key)}
        currentValues={values}
        onGenerate={(value) => {
          if (aiFillTargetVariable) {
            onValueChange(aiFillTargetVariable.key, value)
          }
        }}
      />

      {/* Translation Preview Modal - lazy loaded, only when translations feature enabled */}
      {featureFlags.translationsEnabled && translationSettings && detectedLanguage && showTranslationPreview && (
        <Suspense fallback={null}>
          <TranslationPreview
            isOpen={showTranslationPreview}
            onClose={() => {
              setShowTranslationPreview(false)
              setPendingLauncher(null)
              setTranslationResult(null)
              setTranslationError(null)
            }}
            originalText={getInterpolatedContent()}
            sourceLanguage={detectedLanguage}
            targetLanguage={translationSettings.targetLanguage}
            translationResult={translationResult}
            isTranslating={isTranslating}
            translationError={translationError}
            onRegenerate={() => handleTranslate(true)}
            onCopyOriginal={handleTranslationCopyOriginal}
            onCopyTranslated={handleTranslationCopyTranslated}
            onLaunch={handleTranslationLaunch}
            launchers={AVAILABLE_LAUNCHERS.map(l => l.name)}
          />
        </Suspense>
      )}
    </div>
  )
}
