import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Variable } from '@/types/prompt'
import type { DisplayFieldTool } from '@/types/run'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, Sparkles } from 'lucide-react'

interface RunModeFieldCardProps {
  variable: Variable
  displayInfo: DisplayFieldTool
  currentValue?: unknown
  onSubmit: (value: unknown) => void
  disabled?: boolean
}

export function RunModeFieldCard({
  variable,
  displayInfo,
  currentValue,
  onSubmit,
  disabled = false,
}: RunModeFieldCardProps) {
  const { t } = useTranslation('runMode')
  const [value, setValue] = useState<unknown>(
    currentValue ?? displayInfo.suggestedValue ?? variable.default ?? ''
  )

  // Reset value when variable changes
  useEffect(() => {
    setValue(currentValue ?? displayInfo.suggestedValue ?? variable.default ?? '')
  }, [variable.key, currentValue, displayInfo.suggestedValue, variable.default])

  function handleSubmit() {
    onSubmit(value)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && variable.type !== 'textarea') {
      e.preventDefault()
      handleSubmit()
    }
  }

  function renderInput() {
    switch (variable.type) {
      case 'text':
        return (
          <Input
            name={`field-${variable.key}`}
            value={String(value)}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={variable.placeholder}
            disabled={disabled}
          />
        )

      case 'textarea':
        return (
          <Textarea
            name={`field-${variable.key}`}
            value={String(value)}
            onChange={(e) => setValue(e.target.value)}
            placeholder={variable.placeholder}
            disabled={disabled}
            rows={4}
          />
        )

      case 'number':
        return (
          <Input
            name={`field-${variable.key}`}
            type="number"
            value={String(value)}
            onChange={(e) => setValue(Number(e.target.value))}
            onKeyDown={handleKeyDown}
            min={variable.min}
            max={variable.max}
            step={variable.step}
            placeholder={variable.placeholder}
            disabled={disabled}
          />
        )

      case 'slider':
        return (
          <div className="space-y-2">
            <Slider
              value={[Number(value) || variable.min || 0]}
              onValueChange={([v]) => setValue(v)}
              min={variable.min || 0}
              max={variable.max || 100}
              step={variable.step || 1}
              disabled={disabled}
              aria-label={`${variable.label}: ${variable.min || 0} to ${variable.max || 100}`}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{variable.min || 0}</span>
              <span className="font-medium">{String(value)}</span>
              <span>{variable.max || 100}</span>
            </div>
          </div>
        )

      case 'select':
        return (
          <Select
            value={String(value)}
            onValueChange={setValue}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={variable.placeholder || t('selectOption')} />
            </SelectTrigger>
            <SelectContent>
              {variable.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multi-select': {
        // For multi-select, render as checkboxes
        const selectedValues = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            {variable.options?.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  name={`field-${variable.key}`}
                  checked={selectedValues.includes(option.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setValue([...selectedValues, option.value])
                    } else {
                      setValue(selectedValues.filter((v) => v !== option.value))
                    }
                  }}
                  disabled={disabled}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        )
      }

      case 'array': {
        // For array, use a textarea with newline-separated values
        const arrayValue = Array.isArray(value) ? value.join('\n') : String(value)
        return (
          <div className="space-y-1">
            <Textarea
              name={`field-${variable.key}`}
              value={arrayValue}
              onChange={(e) => setValue(e.target.value.split('\n').filter(Boolean))}
              placeholder={variable.placeholder || t('onePerLine')}
              disabled={disabled}
              rows={4}
            />
            <p className="text-xs text-gray-500">{t('onePerLine')}</p>
          </div>
        )
      }

      default:
        return (
          <Input
            name={`field-${variable.key}`}
            value={String(value)}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={variable.placeholder}
            disabled={disabled}
          />
        )
    }
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {variable.label}
            {variable.required && <span className="ml-1 text-red-500">*</span>}
          </Label>
          {variable.description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {variable.description}
            </p>
          )}
        </div>
        {displayInfo.suggestedValue && (
          <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            <span>{t('suggested')}</span>
          </div>
        )}
      </div>

      {displayInfo.guidance && (
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
          {displayInfo.guidance}
        </p>
      )}

      <div className="space-y-3">
        {renderInput()}

        <Button
          onClick={handleSubmit}
          disabled={disabled || (variable.required && !value)}
          className="w-full gap-2"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {t('submit')}
        </Button>
      </div>
    </div>
  )
}
