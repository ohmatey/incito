import type { PromptFile, Variable } from '@/types/prompt'
import { ScrollArea } from '@/components/ui/scroll-area'
import { VariableConfig } from './VariableConfig'

interface VariablesPanelProps {
  prompt: PromptFile | null
  values: Record<string, unknown>
  isEditMode: boolean
  onValueChange: (key: string, value: unknown) => void
  onVariableUpdate: (variable: Variable) => void
  activeVariableKey: string | null
  onActiveVariableChange: (key: string | null) => void
  onVariablesReorder?: (variables: Variable[]) => void
}

export function VariablesPanel({
  prompt,
  values,
  isEditMode,
  onValueChange,
  onVariableUpdate,
  activeVariableKey,
  onActiveVariableChange,
  onVariablesReorder,
}: VariablesPanelProps) {
  function handleMoveUp(index: number) {
    if (!prompt || index === 0 || !onVariablesReorder) return
    const newVars = [...prompt.variables]
    ;[newVars[index - 1], newVars[index]] = [newVars[index], newVars[index - 1]]
    onVariablesReorder(newVars)
  }

  function handleMoveDown(index: number) {
    if (!prompt || index === prompt.variables.length - 1 || !onVariablesReorder) return
    const newVars = [...prompt.variables]
    ;[newVars[index], newVars[index + 1]] = [newVars[index + 1], newVars[index]]
    onVariablesReorder(newVars)
  }
  if (!prompt) {
    return (
      <div className="flex h-full flex-1 flex-col bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select a prompt to view instructions
          </p>
        </div>
      </div>
    )
  }

  if (!prompt.isValid) {
    return (
      <div className="flex h-full flex-1 flex-col bg-gray-100 dark:bg-gray-900">
        <div className="flex-1 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Instructions
          </h2>
          <p className="text-sm text-red-500 dark:text-red-400">
            Cannot load variables - frontmatter error
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-500 dark:text-gray-400">
            {prompt.errors.map((error, i) => (
              <li key={i}>
                {error.field}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-gray-100 dark:bg-gray-900">
      <ScrollArea className="flex-1">
        <div className="p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Instructions
          </h2>
          <div className="space-y-4">
            {prompt.variables.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No variables defined. Add {"{{variableName}}"} in the template.
              </p>
            ) : (
              prompt.variables.map((variable, index) => (
                <VariableConfig
                  key={variable.key}
                  variable={variable}
                  value={values[variable.key]}
                  isEditMode={isEditMode}
                  isActive={activeVariableKey === variable.key}
                  onValueChange={(value) => onValueChange(variable.key, value)}
                  onVariableUpdate={onVariableUpdate}
                  onActiveChange={(active) => onActiveVariableChange(active ? variable.key : null)}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                  isFirst={index === 0}
                  isLast={index === prompt.variables.length - 1}
                />
              ))
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
