import { useTranslation } from 'react-i18next'
import { Textarea } from '@/components/ui/textarea'

interface NotesInputProps {
  value: string | undefined
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

export function NotesInput({
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
}: NotesInputProps) {
  const { t } = useTranslation('runs')

  return (
    <Textarea
      id="feedback-notes"
      name="feedback-notes"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? t('feedback.notes.placeholder')}
      required={required}
      disabled={disabled}
      className="min-h-[100px] resize-none"
    />
  )
}
