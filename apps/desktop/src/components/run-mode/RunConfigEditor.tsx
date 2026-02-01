import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Loader2, Save, Info } from 'lucide-react'
import { toast } from 'sonner'
import { AIBehaviorSettings } from '@/components/prompt-settings/AIBehaviorSettings'
import { EvalSettings } from '@/components/prompt-settings/EvalSettings'
import {
  getLatestPromptRunConfig,
  createPromptVersion,
} from '@/lib/store'
import type { PromptRunConfig } from '@/types/prompt-config'
import type { AIPromptSettings, EvalConfig } from '@/types/prompt-config'
import type { PromptFile } from '@/types/prompt'

interface RunConfigEditorProps {
  prompt: PromptFile
  onVersionCreated?: () => void
}

/**
 * Config editor for the run detail view.
 * Allows editing AI behavior settings and saves as a new prompt version.
 * This enables continuous iteration on prompts from the run view.
 */
export function RunConfigEditor({ prompt, onVersionCreated }: RunConfigEditorProps) {
  const { t } = useTranslation(['runMode', 'prompts'])
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

  // Memoize hasChanges to avoid expensive JSON.stringify on every render (rerender-derived-state)
  const hasChanges = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(originalConfig),
    [config, originalConfig]
  )

  // Handler for saving settings as a new version
  const handleSaveAsNewVersion = useCallback(async () => {
    if (!hasChanges) {
      toast.info(t('runMode:config.noChanges'))
      return
    }

    setIsSaving(true)
    try {
      // Create a new version with the updated config using the prompt's raw content
      const result = await createPromptVersion(
        prompt.path,
        prompt.rawContent,
        'Config updated from run view',
        config
      )

      if (result.ok) {
        setOriginalConfig(config)
        toast.success(t('runMode:config.versionCreated'))
        onVersionCreated?.()
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }, [config, hasChanges, prompt.path, prompt.rawContent, t, onVersionCreated])

  // Stable callbacks for child components (rerender-functional-setstate)
  const handleAiPromptChange = useCallback((aiPrompt: AIPromptSettings) => {
    setConfig((prev) => ({ ...prev, aiPrompt }))
  }, [])

  const handleEvalsChange = useCallback((evals: EvalConfig) => {
    setConfig((prev) => ({ ...prev, evals }))
  }, [])

  // Keyboard shortcut for save
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && hasChanges) {
        e.preventDefault()
        handleSaveAsNewVersion()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSaveAsNewVersion, hasChanges])

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
        <div className="p-4 space-y-4">
          {/* Info banner */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {t('runMode:config.iterateDescription')}
            </p>
          </div>

          {/* AI Behavior Settings */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <AIBehaviorSettings
              value={config.aiPrompt}
              onChange={handleAiPromptChange}
            />
          </div>

          {/* Eval Settings */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <EvalSettings
              value={config.evals}
              onChange={handleEvalsChange}
            />
          </div>
        </div>
      </ScrollArea>

      {/* Save Footer */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-3">
        <Button
          onClick={handleSaveAsNewVersion}
          disabled={!hasChanges || isSaving}
          className="w-full gap-2"
          size="sm"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? t('runMode:config.saving') : t('runMode:config.saveAsNewVersion')}
        </Button>
      </div>
    </div>
  )
}
