import { memo, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Play, Square, Trash2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CustomRunState } from '@/types/custom-run'
import type { Variable } from '@/types/prompt'

interface ExecutionPanelProps {
  state: CustomRunState
  variables: Variable[]
  variableValues: Record<string, unknown>
  onVariableValueChange: (key: string, value: unknown) => void
  onExecute: () => Promise<void>
  onStopExecution: () => void
  onClearOutput: () => void
}

// Memoized variable input to prevent re-renders when other variables change
interface VariableInputProps {
  variable: Variable
  value: unknown
  onChange: (key: string, value: unknown) => void
}

const VariableInput = memo(function VariableInput({
  variable,
  value,
  onChange,
}: VariableInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(variable.key, e.target.value)
    },
    [onChange, variable.key]
  )

  return (
    <div className="space-y-1">
      <Label
        htmlFor={`var-${variable.key}`}
        className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300"
      >
        {variable.label}
        {variable.required && <span className="text-red-500">*</span>}
      </Label>
      {variable.type === 'textarea' ? (
        <Textarea
          id={`var-${variable.key}`}
          value={(value as string) ?? ''}
          onChange={handleChange}
          placeholder={variable.placeholder}
          className="min-h-[60px] text-sm"
        />
      ) : (
        <Input
          id={`var-${variable.key}`}
          type={variable.type === 'number' ? 'number' : 'text'}
          value={(value as string) ?? ''}
          onChange={handleChange}
          placeholder={variable.placeholder}
          className="h-8"
        />
      )}
    </div>
  )
})

export function ExecutionPanel({
  state,
  variables,
  variableValues,
  onVariableValueChange,
  onExecute,
  onStopExecution,
  onClearOutput,
}: ExecutionPanelProps) {
  const { t } = useTranslation('customRun')

  const isRunning = state.executionState === 'running'
  const hasOutput = state.currentOutput.length > 0
  const hasError = state.executionState === 'error'
  const isCompleted = state.executionState === 'completed'

  // Memoize required variable calculations to avoid recalculating on every render
  const { requiredVariables, allRequiredFilled, missingCount } = useMemo(() => {
    const required = variables.filter((v) => v.required)
    const filledCount = required.filter((v) => {
      const value = variableValues[v.key]
      return value !== undefined && value !== '' && value !== null
    }).length
    return {
      requiredVariables: required,
      allRequiredFilled: filledCount === required.length,
      missingCount: required.length - filledCount,
    }
  }, [variables, variableValues])

  const canRun = state.promptTemplate && allRequiredFilled && !isRunning

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-800">
      {/* Variables input section */}
      <div className="shrink-0 border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('execution.variables')}
          </h3>
          {variables.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {requiredVariables.length > 0 && (
                <>
                  {allRequiredFilled ? (
                    <span className="text-green-600 dark:text-green-400">
                      {t('execution.allFilled')}
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">
                      {t('execution.requiredMissing', { count: missingCount })}
                    </span>
                  )}
                </>
              )}
            </span>
          )}
        </div>

        {variables.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('execution.noVariables')}
          </p>
        ) : (
          <ScrollArea className="max-h-48">
            <div className="space-y-3 pr-4">
              {variables.map((variable) => (
                <VariableInput
                  key={variable.key}
                  variable={variable}
                  value={variableValues[variable.key]}
                  onChange={onVariableValueChange}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Run button */}
        <div className="mt-4 flex items-center gap-2">
          {isRunning ? (
            <Button onClick={onStopExecution} variant="destructive" className="gap-2">
              <Square className="h-4 w-4" />
              {t('execution.stop')}
            </Button>
          ) : (
            <Button onClick={onExecute} disabled={!canRun} className="gap-2">
              <Play className="h-4 w-4" />
              {t('execution.run')}
            </Button>
          )}
          {hasOutput && !isRunning && (
            <Button onClick={onClearOutput} variant="outline" size="icon" className="h-9 w-9">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Output section */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('execution.output')}
          </h3>
          <div className="flex items-center gap-2">
            {isRunning && (
              <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t('execution.generating')}
              </span>
            )}
            {isCompleted && (
              <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                {t('execution.completed')}
              </span>
            )}
            {hasError && (
              <span className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="h-3 w-3" />
                {t('execution.error')}
              </span>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            {!hasOutput && !hasError && !isRunning ? (
              <div className="flex h-32 items-center justify-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('execution.noOutput')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Error message */}
                {hasError && state.currentError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {state.currentError}
                    </p>
                  </div>
                )}

                {/* Output content */}
                {(hasOutput || isRunning) && (
                  <div
                    className={cn(
                      'whitespace-pre-wrap rounded-lg border p-4 font-mono text-sm',
                      'border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
                    )}
                  >
                    {state.currentOutput || (isRunning && (
                      <span className="text-gray-400">...</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* History section */}
      {state.runHistory.length > 0 && (
        <div className="shrink-0 border-t border-gray-200 p-4 dark:border-gray-700">
          <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('execution.history')} ({state.runHistory.length})
          </h3>
          <ScrollArea className="max-h-32">
            <div className="space-y-2">
              {state.runHistory.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    'rounded-lg border p-2 text-xs',
                    entry.error
                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {entry.executionTimeMs}ms
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-gray-700 dark:text-gray-300">
                    {entry.error ?? entry.output.slice(0, 100)}
                    {entry.output.length > 100 && '...'}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
