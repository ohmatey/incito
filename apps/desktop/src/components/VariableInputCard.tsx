import { useState } from 'react'
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
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VariableInputCardProps {
  variable: Variable
  value: unknown
  isActive: boolean
  onValueChange: (value: unknown) => void
  onActiveChange: (active: boolean) => void
}

export function VariableInputCard({
  variable,
  value,
  isActive,
  onValueChange,
  onActiveChange,
}: VariableInputCardProps) {
  const [arrayInputValue, setArrayInputValue] = useState('')

  const focusHandlers = {
    onFocus: () => onActiveChange(true),
    onBlur: () => onActiveChange(false),
  }

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
            placeholder={variable.placeholder || `Enter ${variable.label.toLowerCase()}...`}
            onChange={(e) => onValueChange(e.target.value)}
            {...focusHandlers}
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
            {...focusHandlers}
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
              placeholder={variable.placeholder || 'No options configured...'}
              onChange={(e) => onValueChange(e.target.value)}
              {...focusHandlers}
              disabled
              className="bg-gray-50 dark:bg-gray-900"
            />
          )
        }
        return (
          <Select value={currentValue} onValueChange={onValueChange}>
            <SelectTrigger id={id} {...focusHandlers}>
              <SelectValue placeholder={variable.placeholder || 'Select an option...'} />
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
                        className="hover:text-secondary-900 dark:hover:text-secondary-100"
                      >
                        <X className="h-3 w-3" />
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
              <div className="flex flex-wrap gap-1.5">
                {items.map((item, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => handleRemoveArrayItem(index)}
                      className="hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                id={id}
                type="text"
                value={arrayInputValue}
                placeholder={variable.placeholder || 'Add an item...'}
                onChange={(e) => setArrayInputValue(e.target.value)}
                onKeyDown={handleArrayKeyDown}
                {...focusHandlers}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddArrayItem}
                disabled={!arrayInputValue.trim()}
              >
                <Plus className="h-4 w-4" />
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
        'rounded-lg border bg-white p-3 shadow-sm transition-all duration-150 dark:bg-gray-800',
        isActive
          ? 'border-secondary-300 ring-1 ring-secondary-200 dark:border-secondary-600 dark:ring-secondary-900'
          : 'border-gray-200 dark:border-gray-700'
      )}
      onMouseEnter={() => onActiveChange(true)}
      onMouseLeave={() => onActiveChange(false)}
    >
      <div className="mb-2">
        <Label
          htmlFor={`var-${variable.key}`}
          className="text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          {variable.label}
          {variable.required && <span className="text-secondary-500 ml-1">*</span>}
        </Label>
        {variable.description && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {variable.description}
          </p>
        )}
      </div>
      {renderInput()}
    </div>
  )
}
