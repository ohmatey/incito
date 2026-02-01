import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Save, Info, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { RatingInput } from './RatingInput'
import { PassFailToggle } from './PassFailToggle'
import { NotesInput } from './NotesInput'
import { FeedbackTagsInput } from './FeedbackTagsInput'
import { getRunFeedback, saveRunFeedback } from '@/lib/store'
import type { FeedbackFormData, RunFeedback } from '@/types/feedback'
import type {
  HumanFeedbackConfig,
  RatingFeedbackConfig,
  PassFailFeedbackConfig,
  NotesFeedbackConfig,
  TagsFeedbackConfig,
} from '@/types/prompt-config'
import { formatRelativeTime } from '@/lib/run-history'

interface FeedbackFormProps {
  runId: string
  config: HumanFeedbackConfig
  onSave?: () => void
  /** Called when user wants to create a playbook rule from negative feedback */
  onCreateRule?: () => void
  /** Whether the playbooks feature is enabled */
  playbooksEnabled?: boolean
}

export function FeedbackForm({ runId, config, onSave, onCreateRule, playbooksEnabled = false }: FeedbackFormProps) {
  const { t } = useTranslation(['runs', 'playbooks'])
  const [feedback, setFeedback] = useState<FeedbackFormData>({})
  const [, setExistingFeedback] = useState<RunFeedback | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  // Get config for each feedback type
  const ratingConfig = config.feedbackTypes.find((ft) => ft.type === 'rating') as RatingFeedbackConfig | undefined
  const passFailConfig = config.feedbackTypes.find((ft) => ft.type === 'passFail') as PassFailFeedbackConfig | undefined
  const notesConfig = config.feedbackTypes.find((ft) => ft.type === 'notes') as NotesFeedbackConfig | undefined
  const tagsConfig = config.feedbackTypes.find((ft) => ft.type === 'tags') as TagsFeedbackConfig | undefined

  // Load existing feedback on mount
  useEffect(() => {
    loadFeedback()
    startTimeRef.current = Date.now()
  }, [runId])

  async function loadFeedback() {
    setIsLoading(true)
    const result = await getRunFeedback(runId)
    if (result.ok && result.data) {
      setExistingFeedback(result.data)
      setFeedback({
        rating: result.data.rating,
        passFail: result.data.passFail,
        notes: result.data.notes,
        tags: result.data.tags,
      })
      setLastSaved(result.data.updatedAt)
    }
    setIsLoading(false)
  }

  // Save feedback
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const timeSpentMs = Date.now() - startTimeRef.current
      const result = await saveRunFeedback(runId, feedback, timeSpentMs)
      if (result.ok) {
        setExistingFeedback(result.data)
        setLastSaved(result.data.updatedAt)
        toast.success(t('feedback.saved'))
        onSave?.()
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }, [runId, feedback, t, onSave])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Check if we're in an input/textarea
      const target = e.target as HTMLElement
      const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

      // Ctrl+S / Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
        return
      }

      // Don't process other shortcuts if in input
      if (isInInput) return

      // Number keys 1-5 for rating
      if (ratingConfig && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const num = parseInt(e.key)
        if (!isNaN(num) && num >= 1 && num <= ratingConfig.scale) {
          e.preventDefault()
          setFeedback((prev) => ({ ...prev, rating: num }))
          return
        }
      }

      // P for pass, F for fail
      if (passFailConfig && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key.toLowerCase() === 'p') {
          e.preventDefault()
          setFeedback((prev) => ({ ...prev, passFail: 'pass' }))
          return
        }
        if (e.key.toLowerCase() === 'f') {
          e.preventDefault()
          setFeedback((prev) => ({ ...prev, passFail: 'fail' }))
          return
        }
      }

      // N to focus notes
      if (notesConfig && e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        const notesTextarea = document.querySelector('[data-feedback-notes]') as HTMLTextAreaElement
        notesTextarea?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, ratingConfig, passFailConfig, notesConfig])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center" role="status" aria-label={t('common:labels.loading', 'Loading')}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Instructions */}
          {config.instructions && (
            <div className="flex gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-700 dark:text-blue-300">
              <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <p>{config.instructions}</p>
            </div>
          )}

          {/* Rating */}
          {ratingConfig && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('feedback.rating.title')}
              </Label>
              <RatingInput
                value={feedback.rating}
                onChange={(rating) => setFeedback((prev) => ({ ...prev, rating }))}
                scale={ratingConfig.scale}
                minLabel={ratingConfig.minLabel}
                maxLabel={ratingConfig.maxLabel}
              />
            </div>
          )}

          {/* Pass/Fail */}
          {passFailConfig && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('feedback.passFail.title')}
              </Label>
              <PassFailToggle
                value={feedback.passFail}
                onChange={(passFail) => setFeedback((prev) => ({ ...prev, passFail }))}
                passLabel={passFailConfig.passLabel}
                failLabel={passFailConfig.failLabel}
              />
            </div>
          )}

          {/* Notes */}
          {notesConfig && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('feedback.notes.title')}
                {notesConfig.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <div data-feedback-notes>
                <NotesInput
                  value={feedback.notes}
                  onChange={(notes) => setFeedback((prev) => ({ ...prev, notes }))}
                  placeholder={notesConfig.placeholder}
                  required={notesConfig.required}
                />
              </div>
            </div>
          )}

          {/* Tags */}
          {tagsConfig && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('feedback.tags.title')}
              </Label>
              <FeedbackTagsInput
                value={feedback.tags}
                onChange={(tags) => setFeedback((prev) => ({ ...prev, tags }))}
                options={tagsConfig.options}
              />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Save Footer */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 space-y-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full gap-2"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          {isSaving ? t('runs:feedback.saving') : t('runs:feedback.save')}
        </Button>

        {/* Create Rule from Feedback - show when feedback is negative and playbooks enabled */}
        {playbooksEnabled && onCreateRule && isNegativeFeedback(feedback, ratingConfig) && (
          <Button
            variant="outline"
            onClick={onCreateRule}
            className="w-full gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-900 dark:hover:bg-blue-900/20"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {t('playbooks:rules.createFromFeedback')}
          </Button>
        )}

        {lastSaved && (
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            {t('runs:feedback.lastSaved', { time: formatRelativeTime(lastSaved) })}
          </p>
        )}

        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          {t('runs:feedback.keyboardHints')}
        </p>
      </div>
    </div>
  )
}

/**
 * Determine if feedback is "negative" - failed or low rating
 */
function isNegativeFeedback(
  feedback: FeedbackFormData,
  ratingConfig?: RatingFeedbackConfig
): boolean {
  // If passFail is 'fail', it's negative
  if (feedback.passFail === 'fail') {
    return true
  }

  // If rating is below midpoint (e.g., 1-2 out of 5), it's negative
  if (feedback.rating !== undefined && ratingConfig) {
    const midpoint = Math.ceil(ratingConfig.scale / 2)
    if (feedback.rating < midpoint) {
      return true
    }
  }

  return false
}
