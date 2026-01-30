import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AssertionLogic, AssertionOperator } from '@/types/grader'
import { ASSERTION_OPERATORS } from '@/types/grader'

interface AssertionFormProps {
  logic: AssertionLogic
  onChange: (logic: AssertionLogic) => void
}

export function AssertionForm({ logic, onChange }: AssertionFormProps) {
  const { t } = useTranslation('graders')

  const selectedOperator = ASSERTION_OPERATORS.find(op => op.value === logic.operator)
  const showValue = selectedOperator?.valueType !== 'none'
  const isNumberValue = selectedOperator?.valueType === 'number'

  return (
    <div className="space-y-4">
      {/* Operator */}
      <div className="space-y-2">
        <Label>{t('assertion.operatorLabel')}</Label>
        <Select
          value={logic.operator}
          onValueChange={(value) => onChange({ ...logic, operator: value as AssertionOperator })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSERTION_OPERATORS.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                <div>
                  <span>{op.label}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    {op.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Value */}
      {showValue && (
        <div className="space-y-2">
          <Label>{t('assertion.valueLabel')}</Label>
          <Input
            type={isNumberValue ? 'number' : 'text'}
            value={String(logic.value)}
            onChange={(e) => onChange({
              ...logic,
              value: isNumberValue ? Number(e.target.value) : e.target.value
            })}
            placeholder={t('assertion.valuePlaceholder')}
          />
        </div>
      )}

      {/* Case Sensitive (for string operators) */}
      {!isNumberValue && showValue && (
        <div className="flex items-center justify-between">
          <Label htmlFor="case-sensitive" className="text-sm">
            {t('assertion.caseSensitive')}
          </Label>
          <Switch
            id="case-sensitive"
            checked={logic.caseSensitive ?? false}
            onCheckedChange={(checked) => onChange({ ...logic, caseSensitive: checked })}
          />
        </div>
      )}
    </div>
  )
}
