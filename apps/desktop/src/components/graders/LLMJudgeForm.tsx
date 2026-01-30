import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProviderSelector } from '@/components/ui/ProviderSelector'
import type { LLMJudgeConfig, OutputSchema } from '@/types/grader'
import { OUTPUT_SCHEMAS } from '@/types/grader'

interface LLMJudgeFormProps {
  config: LLMJudgeConfig
  onChange: (config: LLMJudgeConfig) => void
}

export function LLMJudgeForm({ config, onChange }: LLMJudgeFormProps) {
  const { t } = useTranslation('graders')

  return (
    <div className="space-y-4">
      {/* Provider Selection */}
      <div className="space-y-2">
        <Label>{t('llmJudge.providerLabel')}</Label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('llmJudge.providerHint')}
        </p>
        <ProviderSelector
          value={config.providerId}
          onChange={(providerId) => onChange({ ...config, providerId })}
          showDefaultOption={true}
        />
      </div>

      {/* Output Schema */}
      <div className="space-y-2">
        <Label>{t('llmJudge.outputSchemaLabel')}</Label>
        <Select
          value={config.outputSchema}
          onValueChange={(value) => onChange({ ...config, outputSchema: value as OutputSchema })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OUTPUT_SCHEMAS.map((schema) => (
              <SelectItem key={schema.value} value={schema.value}>
                <div>
                  <span>{schema.label}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    {schema.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <Label>{t('llmJudge.systemPromptLabel')}</Label>
        <Textarea
          value={config.systemPrompt || ''}
          onChange={(e) => onChange({ ...config, systemPrompt: e.target.value || undefined })}
          placeholder={t('llmJudge.systemPromptPlaceholder')}
          rows={3}
          className="font-mono text-sm"
        />
      </div>

      {/* Prompt Template */}
      <div className="space-y-2">
        <Label>{t('llmJudge.promptTemplateLabel')}</Label>
        <Textarea
          value={config.promptTemplate}
          onChange={(e) => onChange({ ...config, promptTemplate: e.target.value })}
          placeholder={t('llmJudge.promptTemplatePlaceholder')}
          rows={6}
          className="font-mono text-sm"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Available variables: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{input}}'}</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{output}}'}</code>
        </p>
      </div>
    </div>
  )
}
