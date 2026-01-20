import { generatePrompt, refineTemplate, summarizeChanges, fillFormFields, fillSingleField, type AIConfig, type GeneratedPrompt, type GeneratePromptResult, type RefineTemplateResult, type SummarizeChangesResult, type FillFieldsResult, type FillFieldDefinition, type FillSingleFieldResult } from '../../mastra/src'
import { getAISettings, type AISettings } from './store'
import type { Variable } from '@/types/prompt'

export type { GeneratedPrompt, GeneratePromptResult, RefineTemplateResult, SummarizeChangesResult, FillFieldsResult, FillSingleFieldResult }

export async function generatePromptTemplate(
  description: string,
  existingTags?: string[]
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

  return generatePrompt({ description, existingTags }, config)
}

function getDefaultModel(provider: AISettings['provider']): string {
  switch (provider) {
    case 'openai':
      return 'gpt-5.2'
    case 'anthropic':
      return 'claude-sonnet-4-5'
    case 'google':
      return 'gemini-2.5-flash'
    default:
      return 'gpt-5.2'
  }
}

export async function refinePromptTemplate(
  template: string,
  instruction: string
): Promise<RefineTemplateResult> {
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

  return refineTemplate({ template, instruction }, config)
}

export async function summarizePromptChanges(
  previousContent: string,
  currentContent: string
): Promise<SummarizeChangesResult> {
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

  return summarizeChanges({ previousContent, currentContent }, config)
}

export async function fillFormFieldsWithContext(
  context: string,
  variables: Variable[]
): Promise<FillFieldsResult> {
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

  // Transform Variable[] to FillFieldDefinition[]
  const fields: FillFieldDefinition[] = variables.map((v) => ({
    key: v.key,
    label: v.label,
    type: v.type,
    options: v.options?.map((opt) => opt.value),
    min: v.min,
    max: v.max,
  }))

  return fillFormFields({ context, fields }, config)
}

export async function fillSingleFieldWithAI(
  targetVariable: Variable,
  otherVariables: Variable[],
  currentValues: Record<string, unknown>,
  userPrompt: string
): Promise<FillSingleFieldResult> {
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

  // Build input for single field fill
  const input = {
    targetField: {
      key: targetVariable.key,
      label: targetVariable.label,
      type: targetVariable.type as 'text' | 'textarea',
      description: targetVariable.description,
      placeholder: targetVariable.placeholder,
    },
    otherFields: otherVariables.map((v) => ({
      key: v.key,
      label: v.label,
      value: currentValues[v.key],
    })),
    userPrompt,
  }

  return fillSingleField(input, config)
}
