import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { Variable } from '@/types/prompt'

interface PromptTemplateEditorProps {
  name: string
  description: string
  template: string
  variables: Variable[]
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
  onTemplateChange: (template: string) => void
}

export function PromptTemplateEditor({
  name,
  description,
  template,
  variables,
  onNameChange,
  onDescriptionChange,
  onTemplateChange,
}: PromptTemplateEditorProps) {
  const { t } = useTranslation('customRun')

  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="prompt-name" className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {t('editor.name')}
        </Label>
        <Input
          id="prompt-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t('editor.namePlaceholder')}
          className="h-8"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="prompt-description" className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {t('editor.description')}
        </Label>
        <Input
          id="prompt-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t('editor.descriptionPlaceholder')}
          className="h-8"
        />
      </div>

      {/* Template */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="prompt-template" className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {t('editor.template')}
          </Label>
          {variables.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('editor.variablesCount', { count: variables.length })}
            </span>
          )}
        </div>
        <Textarea
          id="prompt-template"
          value={template}
          onChange={(e) => onTemplateChange(e.target.value)}
          placeholder={t('editor.templatePlaceholder')}
          className="min-h-[200px] font-mono text-sm"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('editor.templateHint')}
        </p>
      </div>

      {/* Variables preview */}
      {variables.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {t('editor.detectedVariables')}
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {variables.map((v) => (
              <span
                key={v.key}
                className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {`{{${v.key}}}`}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
