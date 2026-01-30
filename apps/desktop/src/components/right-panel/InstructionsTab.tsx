import { useTranslation } from 'react-i18next'
import type { PromptFile, Variable } from '@/types/prompt'
import { ScrollArea } from '@/components/ui/scroll-area'
import { VariableConfig } from '@/components/VariableConfig'

interface InstructionsTabProps {
  prompt: PromptFile | null
  values: Record<string, unknown>
  activeVariableKey: string | null
  isEditMode?: boolean
  onValueChange: (key: string, value: unknown) => void
  onActiveVariableChange: (key: string | null) => void
  onVariableUpdate?: (variable: Variable) => void
  onVariableMove?: (fromIndex: number, toIndex: number) => void
}

export function InstructionsTab({
  prompt,
  values,
  activeVariableKey,
  isEditMode = false,
  onValueChange,
  onActiveVariableChange,
  onVariableUpdate,
  onVariableMove,
}: InstructionsTabProps) {
  const { t } = useTranslation(['prompts'])

  if (!prompt || !prompt.isValid) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('prompts:instructionsTab.noPromptSelected')}
        </p>
      </div>
    )
  }

  if (prompt.variables.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-center text-gray-500 dark:text-gray-400">
          {t('prompts:instructionsTab.noVariables')}<br />
          {t('prompts:instructionsTab.addVariablesHint')}
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {prompt.variables.map((variable, index) => (
          <VariableConfig
            key={variable.key}
            variable={variable}
            value={values[variable.key]}
            isEditMode={isEditMode}
            isActive={activeVariableKey === variable.key}
            onValueChange={(value) => onValueChange(variable.key, value)}
            onVariableUpdate={onVariableUpdate || (() => {})}
            onActiveChange={(active) => onActiveVariableChange(active ? variable.key : null)}
            onMoveUp={onVariableMove ? () => onVariableMove(index, index - 1) : undefined}
            onMoveDown={onVariableMove ? () => onVariableMove(index, index + 1) : undefined}
            isFirst={index === 0}
            isLast={index === prompt.variables.length - 1}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
