import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Layers, Play, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BatchRunDialogProps {
  onStartBatch: (count: number) => Promise<void>
  disabled?: boolean
  isRunning?: boolean
  progress?: number  // 0-100
  currentRun?: number
  totalRuns?: number
}

const BATCH_OPTIONS = [
  { value: 3, label: '3 runs', description: 'Quick check' },
  { value: 5, label: '5 runs', description: 'Recommended' },
  { value: 10, label: '10 runs', description: 'Thorough' },
] as const

export function BatchRunDialog({
  onStartBatch,
  disabled,
  isRunning,
  progress = 0,
  currentRun = 0,
  totalRuns = 0,
}: BatchRunDialogProps) {
  const { t } = useTranslation('runMode')
  const [open, setOpen] = useState(false)
  const [selectedCount, setSelectedCount] = useState<number>(5)
  const [isStarting, setIsStarting] = useState(false)

  const handleStartBatch = async () => {
    setIsStarting(true)
    try {
      await onStartBatch(selectedCount)
    } finally {
      setIsStarting(false)
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isRunning}
          className="gap-1.5"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">
                {t('batch.running', 'Running {{current}}/{{total}}', {
                  current: currentRun,
                  total: totalRuns,
                })}
              </span>
            </>
          ) : (
            <>
              <Layers className="h-4 w-4" />
              <span>{t('batch.runMultiple', 'Run Multiple')}</span>
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('batch.title', 'Batch Run')}</DialogTitle>
          <DialogDescription>
            {t(
              'batch.description',
              'Run the same prompt multiple times to check output consistency. All runs use the same variable values.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={selectedCount.toString()}
            onValueChange={(v) => setSelectedCount(parseInt(v))}
            className="grid grid-cols-3 gap-3"
          >
            {BATCH_OPTIONS.map((option) => (
              <Label
                key={option.value}
                htmlFor={`batch-${option.value}`}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-4 cursor-pointer transition-colors',
                  selectedCount === option.value
                    ? 'border-primary-500 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                )}
              >
                <RadioGroupItem
                  value={option.value.toString()}
                  id={`batch-${option.value}`}
                  className="sr-only"
                />
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {option.value}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {option.description}
                </span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        {isStarting && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              {t('batch.progressLabel', 'Running {{current}} of {{total}}...', {
                current: currentRun,
                total: selectedCount,
              })}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isStarting}>
            {t('common:buttons.cancel')}
          </Button>
          <Button onClick={handleStartBatch} disabled={isStarting} className="gap-1.5">
            {isStarting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('batch.starting', 'Starting...')}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {t('batch.start', 'Start Batch')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
