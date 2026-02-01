import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import type { CreatePlaybookRuleData } from '@/types/playbook'

interface CreateRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  playbookId: string
  onCreate: (data: CreatePlaybookRuleData) => void
  // Optional pre-fill from feedback
  initialBadExampleInput?: string
  initialBadExampleOutput?: string
  sourceRunId?: string
}

export function CreateRuleDialog({
  open,
  onOpenChange,
  playbookId,
  onCreate,
  initialBadExampleInput,
  initialBadExampleOutput,
  sourceRunId,
}: CreateRuleDialogProps) {
  const { t } = useTranslation('playbooks')
  const [triggerContext, setTriggerContext] = useState('')
  const [instruction, setInstruction] = useState('')
  const [badExampleInput, setBadExampleInput] = useState(initialBadExampleInput || '')
  const [badExampleOutput, setBadExampleOutput] = useState(initialBadExampleOutput || '')
  const [goldenOutput, setGoldenOutput] = useState('')
  const [priority, setPriority] = useState(100)
  const [isCreating, setIsCreating] = useState(false)

  function handleClose() {
    setTriggerContext('')
    setInstruction('')
    setBadExampleInput('')
    setBadExampleOutput('')
    setGoldenOutput('')
    setPriority(100)
    onOpenChange(false)
  }

  async function handleCreate() {
    if (!triggerContext.trim() || !instruction.trim()) return

    setIsCreating(true)

    onCreate({
      playbookId,
      triggerContext: triggerContext.trim(),
      instruction: instruction.trim(),
      badExampleInput: badExampleInput.trim() || undefined,
      badExampleOutput: badExampleOutput.trim() || undefined,
      goldenOutput: goldenOutput.trim() || undefined,
      sourceRunId,
      priority,
      enabled: true,
    })

    setIsCreating(false)
    handleClose()
  }

  const isValid = triggerContext.trim() && instruction.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('rules.addRule')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Trigger Context */}
          <div className="space-y-2">
            <Label htmlFor="trigger-context">{t('rules.triggerContext')}</Label>
            <Textarea
              id="trigger-context"
              name="trigger-context"
              autoComplete="off"
              value={triggerContext}
              onChange={(e) => setTriggerContext(e.target.value)}
              placeholder={t('rules.triggerContextPlaceholder')}
              rows={2}
            />
          </div>

          {/* Instruction */}
          <div className="space-y-2">
            <Label htmlFor="instruction">{t('rules.instruction')}</Label>
            <Textarea
              id="instruction"
              name="instruction"
              autoComplete="off"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={t('rules.instructionPlaceholder')}
              rows={3}
            />
          </div>

          {/* Bad Example Input (optional) */}
          <div className="space-y-2">
            <Label htmlFor="bad-example-input">{t('rules.badExampleInput')}</Label>
            <Textarea
              id="bad-example-input"
              name="bad-example-input"
              autoComplete="off"
              value={badExampleInput}
              onChange={(e) => setBadExampleInput(e.target.value)}
              placeholder={t('rules.badExampleInputPlaceholder')}
              rows={2}
            />
          </div>

          {/* Bad Example Output (optional) */}
          <div className="space-y-2">
            <Label htmlFor="bad-example-output">{t('rules.badExampleOutput')}</Label>
            <Textarea
              id="bad-example-output"
              name="bad-example-output"
              autoComplete="off"
              value={badExampleOutput}
              onChange={(e) => setBadExampleOutput(e.target.value)}
              placeholder={t('rules.badExampleOutputPlaceholder')}
              rows={2}
            />
          </div>

          {/* Golden Output (optional) */}
          <div className="space-y-2">
            <Label htmlFor="golden-output">{t('rules.goldenOutput')}</Label>
            <Textarea
              id="golden-output"
              name="golden-output"
              autoComplete="off"
              value={goldenOutput}
              onChange={(e) => setGoldenOutput(e.target.value)}
              placeholder={t('rules.goldenOutputPlaceholder')}
              rows={3}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="priority">{t('rules.priority')}</Label>
              <span className="text-xs text-gray-500">{t('rules.priorityHint')}</span>
            </div>
            <Input
              id="priority"
              name="priority"
              type="number"
              min={1}
              max={1000}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-24"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            {t('common:buttons.cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={!isValid || isCreating}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common:buttons.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
