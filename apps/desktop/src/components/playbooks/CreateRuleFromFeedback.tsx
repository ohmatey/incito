import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { getAllPlaybooks, createPlaybook, createPlaybookRule } from '@/lib/store'
import type { Playbook } from '@/types/playbook'

interface CreateRuleFromFeedbackProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The input that caused the bad AI response (e.g., interpolated prompt) */
  badExampleInput?: string
  /** The bad AI response that should be avoided */
  badExampleOutput?: string
  /** The run ID this rule is being created from */
  sourceRunId?: string
  /** Called when the rule is successfully created */
  onCreated?: () => void
}

export function CreateRuleFromFeedback({
  open,
  onOpenChange,
  badExampleInput = '',
  badExampleOutput = '',
  sourceRunId,
  onCreated,
}: CreateRuleFromFeedbackProps) {
  const { t } = useTranslation('playbooks')

  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [isLoadingPlaybooks, setIsLoadingPlaybooks] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  // Form state
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string>('')
  const [showNewPlaybook, setShowNewPlaybook] = useState(false)
  const [newPlaybookName, setNewPlaybookName] = useState('')
  const [triggerContext, setTriggerContext] = useState('')
  const [instruction, setInstruction] = useState('')
  const [goldenOutput, setGoldenOutput] = useState('')

  // Load playbooks when dialog opens
  useEffect(() => {
    if (open) {
      loadPlaybooks()
    }
  }, [open])

  async function loadPlaybooks() {
    setIsLoadingPlaybooks(true)
    const result = await getAllPlaybooks()
    if (result.ok) {
      const enabledPlaybooks = result.data.filter(p => p.enabled)
      setPlaybooks(enabledPlaybooks)
      // Auto-select first playbook if available
      if (enabledPlaybooks.length > 0 && !selectedPlaybookId) {
        setSelectedPlaybookId(enabledPlaybooks[0].id)
      }
    }
    setIsLoadingPlaybooks(false)
  }

  function handleClose() {
    // Reset form state
    setSelectedPlaybookId('')
    setShowNewPlaybook(false)
    setNewPlaybookName('')
    setTriggerContext('')
    setInstruction('')
    setGoldenOutput('')
    onOpenChange(false)
  }

  async function handleCreate() {
    // Validation
    if (!triggerContext.trim()) {
      toast.error(t('rules.triggerContext') + ' ' + t('errors.createRuleFailed'))
      return
    }
    if (!instruction.trim()) {
      toast.error(t('rules.instruction') + ' ' + t('errors.createRuleFailed'))
      return
    }

    // Determine playbook ID (create new if needed)
    let playbookId = selectedPlaybookId

    if (showNewPlaybook || !playbookId) {
      if (!newPlaybookName.trim()) {
        toast.error(t('create.nameLabel') + ' ' + t('errors.createFailed'))
        return
      }

      setIsCreating(true)
      const playbookResult = await createPlaybook({
        name: newPlaybookName.trim(),
        description: '',
        enabled: true,
      })

      if (!playbookResult.ok) {
        toast.error(t('errors.createFailed'))
        setIsCreating(false)
        return
      }

      playbookId = playbookResult.data.id
    }

    setIsCreating(true)

    // Create the rule
    const ruleResult = await createPlaybookRule({
      playbookId,
      triggerContext: triggerContext.trim(),
      instruction: instruction.trim(),
      badExampleInput: badExampleInput || undefined,
      badExampleOutput: badExampleOutput || undefined,
      goldenOutput: goldenOutput.trim() || undefined,
      sourceRunId: sourceRunId || undefined,
      priority: 100,
      enabled: true,
    })

    setIsCreating(false)

    if (ruleResult.ok) {
      toast.success(t('success.ruleCreated'))
      onCreated?.()
      handleClose()
    } else {
      toast.error(t('errors.createRuleFailed'))
    }
  }

  const isValid = triggerContext.trim() && instruction.trim() && (selectedPlaybookId || newPlaybookName.trim())

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col bg-white dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <BookOpen className="h-5 w-5" />
            {t('rules.createFromFeedback')}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-4">
            {/* Playbook Selection */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">
                {t('title')}
              </Label>
              {isLoadingPlaybooks ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : playbooks.length === 0 || showNewPlaybook ? (
                <div className="space-y-2">
                  <Input
                    placeholder={t('create.namePlaceholder')}
                    value={newPlaybookName}
                    onChange={(e) => setNewPlaybookName(e.target.value)}
                    className="bg-white dark:bg-gray-900"
                  />
                  {playbooks.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNewPlaybook(false)}
                      className="text-xs"
                    >
                      {t('selector.selectAll').replace('Select All', 'Select existing')}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={selectedPlaybookId} onValueChange={setSelectedPlaybookId}>
                    <SelectTrigger className="flex-1 bg-white dark:bg-gray-900">
                      <SelectValue placeholder={t('selector.title')} />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800">
                      {playbooks.map((playbook) => (
                        <SelectItem key={playbook.id} value={playbook.id}>
                          {playbook.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNewPlaybook(true)}
                    title={t('create.button')}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Trigger Context */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">
                {t('rules.triggerContext')} <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder={t('rules.triggerContextPlaceholder')}
                value={triggerContext}
                onChange={(e) => setTriggerContext(e.target.value)}
                className="bg-white dark:bg-gray-900"
              />
            </div>

            {/* Instruction */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">
                {t('rules.instruction')} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder={t('rules.instructionPlaceholder')}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                className="min-h-[80px] bg-white dark:bg-gray-900"
              />
            </div>

            {/* Bad Example Input (pre-filled, read-only summary) */}
            {badExampleInput && (
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">
                  {t('rules.badExampleInput')}
                </Label>
                <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-3 max-h-[100px] overflow-hidden">
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-4 font-mono">
                    {badExampleInput}
                  </p>
                </div>
              </div>
            )}

            {/* Bad Example Output (pre-filled, read-only summary) */}
            {badExampleOutput && (
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">
                  {t('rules.badExampleOutput')}
                </Label>
                <div className="rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-3 max-h-[100px] overflow-hidden">
                  <p className="text-xs text-red-600 dark:text-red-400 line-clamp-4 font-mono">
                    {badExampleOutput}
                  </p>
                </div>
              </div>
            )}

            {/* Golden Output */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">
                {t('rules.goldenOutput')}
              </Label>
              <Textarea
                placeholder={t('rules.goldenOutputPlaceholder')}
                value={goldenOutput}
                onChange={(e) => setGoldenOutput(e.target.value)}
                className="min-h-[80px] bg-white dark:bg-gray-900"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
          >
            {t('common:buttons.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!isValid || isCreating}
            className="gap-2"
          >
            {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('rules.addRule')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
