import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Settings } from 'lucide-react'
import { FeedbackForm } from './FeedbackForm'
import { CreateRuleFromFeedback } from '@/components/playbooks/CreateRuleFromFeedback'
import { getLatestPromptRunConfig } from '@/lib/store'
import type { HumanFeedbackConfig } from '@/types/prompt-config'

interface FeedbackTabProps {
  runId: string
  promptPath: string
  /** The interpolated prompt content (for creating playbook rules) */
  interpolatedPrompt?: string
  /** The AI's response (for creating playbook rules) */
  aiResponse?: string
  /** Whether playbooks feature is enabled */
  playbooksEnabled?: boolean
  onSave?: () => void
}

export function FeedbackTab({
  runId,
  promptPath,
  interpolatedPrompt,
  aiResponse,
  playbooksEnabled = false,
  onSave,
}: FeedbackTabProps) {
  const { t } = useTranslation('runs')
  const [feedbackConfig, setFeedbackConfig] = useState<HumanFeedbackConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [createRuleDialogOpen, setCreateRuleDialogOpen] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [promptPath])

  async function loadConfig() {
    setIsLoading(true)
    const result = await getLatestPromptRunConfig(promptPath)
    if (result.ok && result.data?.humanFeedback?.enabled) {
      setFeedbackConfig(result.data.humanFeedback)
    } else {
      setFeedbackConfig(null)
    }
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!feedbackConfig) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-3">
          <Settings className="h-6 w-6 text-gray-400" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('feedback.notConfigured')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('feedback.configureHint')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <FeedbackForm
        runId={runId}
        config={feedbackConfig}
        onSave={onSave}
        playbooksEnabled={playbooksEnabled}
        onCreateRule={() => setCreateRuleDialogOpen(true)}
      />
      {playbooksEnabled && (
        <CreateRuleFromFeedback
          open={createRuleDialogOpen}
          onOpenChange={setCreateRuleDialogOpen}
          badExampleInput={interpolatedPrompt}
          badExampleOutput={aiResponse}
          sourceRunId={runId}
        />
      )}
    </>
  )
}
