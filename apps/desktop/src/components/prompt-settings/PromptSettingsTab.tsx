import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { ProviderSettings } from './ProviderSettings'
import { AIBehaviorSettings } from './AIBehaviorSettings'
import { HumanFeedbackSettings } from './HumanFeedbackSettings'
import { EvalSettings } from './EvalSettings'
import {
  getLatestPromptRunConfig,
  updatePromptRunConfig,
} from '@/lib/store'
import type { PromptRunConfig } from '@/types/prompt-config'
import type { PromptFile } from '@/types/prompt'

interface PromptSettingsTabProps {
  prompt: PromptFile
  onSave?: () => void
}

export function PromptSettingsTab({ prompt, onSave }: PromptSettingsTabProps) {
  const { t } = useTranslation('prompts')
  const [config, setConfig] = useState<PromptRunConfig>({})
  const [originalConfig, setOriginalConfig] = useState<PromptRunConfig>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Load existing config on mount
  useEffect(() => {
    loadConfig()
  }, [prompt.path])

  async function loadConfig() {
    setIsLoading(true)
    const result = await getLatestPromptRunConfig(prompt.path)
    if (result.ok && result.data) {
      setConfig(result.data)
      setOriginalConfig(result.data)
    } else {
      setConfig({})
      setOriginalConfig({})
    }
    setIsLoading(false)
  }

  // Check if config has changed
  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig)

  // Handler for saving settings
  const handleSave = useCallback(async () => {
    if (!hasChanges) return

    setIsSaving(true)
    try {
      // Update the run config in the latest version
      const result = await updatePromptRunConfig(prompt.path, config)
      if (result.ok) {
        setOriginalConfig(config)
        toast.success(t('toasts:success.settingsSaved', 'Settings saved'))
        onSave?.()
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }, [config, hasChanges, prompt.path, t, onSave])

  // Keyboard shortcut for save
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && hasChanges) {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, hasChanges])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Provider Settings */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <ProviderSettings
              value={config.provider}
              onChange={(provider) => setConfig({ ...config, provider })}
            />
          </div>

          {/* AI Behavior Settings */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <AIBehaviorSettings
              value={config.aiPrompt}
              onChange={(aiPrompt) => setConfig({ ...config, aiPrompt })}
            />
          </div>

          {/* Human Feedback Settings */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <HumanFeedbackSettings
              value={config.humanFeedback}
              onChange={(humanFeedback) => setConfig({ ...config, humanFeedback })}
            />
          </div>

          {/* Eval Settings */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <EvalSettings
              value={config.evals}
              onChange={(evals) => setConfig({ ...config, evals })}
            />
          </div>
        </div>
      </ScrollArea>

      {/* Save Footer */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('settings.saveDescription')}
          </p>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t('settings.saveButton')}
          </Button>
        </div>
      </div>
    </div>
  )
}
