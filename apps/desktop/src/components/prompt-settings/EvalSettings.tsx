import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { GraderSelector } from '@/components/graders/GraderSelector'
import type { EvalConfig } from '@/types/prompt-config'

interface EvalSettingsProps {
  value: EvalConfig | undefined
  onChange: (value: EvalConfig) => void
}

export function EvalSettings({ value, onChange }: EvalSettingsProps) {
  const { t } = useTranslation('prompts')

  const currentValue: EvalConfig = value ?? {
    graderIds: [],
    runOnComplete: true,
  }

  function handleGraderIdsChange(graderIds: string[]) {
    onChange({
      ...currentValue,
      graderIds,
    })
  }

  function handleRunOnCompleteChange(runOnComplete: boolean) {
    onChange({
      ...currentValue,
      runOnComplete,
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {t('settings.evals.title')}
      </h3>

      <div className="space-y-4">
        {/* Grader Selection */}
        <div className="space-y-2">
          <Label className="text-sm text-gray-700 dark:text-gray-300">
            {t('settings.evals.activeGraders')}
          </Label>
          <GraderSelector
            selectedIds={currentValue.graderIds}
            onSelectionChange={handleGraderIdsChange}
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
          />
        </div>

        {/* Run on Complete */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="run-on-complete"
            checked={currentValue.runOnComplete ?? true}
            onCheckedChange={handleRunOnCompleteChange}
          />
          <Label
            htmlFor="run-on-complete"
            className="text-sm font-normal text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            {t('settings.evals.runOnComplete')}
          </Label>
        </div>
      </div>
    </div>
  )
}
