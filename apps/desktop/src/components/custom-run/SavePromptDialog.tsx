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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2 } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { createPrompt } from '@/lib/prompts'
import { createPromptVersion } from '@/lib/store'
import { toast } from 'sonner'
import type { SavePromptConfig } from '@/types/custom-run'

interface SavePromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  saveConfig: SavePromptConfig
  isFromExisting: boolean
  basePromptPath?: string
  onSaved?: (promptId: string) => void
}

type SaveMode = 'new' | 'version'

export function SavePromptDialog({
  open,
  onOpenChange,
  saveConfig,
  isFromExisting,
  basePromptPath,
  onSaved,
}: SavePromptDialogProps) {
  const { t } = useTranslation(['customRun', 'common'])
  const { promptManager, folderPath } = useAppContext()

  const [saveMode, setSaveMode] = useState<SaveMode>(isFromExisting ? 'version' : 'new')
  const [promptName, setPromptName] = useState(saveConfig.name || '')
  const [versionDescription, setVersionDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    if (!folderPath) {
      toast.error(t('customRun:save.noFolder'))
      return
    }

    setIsSaving(true)

    try {
      if (saveMode === 'version' && basePromptPath) {
        // Save as new version of existing prompt
        await createPromptVersion(
          basePromptPath,
          generatePromptContent(saveConfig, promptName),
          versionDescription || undefined,
          {
            aiPrompt: saveConfig.aiPrompt,
            provider: saveConfig.provider,
            evals: saveConfig.evals,
          }
        )
        toast.success(t('customRun:save.versionSuccess'))
        onOpenChange(false)
        // Find the prompt ID from path
        const existingPrompt = promptManager.prompts.find((p) => p.path === basePromptPath)
        if (existingPrompt) {
          onSaved?.(existingPrompt.id)
        }
      } else {
        // Create new prompt
        const existingFileNames = promptManager.prompts.map((p) => p.fileName)
        const existingDisplayNames = promptManager.prompts.map((p) => p.name)

        const newPrompt = await createPrompt(folderPath, existingFileNames, existingDisplayNames, {
          name: promptName,
          description: saveConfig.description,
          template: saveConfig.template,
          variables: saveConfig.variables,
          tags: saveConfig.tags,
        })

        // Reload prompts
        if (folderPath) {
          await promptManager.loadPromptsFromFolder(folderPath)
        }

        toast.success(t('customRun:save.newSuccess', { name: promptName }))
        onOpenChange(false)
        onSaved?.(newPrompt.id)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.error(t('customRun:save.error', { message }))
    } finally {
      setIsSaving(false)
    }
  }

  // Generate prompt file content
  function generatePromptContent(config: SavePromptConfig, name: string): string {
    const frontmatter: Record<string, unknown> = {
      id: crypto.randomUUID(),
      name,
      description: config.description,
    }

    if (config.tags.length > 0) {
      frontmatter.tags = config.tags
    }

    if (config.variables.length > 0) {
      frontmatter.variables = config.variables.map((v) => {
        const cleaned: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(v)) {
          if (value !== undefined) {
            cleaned[key] = value
          }
        }
        return cleaned
      })
    }

    const yamlLines = Object.entries(frontmatter)
      .map(([key, value]) => {
        if (typeof value === 'string') {
          return `${key}: "${value}"`
        }
        if (Array.isArray(value)) {
          if (value.length === 0) return `${key}: []`
          return `${key}:\n${value.map((v) => `  - ${typeof v === 'object' ? JSON.stringify(v) : `"${v}"`}`).join('\n')}`
        }
        return `${key}: ${value}`
      })
      .join('\n')

    return `---\n${yamlLines}\n---\n\n${config.template}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('customRun:save.title')}</DialogTitle>
          <DialogDescription>{t('customRun:save.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Save mode selection (only if from existing) */}
          {isFromExisting && basePromptPath && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t('customRun:save.saveAsLabel')}
              </Label>
              <RadioGroup
                value={saveMode}
                onValueChange={(value) => setSaveMode(value as SaveMode)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="version" id="save-version" />
                  <Label htmlFor="save-version" className="text-sm font-normal cursor-pointer">
                    {t('customRun:save.asVersion')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="save-new" />
                  <Label htmlFor="save-new" className="text-sm font-normal cursor-pointer">
                    {t('customRun:save.asNew')}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Prompt name (for new prompt) */}
          {(saveMode === 'new' || !isFromExisting) && (
            <div className="space-y-1.5">
              <Label htmlFor="prompt-name">{t('customRun:save.nameLabel')}</Label>
              <Input
                id="prompt-name"
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                placeholder={t('customRun:save.namePlaceholder')}
              />
            </div>
          )}

          {/* Version description (for version) */}
          {saveMode === 'version' && isFromExisting && (
            <div className="space-y-1.5">
              <Label htmlFor="version-description">
                {t('customRun:save.versionDescriptionLabel')}
              </Label>
              <Input
                id="version-description"
                value={versionDescription}
                onChange={(e) => setVersionDescription(e.target.value)}
                placeholder={t('customRun:save.versionDescriptionPlaceholder')}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {t('common:buttons.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || (saveMode === 'new' && !promptName.trim())}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('customRun:save.saving')}
              </>
            ) : (
              t('customRun:save.saveButton')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
