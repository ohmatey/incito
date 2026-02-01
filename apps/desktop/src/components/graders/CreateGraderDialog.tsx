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
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { CheckCircle2, Sparkles, Loader2 } from 'lucide-react'
import type { AssertionGrader, LLMJudgeGrader, GraderType } from '@/types/grader'

interface CreateGraderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (grader: Omit<AssertionGrader, 'id' | 'syncId' | 'createdAt' | 'updatedAt'> | Omit<LLMJudgeGrader, 'id' | 'syncId' | 'createdAt' | 'updatedAt'>) => void
}

export function CreateGraderDialog({ open, onOpenChange, onCreate }: CreateGraderDialogProps) {
  const { t } = useTranslation('graders')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<GraderType>('assertion')
  const [isCreating, setIsCreating] = useState(false)

  function handleClose() {
    setName('')
    setDescription('')
    setType('assertion')
    onOpenChange(false)
  }

  async function handleCreate() {
    if (!name.trim()) return

    setIsCreating(true)

    if (type === 'assertion') {
      const grader: Omit<AssertionGrader, 'id' | 'syncId' | 'createdAt' | 'updatedAt'> = {
        name: name.trim(),
        description: description.trim() || undefined,
        type: 'assertion',
        logic: {
          operator: 'contains',
          value: '',
        },
        isBuiltin: false,
        enabled: true,
      }
      onCreate(grader)
    } else {
      const grader: Omit<LLMJudgeGrader, 'id' | 'syncId' | 'createdAt' | 'updatedAt'> = {
        name: name.trim(),
        description: description.trim() || undefined,
        type: 'llm_judge',
        config: {
          providerId: null, // Uses default provider
          promptTemplate: 'Evaluate the following output:\n\n{{output}}\n\nProvide your assessment.',
          outputSchema: 'score_1_to_5',
        },
        isBuiltin: false,
        enabled: true,
      }
      onCreate(grader)
    }

    setIsCreating(false)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="grader-name">{t('create.nameLabel')}</Label>
            <Input
              id="grader-name"
              name="grader-name"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('create.namePlaceholder')}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="grader-description">{t('create.descriptionLabel')}</Label>
            <Textarea
              id="grader-description"
              name="grader-description"
              autoComplete="off"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('create.descriptionPlaceholder')}
              rows={2}
            />
          </div>

          {/* Type Selection - Goal-based with cost indicators */}
          <div className="space-y-2">
            <Label>{t('create.typeLabel')}</Label>
            <RadioGroup
              value={type}
              onValueChange={(value) => setType(value as GraderType)}
              className="grid grid-cols-1 gap-3"
            >
              {/* Quick Check (Assertion) */}
              <Label
                htmlFor="type-assertion"
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer transition-colors duration-150 hover:bg-gray-50 [&:has([data-state=checked])]:border-primary-500 [&:has([data-state=checked])]:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:[&:has([data-state=checked])]:bg-primary-900/20"
              >
                <RadioGroupItem value="assertion" id="type-assertion" className="mt-0.5" />
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {t('create.types.assertion.label')}
                      </p>
                      <Badge variant="secondary" className="h-5 text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        {t('create.types.assertion.badge')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {t('create.types.assertion.description')}
                    </p>
                  </div>
                </div>
              </Label>

              {/* AI Review (LLM Judge) */}
              <Label
                htmlFor="type-llm-judge"
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer transition-colors duration-150 hover:bg-gray-50 [&:has([data-state=checked])]:border-primary-500 [&:has([data-state=checked])]:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:[&:has([data-state=checked])]:bg-primary-900/20"
              >
                <RadioGroupItem value="llm_judge" id="type-llm-judge" className="mt-0.5" />
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {t('create.types.llm_judge.label')}
                      </p>
                      <Badge variant="secondary" className="h-5 text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        {t('create.types.llm_judge.badge')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {t('create.types.llm_judge.description')}
                    </p>
                  </div>
                </div>
              </Label>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            {t('common:buttons.cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common:buttons.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
