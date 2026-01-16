import type { Variable } from '@/types/prompt'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface VariableConfigProps {
  variable: Variable
  value: unknown
  isEditMode: boolean
  isActive: boolean
  onValueChange: (value: unknown) => void
  onVariableUpdate: (variable: Variable) => void
  onActiveChange: (active: boolean) => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  isFirst?: boolean
  isLast?: boolean
}

export function VariableConfig({
  variable,
  value,
  isEditMode,
  isActive,
  onValueChange,
  onVariableUpdate,
  onActiveChange,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
}: VariableConfigProps) {
  function handleTypeChange(newType: Variable['type']) {
    onVariableUpdate({
      ...variable,
      type: newType,
      default: undefined,
    })
  }

  function handleDefaultChange(newDefault: string) {
    let parsedDefault: string | number | undefined = newDefault

    if (variable.type === 'number' && newDefault !== '') {
      parsedDefault = Number(newDefault)
    }

    if (newDefault === '') {
      parsedDefault = undefined
    }

    onVariableUpdate({
      ...variable,
      default: parsedDefault,
    })
  }

  function handleLabelChange(newLabel: string) {
    onVariableUpdate({
      ...variable,
      label: newLabel,
    })
  }

  function handleDescriptionChange(newDescription: string) {
    onVariableUpdate({
      ...variable,
      description: newDescription || undefined,
    })
  }

  function toggleDescription() {
    if (variable.description !== undefined) {
      // Remove description
      onVariableUpdate({
        ...variable,
        description: undefined,
      })
    } else {
      // Add empty description to enable the field
      onVariableUpdate({
        ...variable,
        description: '',
      })
    }
  }

  function renderInput() {
    const id = `var-${variable.key}`
    const focusHandlers = {
      onFocus: () => onActiveChange(true),
      onBlur: () => onActiveChange(false),
    }

    switch (variable.type) {
      case 'textarea':
        return (
          <textarea
            id={id}
            value={(value as string) ?? ''}
            placeholder={variable.placeholder || `Enter ${variable.label.toLowerCase()}...`}
            onChange={(e) => onValueChange(e.target.value)}
            {...focusHandlers}
            className="flex min-h-[60px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500 disabled:cursor-not-allowed disabled:opacity-50 resize-y dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        )
      case 'number':
        return (
          <Input
            id={id}
            type="number"
            value={(value as number) ?? ''}
            placeholder={variable.placeholder || '0'}
            onChange={(e) => onValueChange(e.target.value ? Number(e.target.value) : '')}
            {...focusHandlers}
          />
        )
      case 'text':
      default:
        return (
          <Input
            id={id}
            type="text"
            value={(value as string) ?? ''}
            placeholder={variable.placeholder || `Enter ${variable.label.toLowerCase()}...`}
            onChange={(e) => onValueChange(e.target.value)}
            {...focusHandlers}
          />
        )
    }
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-white shadow-sm transition-all duration-150 dark:bg-gray-800',
        isActive
          ? 'border-secondary-300 ring-1 ring-secondary-200 dark:border-secondary-600 dark:ring-secondary-900'
          : 'border-gray-200 dark:border-gray-700'
      )}
      onMouseEnter={() => !isEditMode && onActiveChange(true)}
      onMouseLeave={() => !isEditMode && onActiveChange(false)}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-700">
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
              {variable.label}
              {variable.required && <span className="text-secondary-500 ml-1">*</span>}
            </span>
            {isEditMode && (
              <span className="ml-2 text-xs font-mono text-gray-400 dark:text-gray-500">
                {`{{${variable.key}}}`}
              </span>
            )}
          </div>
          {variable.description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 italic">
              {variable.description}
            </p>
          )}
        </div>
        {isEditMode && (
          <div className="flex items-center gap-0.5 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={isFirst}
              onClick={onMoveUp}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={isLast}
              onClick={onMoveDown}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-3">
        {isEditMode ? (
          // Edit mode: Show settings
          <div className="space-y-3">
            {/* Settings row */}
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Label</Label>
                <Input
                  value={variable.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="Label"
                  className="h-8 text-sm"
                />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Type</Label>
                <Select value={variable.type} onValueChange={handleTypeChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="textarea">Text Area</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Default</Label>
                {variable.type === 'number' ? (
                  <Input
                    type="number"
                    value={variable.default as number ?? ''}
                    onChange={(e) => handleDefaultChange(e.target.value)}
                    placeholder="Default"
                    className="h-8 text-sm"
                  />
                ) : (
                  <Input
                    type="text"
                    value={variable.default as string ?? ''}
                    onChange={(e) => handleDefaultChange(e.target.value)}
                    placeholder="Default"
                    className="h-8 text-sm"
                  />
                )}
              </div>
            </div>
            {/* Description toggle and field */}
            <div className="pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`desc-toggle-${variable.key}`}
                  checked={variable.description !== undefined}
                  onCheckedChange={toggleDescription}
                />
                <Label
                  htmlFor={`desc-toggle-${variable.key}`}
                  className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer"
                >
                  Add description
                </Label>
              </div>
              {variable.description !== undefined && (
                <Textarea
                  value={variable.description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="Add helpful context or instructions for this field..."
                  className="mt-2 min-h-[60px] text-sm resize-y"
                />
              )}
            </div>
          </div>
        ) : (
          // Preview mode: Show input only
          renderInput()
        )}
      </div>
    </div>
  )
}
