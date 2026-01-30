import { useState, useMemo, useCallback } from 'react'
import { format, isValid } from 'date-fns'
import { CalendarIcon, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DatetimePickerProps {
  value?: string
  onChange: (value: string) => void
  showDate?: boolean
  showTime?: boolean
  timeFormat?: '12h' | '24h'
  placeholder?: string
  onFocus?: () => void
  onBlur?: () => void
}

// rendering-hoist-jsx: Hoist static arrays outside component to avoid recreation on each render
const HOUR_OPTIONS_12H = Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i)
const HOUR_OPTIONS_24H = Array.from({ length: 24 }, (_, i) => i)
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i)

export function DatetimePicker({
  value,
  onChange,
  showDate = true,
  showTime = false,
  timeFormat = '24h',
  placeholder,
  onFocus,
  onBlur,
}: DatetimePickerProps) {
  const [open, setOpen] = useState(false)

  // Parse ISO string to Date
  const dateValue = useMemo(() => {
    if (!value) return undefined
    const parsed = new Date(value)
    return isValid(parsed) ? parsed : undefined
  }, [value])

  // Extract time components
  const hours = dateValue ? dateValue.getHours() : 0
  const minutes = dateValue ? dateValue.getMinutes() : 0

  // Convert to 12h format if needed
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const period = hours >= 12 ? 'PM' : 'AM'

  // Format display value
  const displayValue = useMemo(() => {
    if (!dateValue) return ''

    const parts: string[] = []

    if (showDate) {
      parts.push(format(dateValue, 'MMM d, yyyy'))
    }

    if (showTime) {
      if (timeFormat === '12h') {
        parts.push(format(dateValue, 'h:mm a'))
      } else {
        parts.push(format(dateValue, 'HH:mm'))
      }
    }

    return parts.join(' ')
  }, [dateValue, showDate, showTime, timeFormat])

  // rerender-functional-setstate: Use useCallback for stable callback references
  const handleDateSelect = useCallback((selectedDate: Date | undefined) => {
    if (!selectedDate) return

    // Preserve existing time if we have one
    if (dateValue) {
      selectedDate.setHours(dateValue.getHours())
      selectedDate.setMinutes(dateValue.getMinutes())
    }

    onChange(selectedDate.toISOString())

    // Close popover if only date mode
    if (!showTime) {
      setOpen(false)
    }
  }, [dateValue, onChange, showTime])

  // Handle time change
  const handleTimeChange = useCallback((type: 'hours' | 'minutes' | 'period', val: string) => {
    const base = dateValue || new Date()
    const newDate = new Date(base)

    if (type === 'hours') {
      let newHours = parseInt(val, 10)
      if (timeFormat === '12h') {
        // Convert 12h to 24h
        if (period === 'PM' && newHours !== 12) {
          newHours += 12
        } else if (period === 'AM' && newHours === 12) {
          newHours = 0
        }
      }
      newDate.setHours(newHours)
    } else if (type === 'minutes') {
      newDate.setMinutes(parseInt(val, 10))
    } else if (type === 'period') {
      // Toggle AM/PM
      const currentHours = newDate.getHours()
      if (val === 'AM' && currentHours >= 12) {
        newDate.setHours(currentHours - 12)
      } else if (val === 'PM' && currentHours < 12) {
        newDate.setHours(currentHours + 12)
      }
    }

    onChange(newDate.toISOString())
  }, [dateValue, onChange, period, timeFormat])

  // Use hoisted options based on timeFormat
  const hourOptions = timeFormat === '12h' ? HOUR_OPTIONS_12H : HOUR_OPTIONS_24H

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      onFocus?.()
    } else {
      onBlur?.()
    }
  }, [onFocus, onBlur])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          {showDate && <CalendarIcon className="mr-2 h-4 w-4" />}
          {!showDate && showTime && <Clock className="mr-2 h-4 w-4" />}
          {displayValue || (placeholder || (showDate && showTime ? 'Pick date & time' : showDate ? 'Pick a date' : 'Pick a time'))}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col">
          {/* Calendar */}
          {showDate && (
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={handleDateSelect}
              initialFocus
            />
          )}

          {/* Time Picker */}
          {showTime && (
            <div className={cn(
              'flex items-center gap-2 p-3 border-t',
              !showDate && 'border-t-0'
            )}>
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-1">
                {/* Hours */}
                <Select
                  value={timeFormat === '12h' ? hours12.toString() : hours.toString()}
                  onValueChange={(val) => handleTimeChange('hours', val)}
                >
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map((hour) => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {hour.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-muted-foreground">:</span>

                {/* Minutes */}
                <Select
                  value={minutes.toString()}
                  onValueChange={(val) => handleTimeChange('minutes', val)}
                >
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MINUTE_OPTIONS.map((minute) => (
                      <SelectItem key={minute} value={minute.toString()}>
                        {minute.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* AM/PM for 12h format */}
                {timeFormat === '12h' && (
                  <Select
                    value={period}
                    onValueChange={(val) => handleTimeChange('period', val)}
                  >
                    <SelectTrigger className="w-16 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
