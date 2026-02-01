import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getGrader, updateGrader, deleteGrader, getProviderConfig, getDefaultProviderConfig, type ProviderConfig } from '@/lib/store'
import { GraderEditor } from '@/components/graders/GraderEditor'
import { GraderPlayground } from '@/components/graders/GraderPlayground'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Pencil, Trash2, Loader2, PanelLeft, PanelLeftClose, ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import type { Grader, AssertionGrader, LLMJudgeGrader } from '@/types/grader'
import { isAssertionGrader, ASSERTION_OPERATORS, OUTPUT_SCHEMAS } from '@/types/grader'
import { useLayout } from '@/context/LayoutContext'
import { cn } from '@/lib/utils'

export function GraderDetail() {
  const { graderId } = useParams({ from: '/graders/$graderId' })
  const navigate = useNavigate()
  const { t } = useTranslation(['graders', 'settings'])
  const { listPanelCollapsed, toggleListPanelCollapsed } = useLayout()

  const [grader, setGrader] = useState<Grader | null>(null)
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const loadProviderConfig = useCallback(async (providerId: string | null) => {
    if (providerId) {
      const result = await getProviderConfig(providerId)
      if (result.ok && result.data) {
        setProviderConfig(result.data)
        return
      }
    }
    // Fall back to default provider
    const defaultResult = await getDefaultProviderConfig()
    if (defaultResult.ok && defaultResult.data) {
      setProviderConfig(defaultResult.data)
    } else {
      setProviderConfig(null)
    }
  }, [])

  useEffect(() => {
    loadGrader()
  }, [graderId])

  async function loadGrader() {
    setIsLoading(true)
    const result = await getGrader(graderId)
    if (result.ok && result.data) {
      setGrader(result.data)
      // Load provider config for LLM Judge graders
      if (!isAssertionGrader(result.data)) {
        await loadProviderConfig(result.data.config.providerId)
      }
    } else {
      setGrader(null)
    }
    setIsLoading(false)
  }

  async function handleToggleEnabled() {
    if (!grader) return
    const result = await updateGrader(grader.id, { enabled: !grader.enabled })
    if (result.ok) {
      setGrader({ ...grader, enabled: !grader.enabled })
      toast.success(t('success.updated'))
    } else {
      toast.error(t('errors.updateFailed'))
    }
  }

  async function handleDelete() {
    if (!grader) return
    setIsDeleting(true)
    const result = await deleteGrader(grader.id)
    if (result.ok) {
      toast.success(t('success.deleted'))
      navigate({ to: '/graders' })
    } else {
      toast.error(t('errors.deleteFailed'))
    }
    setIsDeleting(false)
    setShowDeleteDialog(false)
  }

  async function handleSave(updatedGrader: Grader) {
    const updates: Record<string, unknown> = {
      name: updatedGrader.name,
      description: updatedGrader.description,
      enabled: updatedGrader.enabled,
    }

    if (isAssertionGrader(updatedGrader)) {
      updates.logic = updatedGrader.logic
    } else {
      updates.config = updatedGrader.config
    }

    const result = await updateGrader(updatedGrader.id, updates as Parameters<typeof updateGrader>[1])
    if (result.ok) {
      setGrader(updatedGrader)
      setIsEditMode(false)
      toast.success(t('success.updated'))
    } else {
      toast.error(t('errors.updateFailed'))
    }
  }

  // Generate plain-English summary for the grader
  function getSummary(): string {
    if (!grader) return ''

    if (isAssertionGrader(grader)) {
      const assertionGrader = grader as AssertionGrader
      const operator = assertionGrader.logic.operator
      const value = String(assertionGrader.logic.value)

      // Use i18n translations for summaries
      return t(`detail.summary.${operator}`, { value })
    } else {
      return t('detail.summary.llm_judge')
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!grader) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 bg-gray-50 px-8 text-center dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Check not found
        </p>
        <button
          onClick={() => navigate({ to: '/graders' })}
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          Back to Quality Checks
        </button>
      </div>
    )
  }

  if (isEditMode) {
    return (
      <GraderEditor
        grader={grader}
        onSave={handleSave}
        onCancel={() => setIsEditMode(false)}
      />
    )
  }

  const isAssertion = isAssertionGrader(grader)
  const assertionGrader = grader as AssertionGrader
  const llmJudgeGrader = grader as LLMJudgeGrader

  return (
    <div className="flex h-full flex-1 flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header - Simplified: removed type badge, kept active toggle */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleListPanelCollapsed}
            className="h-8 w-8"
          >
            {listPanelCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {grader.name}
              </h1>
              {grader.isBuiltin && (
                <Badge variant="secondary" className="text-xs">
                  {t('detail.builtinBadge')}
                </Badge>
              )}
              {/* Show AI badge for LLM judges */}
              {!isAssertion && (
                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 gap-1">
                  <Sparkles className="h-3 w-3" />
                  {t('badge.usesAi')}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-2",
            !grader.isBuiltin && "pr-2 border-r border-gray-200 dark:border-gray-700"
          )}>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {grader.enabled ? t('detail.enabled') : t('detail.disabled')}
            </span>
            <Switch
              checked={grader.enabled}
              onCheckedChange={handleToggleEnabled}
            />
          </div>
          {!grader.isBuiltin && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditMode(true)}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                {t('detail.edit')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
                {t('detail.delete')}
              </Button>
            </>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Plain-English Summary - Prominent at top */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-base text-gray-700 dark:text-gray-300">
              {getSummary()}
            </p>
            {grader.description && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {grader.description}
              </p>
            )}
          </div>

          {/* Advanced Settings - Collapsed by default */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              {showAdvanced ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {showAdvanced ? t('detail.hideAdvanced') : t('detail.showAdvanced')}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {isAssertion ? t('assertion.title') : t('llmJudge.title')}
                </h3>
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  {isAssertion ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t('assertion.operatorLabel')}:
                        </span>
                        <Badge variant="outline">
                          {ASSERTION_OPERATORS.find(op => op.value === assertionGrader.logic.operator)?.label || assertionGrader.logic.operator}
                        </Badge>
                      </div>
                      {assertionGrader.logic.operator !== 'json_valid' && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('assertion.valueLabel')}:
                          </span>
                          <code className="rounded bg-gray-100 px-2 py-1 text-sm dark:bg-gray-700">
                            {String(assertionGrader.logic.value)}
                          </code>
                        </div>
                      )}
                      {assertionGrader.logic.caseSensitive && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t('assertion.caseSensitive')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t('llmJudge.providerLabel')}:
                        </span>
                        <Badge variant="outline">
                          {providerConfig ? `${providerConfig.alias} - ${providerConfig.model}` : t('settings:providerSelector.useDefault', { ns: 'settings' })}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t('llmJudge.outputSchemaLabel')}:
                        </span>
                        <Badge variant="outline">
                          {OUTPUT_SCHEMAS.find(s => s.value === llmJudgeGrader.config.outputSchema)?.label || llmJudgeGrader.config.outputSchema}
                        </Badge>
                      </div>
                      {llmJudgeGrader.config.systemPrompt && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('llmJudge.systemPromptLabel')}:
                          </p>
                          <pre className="rounded bg-gray-100 p-3 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {llmJudgeGrader.config.systemPrompt}
                          </pre>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('llmJudge.promptTemplateLabel')}:
                        </p>
                        <pre className="rounded bg-gray-100 p-3 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {llmJudgeGrader.config.promptTemplate}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Playground - Visible by default */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('playground.title')}
            </h3>
            <GraderPlayground grader={grader} />
          </div>
        </div>
      </ScrollArea>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('detail.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('detail.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('detail.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
