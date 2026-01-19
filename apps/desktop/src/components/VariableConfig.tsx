import { useState } from 'react'
import type { Variable, SerializationFormat } from '@/types/prompt'
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
import { ChevronUp, ChevronDown, Plus, X } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
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
  const [arrayInputValue, setArrayInputValue] = useState('')
  const [arrayDefaultInputValue, setArrayDefaultInputValue] = useState('')

  function handleTypeChange(newType: Variable['type']) {
    const updates: Partial<Variable> = {
      type: newType,
      default: undefined,
    }

    // Reset type-specific properties
    if (newType !== 'select' && newType !== 'multi-select') {
      updates.options = undefined
    }
    if (newType !== 'slider') {
      updates.min = undefined
      updates.max = undefined
      updates.step = undefined
    }
    if (newType !== 'array' && newType !== 'multi-select') {
      updates.format = undefined
    }

    // Initialize defaults for new types
    if (newType === 'slider') {
      updates.min = 0
      updates.max = 100
      updates.step = 1
    }
    if (newType === 'select' || newType === 'multi-select') {
      updates.options = [{ label: 'Option 1', value: 'option_1' }]
    }
    if (newType === 'array' || newType === 'multi-select') {
      updates.format = 'comma'
    }

    onVariableUpdate({
      ...variable,
      ...updates,
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

  function handleSliderDefaultChange(val: string) {
    const num = val === '' ? undefined : Number(val)
    if (num !== undefined) {
      const min = variable.min ?? 0
      const max = variable.max ?? 100
      const clamped = Math.max(min, Math.min(max, num))
      onVariableUpdate({ ...variable, default: clamped })
    } else {
      onVariableUpdate({ ...variable, default: undefined })
    }
  }

  function handleSelectDefaultChange(val: string) {
    onVariableUpdate({
      ...variable,
      default: val === '__none__' ? undefined : val || undefined,
    })
  }

  function handleMultiSelectDefaultToggle(optionValue: string) {
    const currentDefault = (variable.default as string[]) || []
    let newDefault: string[] | undefined
    if (currentDefault.includes(optionValue)) {
      newDefault = currentDefault.filter(v => v !== optionValue)
    } else {
      newDefault = [...currentDefault, optionValue]
    }
    if (newDefault.length === 0) newDefault = undefined
    onVariableUpdate({ ...variable, default: newDefault })
  }

  function handleArrayDefaultAdd(item: string) {
    if (!item.trim()) return
    const currentDefault = (variable.default as string[]) || []
    onVariableUpdate({
      ...variable,
      default: [...currentDefault, item.trim()],
    })
  }

  function handleArrayDefaultRemove(index: number) {
    const currentDefault = (variable.default as string[]) || []
    const newDefault = currentDefault.filter((_, i) => i !== index)
    onVariableUpdate({
      ...variable,
      default: newDefault.length > 0 ? newDefault : undefined,
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
      onVariableUpdate({
        ...variable,
        description: undefined,
      })
    } else {
      onVariableUpdate({
        ...variable,
        description: '',
      })
    }
  }

  function toggleRequired() {
    onVariableUpdate({
      ...variable,
      required: !variable.required,
    })
  }

  // Slider config handlers
  function handleSliderMinChange(val: string) {
    const num = val === '' ? 0 : Number(val)
    onVariableUpdate({ ...variable, min: num })
  }

  function handleSliderMaxChange(val: string) {
    const num = val === '' ? 100 : Number(val)
    onVariableUpdate({ ...variable, max: num })
  }

  function handleSliderStepChange(val: string) {
    const num = val === '' ? 1 : Number(val)
    onVariableUpdate({ ...variable, step: num > 0 ? num : 1 })
  }

  // Options handlers for select/multi-select
  function handleAddOption() {
    const options = variable.options || []
    const newIndex = options.length + 1
    onVariableUpdate({
      ...variable,
      options: [...options, { label: `Option ${newIndex}`, value: `option_${newIndex}` }],
    })
  }

  function handleRemoveOption(index: number) {
    const options = variable.options || []
    if (options.length <= 1) return // Keep at least one option

    const removedOption = options[index]
    const newOptions = options.filter((_, i) => i !== index)

    let newDefault = variable.default

    // Clear default if removed option was the default (select)
    if (variable.type === 'select' && variable.default === removedOption.value) {
      newDefault = undefined
    }

    // Remove from default array if present (multi-select)
    if (variable.type === 'multi-select' && Array.isArray(variable.default)) {
      newDefault = (variable.default as string[]).filter(v => v !== removedOption.value)
      if ((newDefault as string[]).length === 0) newDefault = undefined
    }

    onVariableUpdate({
      ...variable,
      options: newOptions,
      default: newDefault,
    })
  }

  function handleOptionChange(index: number, field: 'label' | 'value', val: string) {
    const options = [...(variable.options || [])]
    options[index] = { ...options[index], [field]: val }
    onVariableUpdate({ ...variable, options })
  }

  // Format handler for array/multi-select
  function handleFormatChange(format: SerializationFormat) {
    onVariableUpdate({ ...variable, format })
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

  // Multi-select handlers
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
                      aria-label={`Remove ${item}`}
                      className="hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
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
            placeholder={variable.placeholder || `Enter ${variable.label.toLowerCase()}...`}
            onChange={(e) => onValueChange(e.target.value)}
            {...focusHandlers}
          />
        )
    }
  }

  function renderEditModeConfig() {
    const renderDefaultValueInput = () => {
      switch (variable.type) {
        case 'text':
        case 'textarea':
          return (
            <Input
              type="text"
              value={variable.default as string ?? ''}
              onChange={(e) => handleDefaultChange(e.target.value)}
              placeholder="Default value"
              className="h-8 text-sm"
            />
          )
        case 'number':
          return (
            <Input
              type="number"
              value={variable.default as number ?? ''}
              onChange={(e) => handleDefaultChange(e.target.value)}
              placeholder="Default value"
              className="h-8 text-sm"
            />
          )
        case 'slider': {
          const min = variable.min ?? 0
          const max = variable.max ?? 100
          return (
            <Input
              type="number"
              value={variable.default as number ?? ''}
              onChange={(e) => handleSliderDefaultChange(e.target.value)}
              placeholder={`${min} - ${max}`}
              min={min}
              max={max}
              className="h-8 text-sm"
            />
          )
        }
        case 'select': {
          const options = (variable.options || []).filter(opt => opt.value !== '')
          return (
            <Select
              value={variable.default as string || '__none__'}
              onValueChange={handleSelectDefaultChange}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="No default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No default</SelectItem>
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
          const currentDefault = (variable.default as string[]) || []
          return (
            <div className="space-y-1">
              {options.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`default-${variable.key}-${opt.value}`}
                    checked={currentDefault.includes(opt.value)}
                    onCheckedChange={() => handleMultiSelectDefaultToggle(opt.value)}
                  />
                  <Label
                    htmlFor={`default-${variable.key}-${opt.value}`}
                    className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer"
                  >
                    {opt.label}
                  </Label>
                </div>
              ))}
            </div>
          )
        }
        case 'array': {
          const defaultItems = (variable.default as string[]) || []
          return (
            <div className="space-y-2">
              {defaultItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {defaultItems.map((item, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => handleArrayDefaultRemove(index)}
                        aria-label={`Remove default item ${item}`}
                        className="hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={arrayDefaultInputValue}
                  placeholder="Add default item..."
                  onChange={(e) => setArrayDefaultInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleArrayDefaultAdd(arrayDefaultInputValue)
                      setArrayDefaultInputValue('')
                    }
                  }}
                  className="h-8 text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleArrayDefaultAdd(arrayDefaultInputValue)
                    setArrayDefaultInputValue('')
                  }}
                  disabled={!arrayDefaultInputValue.trim()}
                  className="h-8"
                  aria-label="Add default item"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )
        }
        default:
          return null
      }
    }

    return (
      <div className="space-y-3">
        {/* Label */}
        <div className="space-y-1">
          <Label className="text-xs text-gray-500 dark:text-gray-400">Label</Label>
          <Input
            value={variable.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="Label"
            className="h-8 text-sm"
          />
        </div>

        {/* Type */}
        <div className="space-y-1">
          <Label className="text-xs text-gray-500 dark:text-gray-400">Type</Label>
          <Select value={variable.type} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="textarea">Text Area</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="slider">Slider</SelectItem>
              <SelectItem value="select">Select</SelectItem>
              <SelectItem value="multi-select">Multi-Select</SelectItem>
              <SelectItem value="array">Array</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Slider config */}
        {variable.type === 'slider' && (
          <div className="space-y-2">
            <Label className="text-xs text-gray-500 dark:text-gray-400">Slider Range</Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Min</Label>
                <Input
                  type="number"
                  value={variable.min ?? 0}
                  onChange={(e) => handleSliderMinChange(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Max</Label>
                <Input
                  type="number"
                  value={variable.max ?? 100}
                  onChange={(e) => handleSliderMaxChange(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Step</Label>
                <Input
                  type="number"
                  value={variable.step ?? 1}
                  onChange={(e) => handleSliderStepChange(e.target.value)}
                  className="h-8 text-sm"
                  min={0.001}
                />
              </div>
            </div>
          </div>
        )}

        {/* Options config for select/multi-select */}
        {(variable.type === 'select' || variable.type === 'multi-select') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Options</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddOption}
                className="h-6 text-xs"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-1.5">
              {(variable.options || []).map((opt, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={opt.label}
                    onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                    placeholder="Label"
                    className="h-7 text-xs flex-1"
                  />
                  <Input
                    value={opt.value}
                    onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                    placeholder="Value"
                    className="h-7 text-xs flex-1 font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOption(index)}
                    className="h-8 w-8"
                    disabled={(variable.options || []).length <= 1}
                    aria-label={`Remove option ${opt.label || opt.value || index + 1}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Format selector for array/multi-select */}
        {(variable.type === 'array' || variable.type === 'multi-select') && (
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 dark:text-gray-400">Output Format</Label>
            <Select value={variable.format || 'comma'} onValueChange={(v) => handleFormatChange(v as SerializationFormat)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comma">Comma separated</SelectItem>
                <SelectItem value="newline">Newline separated</SelectItem>
                <SelectItem value="numbered">Numbered list</SelectItem>
                <SelectItem value="bullet">Bullet list</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Default value - after type-specific config */}
        <div className="space-y-1">
          <Label className="text-xs text-gray-500 dark:text-gray-400">Default Value</Label>
          {renderDefaultValueInput()}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700" />

        {/* Required field toggle */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`required-toggle-${variable.key}`}
            checked={variable.required ?? false}
            onCheckedChange={toggleRequired}
          />
          <Label
            htmlFor={`required-toggle-${variable.key}`}
            className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer"
          >
            Required field
          </Label>
        </div>

        {/* Description toggle and field */}
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
            className="min-h-[60px] text-sm resize-y"
          />
        )}
      </div>
    )
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
              className="h-8 w-8"
              disabled={isFirst}
              onClick={onMoveUp}
              aria-label={`Move ${variable.label} up`}
            >
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isLast}
              onClick={onMoveDown}
              aria-label={`Move ${variable.label} down`}
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-3">
        {isEditMode ? renderEditModeConfig() : renderInput()}
      </div>
    </div>
  )
}
