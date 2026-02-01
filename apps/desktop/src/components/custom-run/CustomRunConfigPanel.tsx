import { useState, useEffect, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PromptTemplateEditor } from './PromptTemplateEditor'
import { AgentSelectorDropdown } from '@/components/AgentSelectorDropdown'
import { GraderSelector } from '@/components/graders/GraderSelector'
import { getProviderConfigs, type ProviderConfig } from '@/lib/store'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CustomRunState } from '@/types/custom-run'
import type { Variable } from '@/types/prompt'
import type { AgentFile } from '@/types/agent'

interface CustomRunConfigPanelProps {
  state: CustomRunState
  agents: AgentFile[]
  onPromptNameChange: (name: string) => void
  onPromptDescriptionChange: (description: string) => void
  onPromptTemplateChange: (template: string) => void
  onVariablesChange: (variables: Variable[]) => void
  onAgentIdChange: (agentId: string | null) => void
  onSystemPromptChange: (systemPrompt: string) => void
  onTemperatureChange: (temperature: number) => void
  onMaxTokensChange: (maxTokens: number | undefined) => void
  onProviderIdChange: (providerId: string | undefined) => void
  onGraderIdsChange: (graderIds: string[]) => void
}

interface ConfigSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

const ConfigSection = memo(function ConfigSection({ title, defaultOpen = false, children }: ConfigSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <span className="text-sm font-medium">{title}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-500 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">{children}</CollapsibleContent>
    </Collapsible>
  )
})

export function CustomRunConfigPanel({
  state,
  agents,
  onPromptNameChange,
  onPromptDescriptionChange,
  onPromptTemplateChange,
  onAgentIdChange,
  onSystemPromptChange,
  onTemperatureChange,
  onMaxTokensChange,
  onProviderIdChange,
  onGraderIdsChange,
}: CustomRunConfigPanelProps) {
  const { t } = useTranslation(['customRun', 'runMode'])
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([])

  // Load provider configs with cleanup to prevent race conditions
  useEffect(() => {
    let cancelled = false
    async function loadProviders() {
      const result = await getProviderConfigs()
      if (!cancelled && result.ok) {
        setProviderConfigs(result.data.configs)
      }
    }
    loadProviders()
    return () => {
      cancelled = true
    }
  }, [])

  // Get selected provider for display
  const selectedProvider = state.provider.defaultProviderId
    ? providerConfigs.find((p) => p.id === state.provider.defaultProviderId)
    : null

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-4">
        {/* Prompt Template Section */}
        <ConfigSection title={t('customRun:config.prompt')} defaultOpen>
          <PromptTemplateEditor
            name={state.promptName}
            description={state.promptDescription}
            template={state.promptTemplate}
            variables={state.variables}
            onNameChange={onPromptNameChange}
            onDescriptionChange={onPromptDescriptionChange}
            onTemplateChange={onPromptTemplateChange}
          />
        </ConfigSection>

        {/* AI Behavior Section */}
        <ConfigSection title={t('customRun:config.aiBehavior')}>
          <div className="space-y-4">
            {/* Agent selector */}
            {agents.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t('runMode:agent.label')}
                </Label>
                <AgentSelectorDropdown
                  selectedId={state.aiPrompt.agentId ?? null}
                  onSelectionChange={onAgentIdChange}
                  agents={agents}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('customRun:config.agentHint')}
                </p>
              </div>
            )}

            {/* System prompt (only if no agent selected) */}
            {!state.aiPrompt.agentId && (
              <div className="space-y-1.5">
                <Label htmlFor="system-prompt" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t('customRun:config.systemPrompt')}
                </Label>
                <Textarea
                  id="system-prompt"
                  value={state.aiPrompt.systemPrompt ?? ''}
                  onChange={(e) => onSystemPromptChange(e.target.value)}
                  placeholder={t('customRun:config.systemPromptPlaceholder')}
                  className="min-h-[80px] text-sm"
                />
              </div>
            )}

            {/* Temperature */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t('customRun:config.temperature')}
                </Label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {state.aiPrompt.temperature?.toFixed(1) ?? '0.7'}
                </span>
              </div>
              <Slider
                value={[state.aiPrompt.temperature ?? 0.7]}
                onValueChange={([value]) => onTemperatureChange(value)}
                min={0}
                max={2}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('customRun:config.temperatureHint')}
              </p>
            </div>

            {/* Max tokens */}
            <div className="space-y-1.5">
              <Label htmlFor="max-tokens" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {t('customRun:config.maxTokens')}
              </Label>
              <Input
                id="max-tokens"
                type="number"
                value={state.aiPrompt.maxTokens ?? ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value, 10) : undefined
                  onMaxTokensChange(value)
                }}
                placeholder={t('customRun:config.maxTokensPlaceholder')}
                className="h-8"
              />
            </div>
          </div>
        </ConfigSection>

        {/* Provider Section */}
        <ConfigSection title={t('customRun:config.provider')}>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {t('customRun:config.selectProvider')}
            </Label>
            {providerConfigs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('customRun:config.noProviders')}
              </p>
            ) : (
              <Select
                value={state.provider.defaultProviderId ?? '__default__'}
                onValueChange={(value) => onProviderIdChange(value === '__default__' ? undefined : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {selectedProvider ? (
                      <span>{selectedProvider.alias}</span>
                    ) : (
                      <span className="text-gray-500">{t('customRun:config.defaultProvider')}</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">
                    <span className="text-gray-500">{t('customRun:config.defaultProvider')}</span>
                  </SelectItem>
                  {providerConfigs.map((config) => (
                    <SelectItem key={config.id} value={config.id}>
                      <div className="flex items-center gap-2">
                        <span>{config.alias}</span>
                        <span className="text-xs text-gray-500">({config.model})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </ConfigSection>

        {/* Evaluation Section */}
        <ConfigSection title={t('customRun:config.evaluation')}>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {t('customRun:config.selectGraders')}
            </Label>
            <GraderSelector
              selectedIds={state.evals.graderIds}
              onSelectionChange={onGraderIdsChange}
            />
          </div>
        </ConfigSection>
      </div>
    </ScrollArea>
  )
}
