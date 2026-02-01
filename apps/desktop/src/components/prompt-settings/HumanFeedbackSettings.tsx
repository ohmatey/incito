import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Plus } from 'lucide-react'
import type {
  HumanFeedbackConfig,
  FeedbackTypeConfig,
  RatingFeedbackConfig,
  PassFailFeedbackConfig,
  NotesFeedbackConfig,
  TagsFeedbackConfig,
} from '@/types/prompt-config'
import { getDefaultHumanFeedbackConfig } from '@/types/prompt-config'

interface HumanFeedbackSettingsProps {
  value: HumanFeedbackConfig | undefined
  onChange: (value: HumanFeedbackConfig) => void
}

export function HumanFeedbackSettings({ value, onChange }: HumanFeedbackSettingsProps) {
  const { t } = useTranslation('prompts')

  const currentValue: HumanFeedbackConfig = value ?? getDefaultHumanFeedbackConfig()

  function handleEnabledChange(enabled: boolean) {
    onChange({
      ...currentValue,
      enabled,
    })
  }

  function handleInstructionsChange(instructions: string) {
    onChange({
      ...currentValue,
      instructions: instructions || undefined,
    })
  }

  function toggleFeedbackType(type: FeedbackTypeConfig['type'], enabled: boolean) {
    const feedbackTypes = [...currentValue.feedbackTypes]

    if (enabled) {
      // Add the feedback type with defaults
      let newType: FeedbackTypeConfig
      switch (type) {
        case 'rating':
          newType = { type: 'rating', scale: 5, minLabel: 'Poor', maxLabel: 'Excellent' }
          break
        case 'passFail':
          newType = { type: 'passFail', passLabel: 'Pass', failLabel: 'Fail' }
          break
        case 'notes':
          newType = { type: 'notes', required: false, placeholder: 'Add observations...' }
          break
        case 'tags':
          newType = { type: 'tags', options: ['Good quality', 'Needs improvement', 'Factual error', 'Tone issue'] }
          break
      }
      feedbackTypes.push(newType)
    } else {
      // Remove the feedback type
      const index = feedbackTypes.findIndex((ft) => ft.type === type)
      if (index !== -1) {
        feedbackTypes.splice(index, 1)
      }
    }

    onChange({
      ...currentValue,
      feedbackTypes,
    })
  }

  function updateFeedbackType<T extends FeedbackTypeConfig>(
    type: T['type'],
    updates: Partial<T>
  ) {
    const feedbackTypes = currentValue.feedbackTypes.map((ft) => {
      if (ft.type === type) {
        return { ...ft, ...updates }
      }
      return ft
    })

    onChange({
      ...currentValue,
      feedbackTypes,
    })
  }

  function hasType(type: FeedbackTypeConfig['type']): boolean {
    return currentValue.feedbackTypes.some((ft) => ft.type === type)
  }

  function getTypeConfig<T extends FeedbackTypeConfig>(type: T['type']): T | undefined {
    return currentValue.feedbackTypes.find((ft) => ft.type === type) as T | undefined
  }

  const ratingConfig = getTypeConfig<RatingFeedbackConfig>('rating')
  const passFailConfig = getTypeConfig<PassFailFeedbackConfig>('passFail')
  const notesConfig = getTypeConfig<NotesFeedbackConfig>('notes')
  const tagsConfig = getTypeConfig<TagsFeedbackConfig>('tags')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {t('settings.humanFeedback.title')}
        </h3>
        <div className="flex items-center gap-2">
          <Checkbox
            id="feedback-enabled"
            checked={currentValue.enabled}
            onCheckedChange={handleEnabledChange}
          />
          <Label
            htmlFor="feedback-enabled"
            className="text-sm font-normal text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            {t('settings.humanFeedback.enabled')}
          </Label>
        </div>
      </div>

      {currentValue.enabled && (
        <div className="space-y-4 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
          {/* Feedback Types */}
          <div className="space-y-3">
            <Label className="text-sm text-gray-700 dark:text-gray-300">
              {t('settings.humanFeedback.feedbackTypes')}
            </Label>

            {/* Rating */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="type-rating"
                  checked={hasType('rating')}
                  onCheckedChange={(checked) => toggleFeedbackType('rating', !!checked)}
                />
                <Label
                  htmlFor="type-rating"
                  className="text-sm font-normal text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  {t('settings.humanFeedback.rating.label')}
                </Label>
              </div>
              {ratingConfig && (
                <div className="ml-6 grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">{t('settings.humanFeedback.rating.scale')}</Label>
                    <Select
                      value={String(ratingConfig.scale)}
                      onValueChange={(v) => updateFeedbackType('rating', { scale: parseInt(v) as 5 | 10 })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">{t('settings.humanFeedback.rating.scale5')}</SelectItem>
                        <SelectItem value="10">{t('settings.humanFeedback.rating.scale10')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">{t('settings.humanFeedback.rating.minLabel')}</Label>
                    <Input
                      className="h-8 text-xs"
                      value={ratingConfig.minLabel ?? ''}
                      onChange={(e) => updateFeedbackType('rating', { minLabel: e.target.value })}
                      placeholder="Poor"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">{t('settings.humanFeedback.rating.maxLabel')}</Label>
                    <Input
                      className="h-8 text-xs"
                      value={ratingConfig.maxLabel ?? ''}
                      onChange={(e) => updateFeedbackType('rating', { maxLabel: e.target.value })}
                      placeholder="Excellent"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Pass/Fail */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="type-passfail"
                  checked={hasType('passFail')}
                  onCheckedChange={(checked) => toggleFeedbackType('passFail', !!checked)}
                />
                <Label
                  htmlFor="type-passfail"
                  className="text-sm font-normal text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  {t('settings.humanFeedback.passFail.label')}
                </Label>
              </div>
              {passFailConfig && (
                <div className="ml-6 grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">{t('settings.humanFeedback.passFail.passLabel')}</Label>
                    <Input
                      className="h-8 text-xs"
                      value={passFailConfig.passLabel ?? ''}
                      onChange={(e) => updateFeedbackType('passFail', { passLabel: e.target.value })}
                      placeholder="Pass"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">{t('settings.humanFeedback.passFail.failLabel')}</Label>
                    <Input
                      className="h-8 text-xs"
                      value={passFailConfig.failLabel ?? ''}
                      onChange={(e) => updateFeedbackType('passFail', { failLabel: e.target.value })}
                      placeholder="Fail"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="type-notes"
                  checked={hasType('notes')}
                  onCheckedChange={(checked) => toggleFeedbackType('notes', !!checked)}
                />
                <Label
                  htmlFor="type-notes"
                  className="text-sm font-normal text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  {t('settings.humanFeedback.notes.label')}
                </Label>
              </div>
              {notesConfig && (
                <div className="ml-6 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="notes-required"
                      checked={notesConfig.required ?? false}
                      onCheckedChange={(checked) => updateFeedbackType('notes', { required: !!checked })}
                    />
                    <Label htmlFor="notes-required" className="text-xs text-gray-500 cursor-pointer">
                      {t('settings.humanFeedback.notes.required')}
                    </Label>
                  </div>
                  <div className="flex-1">
                    <Input
                      className="h-8 text-xs"
                      value={notesConfig.placeholder ?? ''}
                      onChange={(e) => updateFeedbackType('notes', { placeholder: e.target.value })}
                      placeholder={t('settings.humanFeedback.notes.placeholder')}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="type-tags"
                  checked={hasType('tags')}
                  onCheckedChange={(checked) => toggleFeedbackType('tags', !!checked)}
                />
                <Label
                  htmlFor="type-tags"
                  className="text-sm font-normal text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  {t('settings.humanFeedback.tags.label')}
                </Label>
              </div>
              {tagsConfig && (
                <div className="ml-6 space-y-2">
                  <Label className="text-xs text-gray-500">{t('settings.humanFeedback.tags.options')}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {tagsConfig.options.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="gap-1 pr-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            const newOptions = tagsConfig.options.filter((_, i) => i !== index)
                            updateFeedbackType('tags', { options: newOptions })
                          }}
                          className="ml-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <AddTagInput
                      onAdd={(tag) => {
                        const newOptions = [...tagsConfig.options, tag]
                        updateFeedbackType('tags', { options: newOptions })
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reviewer Instructions */}
          <div className="space-y-2">
            <Label htmlFor="reviewer-instructions" className="text-sm text-gray-700 dark:text-gray-300">
              {t('settings.humanFeedback.instructions')}
            </Label>
            <Textarea
              id="reviewer-instructions"
              value={currentValue.instructions ?? ''}
              onChange={(e) => handleInstructionsChange(e.target.value)}
              placeholder={t('settings.humanFeedback.instructionsPlaceholder')}
              className="min-h-[60px] resize-none text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface AddTagInputProps {
  onAdd: (tag: string) => void
}

function AddTagInput({ onAdd }: AddTagInputProps) {
  const { t } = useTranslation('prompts')
  const [value, setValue] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  function handleSubmit() {
    if (value.trim()) {
      onAdd(value.trim())
      setValue('')
      setIsEditing(false)
    }
  }

  if (!isEditing) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-6 text-xs gap-1"
        onClick={() => setIsEditing(true)}
      >
        <Plus className="h-3 w-3" />
        {t('settings.humanFeedback.tags.addTag')}
      </Button>
    )
  }

  return (
    <Input
      autoFocus
      className="h-6 w-32 text-xs"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (!value.trim()) {
          setIsEditing(false)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleSubmit()
        } else if (e.key === 'Escape') {
          setValue('')
          setIsEditing(false)
        }
      }}
      placeholder={t('settings.humanFeedback.tags.addTag')}
    />
  )
}

