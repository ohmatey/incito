import type { Variable } from '@/types/prompt'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface VariableInputProps {
  variable: Variable
  value: unknown
  onChange: (value: unknown) => void
}

export function VariableInput({ variable, value, onChange }: VariableInputProps) {
  const hasError = variable.required && (value === undefined || value === '')
  const id = `var-${variable.key}`
  const errorId = `${id}-error`
  const descriptionId = variable.description ? `${id}-description` : undefined

  const ariaProps = {
    'aria-invalid': hasError ? true : undefined,
    'aria-required': variable.required ? true : undefined,
    'aria-describedby': [descriptionId, hasError ? errorId : undefined].filter(Boolean).join(' ') || undefined,
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-1">
        {variable.label}
        {variable.required && <span className="text-destructive" aria-hidden="true">*</span>}
      </Label>

      {variable.description && (
        <p id={descriptionId} className="text-xs text-gray-500 dark:text-gray-400">
          {variable.description}
        </p>
      )}

      {variable.type === 'text' && (
        <Input
          id={id}
          type="text"
          value={(value as string) ?? ''}
          placeholder={variable.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(hasError && 'border-destructive')}
          {...ariaProps}
        />
      )}

      {variable.type === 'textarea' && (
        <Textarea
          id={id}
          value={(value as string) ?? ''}
          placeholder={variable.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn('min-h-[100px]', hasError && 'border-destructive')}
          {...ariaProps}
        />
      )}

      {variable.type === 'number' && (
        <Input
          id={id}
          type="number"
          value={(value as number) ?? ''}
          placeholder={variable.placeholder}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          className={cn(hasError && 'border-destructive')}
          {...ariaProps}
        />
      )}

      {variable.type === 'select' && variable.options && (
        <Select
          value={(value as string) ?? ''}
          onValueChange={onChange}
        >
          <SelectTrigger
            className={cn(hasError && 'border-destructive')}
            aria-invalid={hasError ? true : undefined}
            aria-required={variable.required ? true : undefined}
          >
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {variable.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasError && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {variable.label} is required
        </p>
      )}
    </div>
  )
}
