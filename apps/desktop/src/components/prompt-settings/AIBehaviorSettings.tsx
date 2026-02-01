import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { AgentSelectorDropdown } from '@/components/AgentSelectorDropdown'
import { loadAgents } from '@/lib/agents'
import { useAppContext } from '@/context/AppContext'
import type { AIPromptSettings } from '@/types/prompt-config'
import type { AgentFile } from '@/types/agent'

interface AIBehaviorSettingsProps {
  value: AIPromptSettings | undefined
  onChange: (value: AIPromptSettings) => void
}

type PromptSourceType = 'agent' | 'custom'

export function AIBehaviorSettings({ value, onChange }: AIBehaviorSettingsProps) {
  const { t } = useTranslation('prompts')
  const { folderPath } = useAppContext()
  const [agents, setAgents] = useState<AgentFile[]>([])

  const currentValue: AIPromptSettings = value ?? {
    agentId: undefined,
    systemPrompt: undefined,
    temperature: 0.7,
    maxTokens: undefined,
  }

  // Track source type as local state - initialize based on whether agentId exists
  const [sourceType, setSourceType] = useState<PromptSourceType>(
    currentValue.agentId ? 'agent' : 'custom'
  )

  // Sync source type when value changes externally (e.g., loading saved config)
  useEffect(() => {
    if (currentValue.agentId) {
      setSourceType('agent')
    } else if (currentValue.systemPrompt) {
      setSourceType('custom')
    }
  }, [currentValue.agentId, currentValue.systemPrompt])

  // Load agents on mount
  useEffect(() => {
    async function load() {
      if (folderPath) {
        const loaded = await loadAgents(folderPath)
        setAgents(loaded.filter(a => a.isValid))
      }
    }
    load()
  }, [folderPath])

  function handleSourceTypeChange(type: PromptSourceType) {
    setSourceType(type)
    if (type === 'agent') {
      // Clear custom system prompt when switching to agent
      onChange({
        ...currentValue,
        systemPrompt: undefined,
      })
    } else {
      // Clear agent ID when switching to custom
      onChange({
        ...currentValue,
        agentId: undefined,
      })
    }
  }

  function handleAgentChange(agentId: string | null) {
    onChange({
      ...currentValue,
      agentId: agentId ?? undefined,
      systemPrompt: undefined, // Clear custom prompt when selecting agent
    })
  }

  function handleSystemPromptChange(systemPrompt: string) {
    onChange({
      ...currentValue,
      systemPrompt: systemPrompt || undefined,
      agentId: undefined, // Clear agent when using custom prompt
    })
  }

  function handleTemperatureChange(temperature: number[]) {
    onChange({
      ...currentValue,
      temperature: temperature[0],
    })
  }

  function handleMaxTokensChange(maxTokens: string) {
    const parsed = parseInt(maxTokens, 10)
    onChange({
      ...currentValue,
      maxTokens: isNaN(parsed) ? undefined : parsed,
    })
  }

  // Get selected agent details for display
  const selectedAgent = currentValue.agentId
    ? agents.find(a => a.id === currentValue.agentId)
    : null

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {t('settings.aiBehavior.title')}
      </h3>

      <div className="space-y-4">
        {/* Prompt Source Type Selection */}
        <div className="space-y-3">
          <Label className="text-sm text-gray-700 dark:text-gray-300">
            {t('settings.aiBehavior.promptSource')}
          </Label>
          <RadioGroup
            value={sourceType}
            onValueChange={(v) => handleSourceTypeChange(v as PromptSourceType)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="agent" id="source-agent" />
              <Label htmlFor="source-agent" className="text-sm font-normal cursor-pointer">
                {t('settings.aiBehavior.useAgent')}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="source-custom" />
              <Label htmlFor="source-custom" className="text-sm font-normal cursor-pointer">
                {t('settings.aiBehavior.useCustomPrompt')}
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Agent Selection (when using agent) */}
        {sourceType === 'agent' && (
          <div className="space-y-2">
            <Label className="text-sm text-gray-700 dark:text-gray-300">
              {t('settings.aiBehavior.selectAgent')}
            </Label>
            <AgentSelectorDropdown
              selectedId={currentValue.agentId ?? null}
              onSelectionChange={handleAgentChange}
              agents={agents}
              placeholder={t('settings.aiBehavior.selectAgentPlaceholder')}
            />
            {selectedAgent && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedAgent.name}
                </p>
                {selectedAgent.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {selectedAgent.description}
                  </p>
                )}
                <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {t('settings.aiBehavior.agentSystemPrompt')}
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3 whitespace-pre-wrap">
                    {selectedAgent.systemPrompt}
                  </p>
                </div>
              </div>
            )}
            {!selectedAgent && agents.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                {t('settings.aiBehavior.noAgentsAvailable', 'No agents available. Create an agent first.')}
              </p>
            )}
          </div>
        )}

        {/* Custom System Prompt (when using custom) */}
        {sourceType === 'custom' && (
          <div className="space-y-2">
            <Label htmlFor="system-prompt" className="text-sm text-gray-700 dark:text-gray-300">
              {t('settings.aiBehavior.systemPrompt')}
            </Label>
            <Textarea
              id="system-prompt"
              value={currentValue.systemPrompt ?? ''}
              onChange={(e) => handleSystemPromptChange(e.target.value)}
              placeholder={t('settings.aiBehavior.systemPromptPlaceholder')}
              className="min-h-[100px] resize-none"
            />
          </div>
        )}

        {/* Temperature */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="temperature" className="text-sm text-gray-700 dark:text-gray-300">
              {t('settings.aiBehavior.temperature')}
            </Label>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {(currentValue.temperature ?? 0.7).toFixed(1)}
            </span>
          </div>
          <Slider
            id="temperature"
            value={[currentValue.temperature ?? 0.7]}
            onValueChange={handleTemperatureChange}
            min={0}
            max={2}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Max Tokens */}
        <div className="space-y-2">
          <Label htmlFor="max-tokens" className="text-sm text-gray-700 dark:text-gray-300">
            {t('settings.aiBehavior.maxTokens')}
          </Label>
          <Input
            id="max-tokens"
            type="number"
            value={currentValue.maxTokens ?? ''}
            onChange={(e) => handleMaxTokensChange(e.target.value)}
            placeholder="2048"
            min={1}
            max={100000}
          />
        </div>
      </div>
    </div>
  )
}
