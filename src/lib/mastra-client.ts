import { generatePrompt, type AIConfig, type GeneratedPrompt, type GeneratePromptResult } from '../../mastra/src'
import { getAISettings, type AISettings } from './store'

export type { GeneratedPrompt, GeneratePromptResult }

export interface GenerateOptions {
  outputFormat?: 'markdown' | 'json' | 'code'
}

export async function generatePromptTemplate(
  description: string,
  options: GenerateOptions = {}
): Promise<GeneratePromptResult> {
  // Get AI settings from store
  const settingsResult = await getAISettings()
  if (!settingsResult.ok) {
    return {
      ok: false,
      error: settingsResult.error,
      code: 'GENERATION_FAILED',
    }
  }

  const settings = settingsResult.data
  if (!settings.provider || !settings.apiKey) {
    return {
      ok: false,
      error: 'AI provider not configured. Please configure it in Settings.',
      code: 'GENERATION_FAILED',
    }
  }

  const config: AIConfig = {
    provider: settings.provider,
    apiKey: settings.apiKey,
    model: settings.model || getDefaultModel(settings.provider),
  }

  return generatePrompt(
    {
      description,
      outputFormat: options.outputFormat,
    },
    config
  )
}

function getDefaultModel(provider: AISettings['provider']): string {
  switch (provider) {
    case 'openai':
      return 'gpt-4o'
    case 'anthropic':
      return 'claude-sonnet-4-20250514'
    case 'google':
      return 'gemini-2.0-flash'
    default:
      return 'gpt-4o'
  }
}
