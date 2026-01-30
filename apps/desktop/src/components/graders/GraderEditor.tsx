import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AssertionForm } from './AssertionForm'
import { LLMJudgeForm } from './LLMJudgeForm'
import { Save, X, Code, Brain } from 'lucide-react'
import type { Grader, AssertionGrader, LLMJudgeGrader, AssertionLogic, LLMJudgeConfig } from '@/types/grader'
import { isAssertionGrader } from '@/types/grader'

interface GraderEditorProps {
  grader: Grader
  onSave: (grader: Grader) => void
  onCancel: () => void
}

export function GraderEditor({ grader, onSave, onCancel }: GraderEditorProps) {
  const { t } = useTranslation('graders')
  const isAssertion = isAssertionGrader(grader)

  const [name, setName] = useState(grader.name)
  const [description, setDescription] = useState(grader.description || '')
  const [enabled, setEnabled] = useState(grader.enabled)
  const [logic, setLogic] = useState<AssertionLogic>(
    isAssertion ? (grader as AssertionGrader).logic : { operator: 'contains', value: '' }
  )
  const [config, setConfig] = useState<LLMJudgeConfig>(
    !isAssertion
      ? (grader as LLMJudgeGrader).config
      : { providerId: null, promptTemplate: '', outputSchema: 'score_1_to_5' }
  )

  function handleSave() {
    if (!name.trim()) return

    if (isAssertion) {
      const updated: AssertionGrader = {
        ...(grader as AssertionGrader),
        name: name.trim(),
        description: description.trim() || undefined,
        enabled,
        logic,
      }
      onSave(updated)
    } else {
      const updated: LLMJudgeGrader = {
        ...(grader as LLMJudgeGrader),
        name: name.trim(),
        description: description.trim() || undefined,
        enabled,
        config,
      }
      onSave(updated)
    }
  }

  const canSave = name.trim() && (
    isAssertion
      ? (logic.operator === 'json_valid' || String(logic.value).trim())
      : config.promptTemplate.trim()
  )

  return (
    <div className="flex h-full flex-1 flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
            {isAssertion ? (
              <Code className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('detail.edit')} - {grader.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isAssertion ? t('badge.assertion') : t('badge.llmJudge')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            {t('common:buttons.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            <Save className="mr-2 h-4 w-4" />
            {t('common:buttons.save')}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6 max-w-2xl">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('create.nameLabel')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('create.namePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('create.descriptionLabel')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('create.descriptionPlaceholder')}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div>
                <Label htmlFor="enabled" className="text-sm font-medium">
                  {enabled ? t('detail.enabled') : t('detail.disabled')}
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {enabled ? 'This grader will run during evaluations' : 'This grader is currently disabled'}
                </p>
              </div>
              <Switch
                id="enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>
          </div>

          {/* Type-specific Configuration */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {isAssertion ? t('assertion.title') : t('llmJudge.title')}
            </h3>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              {isAssertion ? (
                <AssertionForm logic={logic} onChange={setLogic} />
              ) : (
                <LLMJudgeForm config={config} onChange={setConfig} />
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
