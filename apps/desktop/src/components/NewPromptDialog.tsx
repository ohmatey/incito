import { useState, useEffect } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FileText, Sparkles, Loader2, AlertCircle, Settings } from 'lucide-react'
import { hasAIConfigured } from '@/lib/store'
import { generatePromptTemplate, type GeneratedPrompt } from '@/lib/mastra-client'
import { useAppContext } from '@/context/AppContext'

type CreationType = 'blank' | 'ai'

interface NewPromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateBlank: () => Promise<void>
  onCreateFromAI: (generated: GeneratedPrompt) => Promise<void>
  onOpenSettings: () => void
  defaultMode?: 'blank' | 'ai'
}

export function NewPromptDialog({
  open,
  onOpenChange,
  onCreateBlank,
  onCreateFromAI,
  onOpenSettings,
  defaultMode = 'blank',
}: NewPromptDialogProps) {
  const { t } = useTranslation(['prompts', 'common'])
  const { tagManager } = useAppContext()
  const [creationType, setCreationType] = useState<CreationType>('blank')
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null)
  const [description, setDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if AI is configured when dialog opens
  useEffect(() => {
    if (open) {
      checkAIConfiguration()
      // Reset state when dialog opens
      setDescription('')
      setError(null)
      setCreationType(defaultMode)
    }
  }, [open, defaultMode])

  async function checkAIConfiguration() {
    const result = await hasAIConfigured()
    if (result.ok) {
      setAiConfigured(result.data)
    } else {
      setAiConfigured(false)
    }
  }

  async function handleCreateBlank() {
    await onCreateBlank()
    onOpenChange(false)
  }

  async function handleGenerateWithAI() {
    if (!description.trim()) {
      setError(t('newDialog.pleaseDescribe'))
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Get existing tag names to pass to the generator
      const existingTags = tagManager.tags.map(tag => tag.name)
      const result = await generatePromptTemplate(description, existingTags)

      if (result.ok) {
        await onCreateFromAI(result.data)
        onOpenChange(false)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prompt')
    } finally {
      setIsGenerating(false)
    }
  }

  function handleOpenSettings() {
    onOpenChange(false)
    onOpenSettings()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('newDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('newDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Creation Type Selection */}
          <RadioGroup
            value={creationType}
            onValueChange={(value) => setCreationType(value as CreationType)}
            className="grid grid-cols-2 gap-3"
          >
            <Label
              htmlFor="type-blank"
              className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer transition-all duration-150 hover:bg-gray-50 [&:has([data-state=checked])]:border-primary-500 [&:has([data-state=checked])]:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:[&:has([data-state=checked])]:bg-primary-900/20"
            >
              <RadioGroupItem value="blank" id="type-blank" className="sr-only" />
              <FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('newDialog.blankTemplate')}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {t('newDialog.startFromScratch')}
              </span>
            </Label>
            <Label
              htmlFor="type-ai"
              className={`flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer transition-all duration-150 hover:bg-gray-50 [&:has([data-state=checked])]:border-primary-500 [&:has([data-state=checked])]:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:[&:has([data-state=checked])]:bg-primary-900/20 ${!aiConfigured ? 'opacity-75' : ''}`}
            >
              <RadioGroupItem value="ai" id="type-ai" className="sr-only" disabled={!aiConfigured} />
              <Sparkles className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('newDialog.generateWithAI')}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {aiConfigured === false ? t('newDialog.configureInSettings') : t('newDialog.describeWhatYouNeed')}
              </span>
            </Label>
          </RadioGroup>

          {/* AI Configuration Notice */}
          {creationType === 'ai' && aiConfigured === false && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300 flex-1">
                {t('newDialog.aiNotConfigured')}{' '}
                <button
                  type="button"
                  onClick={handleOpenSettings}
                  className="underline hover:no-underline font-medium inline-flex items-center gap-1"
                >
                  <Settings className="h-3 w-3" />
                  {t('newDialog.configureInSettings')}
                </button>
              </p>
            </div>
          )}

          {/* AI Generation Form */}
          {creationType === 'ai' && aiConfigured && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  {t('newDialog.describePrompt')}
                </Label>
                <Textarea
                  id="description"
                  placeholder={t('newDialog.placeholder')}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    setError(null)
                  }}
                  className="min-h-[100px] resize-none"
                  disabled={isGenerating}
                />
                <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500">
                  {t('newDialog.aiDisclaimer')}
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            {t('common:buttons.cancel')}
          </Button>
          {creationType === 'blank' ? (
            <Button onClick={handleCreateBlank}>
              {t('newDialog.createBlank')}
            </Button>
          ) : (
            <Button
              onClick={handleGenerateWithAI}
              disabled={isGenerating || !aiConfigured || !description.trim()}
              className={isGenerating ? "gap-2" : ""}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('newDialog.generating')}
                </>
              ) : (
                t('newDialog.generate')
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
