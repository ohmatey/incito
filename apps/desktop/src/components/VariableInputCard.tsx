import { useState, useMemo, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Plus, X, AlertCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VariableInputCardProps {
  variable: Variable
  value: unknown
  isActive: boolean
  isAiFilled?: boolean
  onValueChange: (value: unknown) => void
  onActiveChange: (active: boolean) => void
  aiConfigured?: boolean
  onAiFillClick?: () => void
}

export const VariableInputCard = memo(function VariableInputCard({
  variable,
  value,
  isActive,
  isAiFilled,
  onValueChange,
  onActiveChange,
  aiConfigured,
  onAiFillClick,
}: VariableInputCardProps) {
  const { t } = useTranslation('prompts')
  const [arrayInputValue, setArrayInputValue] = useState('')
  const [touched, setTouched] = useState(false)

  // Validation
  const validationError = useMemo(() => {
    if (!variable.required) return null
    if (!touched) return null

    // Check if value is empty
    if (value === undefined || value === null || value === '') {
      return t('variableInput.isRequired', { label: variable.label })
    }

    // Check arrays
    if (Array.isArray(value) && value.length === 0) {
      return t('variableInput.requiresOneItem', { label: variable.label })
    }

    return null
  }, [variable.required, variable.label, value, touched, t])

  const hasError = !!validationError

  // Memoized focus handlers to avoid recreating on every render
  const handleFocus = useCallback(() => onActiveChange(true), [onActiveChange])
  const handleBlur = useCallback(() => {
    onActiveChange(false)
    setTouched(true)
  }, [onActiveChange])

  // Array input handlers
  function handleAddArrayItem() {
    if (!arrayInputValue.trim()) return
    const currentValue = (value as string[]) || []
    onValueChange([...currentValue, arrayInputValue.trim()])
    setArrayInputValue('')
  }

  function handleRemoveArrayItem(index: number) {
    const currentValue = (value as string[]) || []
    onValueChange(currentValue.filter((_, i) => i !== index))
  }

  function handleArrayKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddArrayItem()
    }
  }

  // Multi-select handler
  function handleMultiSelectToggle(optionValue: string) {
    const currentValue = (value as string[]) || []
    if (currentValue.includes(optionValue)) {
      onValueChange(currentValue.filter(v => v !== optionValue))
    } else {
      onValueChange([...currentValue, optionValue])
    }
  }

  function renderInput() {
    const id = `var-${variable.key}`

    switch (variable.type) {
      case 'textarea':
        return (
          <textarea
            id={id}
            value={(value as string) ?? ''}
            placeholder={variable.placeholder || t('variableInput.enterPlaceholder', { label: variable.label.toLowerCase() })}
            onChange={(e) => onValueChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
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
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        )

      case 'slider': {
        const min = variable.min ?? 0
        const max = variable.max ?? 100
        const step = variable.step ?? 1
        const currentValue = typeof value === 'number' ? value : (variable.default as number) ?? min
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Slider
                value={[currentValue]}
                min={min}
                max={max}
                step={step}
                onValueChange={(vals) => onValueChange(vals[0])}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                {currentValue}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{min}</span>
              <span>{max}</span>
            </div>
          </div>
        )
      }

      case 'select': {
        const options = (variable.options || []).filter(opt => opt.value !== '')
        const currentValue = (value as string) ?? ''
        if (options.length === 0) {
          return (
            <Input
              id={id}
              type="text"
              value={currentValue}
              placeholder={variable.placeholder || t('variableInput.noOptionsConfigured')}
              onChange={(e) => onValueChange(e.target.value)}
              onFocus={handleFocus}
            onBlur={handleBlur}
              disabled
              className="bg-gray-50 dark:bg-gray-900"
            />
          )
        }
        return (
          <Select value={currentValue} onValueChange={onValueChange}>
            <SelectTrigger id={id} onFocus={handleFocus}
            onBlur={handleBlur}>
              <SelectValue placeholder={variable.placeholder || t('variableInput.selectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }

      case 'multi-select': {
        const options = (variable.options || []).filter(opt => opt.value !== '')
        const selectedValues = (value as string[]) || []
        return (
          <div className="space-y-2">
            {selectedValues.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedValues.map((val) => {
                  const opt = options.find(o => o.value === val)
                  return (
                    <span
                      key={val}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-700 dark:bg-secondary-900 dark:text-secondary-300"
                    >
                      {opt?.label || val}
                      <button
                        type="button"
                        onClick={() => handleMultiSelectToggle(val)}
                        aria-label={`Remove ${opt?.label || val}`}
                        className="hover:text-secondary-900 dark:hover:text-secondary-100"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
            <div className="space-y-1">
              {options.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${id}-${opt.value}`}
                    checked={selectedValues.includes(opt.value)}
                    onCheckedChange={() => handleMultiSelectToggle(opt.value)}
                  />
                  <Label
                    htmlFor={`${id}-${opt.value}`}
                    className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
                  >
                    {opt.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )
      }

      case 'array': {
        const items = (value as string[]) || []
        return (
          <div className="space-y-2">
            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                  >
                    <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words min-w-0">
                      {item}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemoveArrayItem(index)}
                      aria-label={`Remove item ${index + 1}`}
                      className="flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                id={id}
                type="text"
                value={arrayInputValue}
                placeholder={variable.placeholder || t('variableInput.addItemPlaceholder')}
                onChange={(e) => setArrayInputValue(e.target.value)}
                onKeyDown={handleArrayKeyDown}
                onFocus={handleFocus}
            onBlur={handleBlur}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddArrayItem}
                disabled={!arrayInputValue.trim()}
                aria-label="Add item"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )
      }

      case 'text':
      default:
        return (
          <Input
            id={id}
            type="text"
            value={(value as string) ?? ''}
            placeholder={variable.placeholder || t('variableInput.enterPlaceholder', { label: variable.label.toLowerCase() })}
            onChange={(e) => onValueChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        )
    }
  }

  return (
    <div
      className={cn(
        'relative rounded-lg border bg-white p-3 shadow-sm transition-all duration-150 dark:bg-gray-800',
        hasError
          ? 'border-red-300 ring-1 ring-red-200 dark:border-red-600 dark:ring-red-900'
          : isAiFilled
            ? 'border-violet-300 ring-1 ring-violet-200 dark:border-violet-500 dark:ring-violet-900/50 shadow-[0_0_12px_-3px_rgba(139,92,246,0.3)] dark:shadow-[0_0_12px_-3px_rgba(139,92,246,0.4)]'
            : isActive
              ? 'border-secondary-300 ring-1 ring-secondary-200 dark:border-secondary-600 dark:ring-secondary-900'
              : 'border-gray-200 dark:border-gray-700'
      )}
      onMouseEnter={() => onActiveChange(true)}
      onMouseLeave={() => onActiveChange(false)}
    >
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Label
              htmlFor={`var-${variable.key}`}
              className="text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              {variable.label}
              {variable.required && <span className="text-secondary-500 ml-1">*</span>}
            </Label>
            {isAiFilled && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                <Sparkles className="h-2.5 w-2.5" />
                AI
              </span>
            )}
          </div>
          {(variable.type === 'text' || variable.type === 'textarea') && aiConfigured && onAiFillClick && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onAiFillClick()
              }}
              className="h-6 w-6 p-0 text-gray-400 hover:text-secondary-500"
              title={t('variableInput.generateWithAI')}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {variable.description && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {variable.description}
          </p>
        )}
      </div>
      {renderInput()}
      {hasError && (
        <div className="mt-2 flex items-center gap-1.5 text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="text-xs">{validationError}</span>
        </div>
      )}
    </div>
  )
})
