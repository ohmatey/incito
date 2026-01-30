import { generatePrompt, refineTemplate, summarizeChanges, fillFormFields, fillSingleField, translatePrompt, SYSTEM_PROMPT as PROMPT_GENERATOR_SYSTEM, type AIConfig, type GeneratedPrompt, type GeneratePromptResult, type RefineTemplateResult, type SummarizeChangesResult, type FillFieldsResult, type FillFieldDefinition, type FillSingleFieldResult, type TranslatePromptResult } from '../../mastra/src'
import { getAISettings, getCachedTranslation, cacheTranslation, getProviderConfig, getDefaultProviderConfig, type AISettings, type ProviderConfig, type Result } from './store'
import { ensureClaudeCodeServer, streamWithClaudeCode, checkClaudeCodeAuth, generateWithClaudeCode } from './claude-code-client'
import type { Variable, LanguageCode, TranslationConfidence } from '@/types/prompt'
import type { ChatMessage, AgentSettings, ChatAttachment } from '@/types/agent'

export type { GeneratedPrompt, GeneratePromptResult, RefineTemplateResult, SummarizeChangesResult, FillFieldsResult, FillSingleFieldResult, TranslatePromptResult }
export type { TokenUsage }

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
  // Claude Code uses CLI authentication, no API key needed
  const needsApiKey = settings.provider !== 'claude-code'
  if (!settings.provider || (needsApiKey && !settings.apiKey)) {
    return {
      ok: false,
      error: 'AI provider not configured. Please configure it in Settings.',
      code: 'GENERATION_FAILED',
    }
  }

  // Handle Claude Code via sidecar
  if (settings.provider === 'claude-code') {
    return generatePromptWithClaudeCodeSidecar(description, existingTags, settings.model || 'sonnet', settings.claudeCodeExecutablePath)
  }

  const config: AIConfig = {
    provider: settings.provider,
    apiKey: settings.apiKey || '',
    model: settings.model || getDefaultModel(settings.provider),
  }

  return generatePrompt({ description, existingTags }, config)
}

async function generatePromptWithClaudeCodeSidecar(
  description: string,
  existingTags: string[] | undefined,
  model: string,
  executablePath?: string | null
): Promise<GeneratePromptResult> {
  try {
    // Ensure sidecar is running
    const serverReady = await ensureClaudeCodeServer(executablePath)
    if (!serverReady) {
      return {
        ok: false,
        error: 'Failed to start Claude Code server. Please check that the application was installed correctly.',
        code: 'GENERATION_FAILED',
      }
    }

    // Check authentication
    const authStatus = await checkClaudeCodeAuth()
    if (!authStatus.authenticated) {
      return {
        ok: false,
        error: `Claude CLI not authenticated. ${authStatus.hint || 'Run "claude login" to authenticate.'}`,
        code: 'INVALID_API_KEY',
      }
    }

    // Build the prompt
    let fullPrompt = description
    if (existingTags && existingTags.length > 0) {
      fullPrompt += `\n\nExisting tags you can use (only use tags from this list): ${existingTags.join(', ')}`
    } else {
      fullPrompt += `\n\nNo existing tags are defined. Set "tags" to an empty array [].`
    }

    // Generate using sidecar
    const response = await generateWithClaudeCode(fullPrompt, {
      model: model as 'opus' | 'sonnet' | 'haiku',
      system: PROMPT_GENERATOR_SYSTEM,
    })

    // Parse the JSON response
    const text = response.text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        ok: false,
        error: 'Failed to parse generated prompt - no JSON found in response',
        code: 'INVALID_RESPONSE',
      }
    }

    const parsed = JSON.parse(jsonMatch[0]) as GeneratedPrompt
    return { ok: true, data: parsed }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Generation failed',
      code: 'GENERATION_FAILED',
    }
  }
}

function getDefaultModel(provider: AISettings['provider']): string {
  switch (provider) {
    case 'openai':
      return 'gpt-5.2'
    case 'anthropic':
      return 'claude-sonnet-4-5'
    case 'google':
      return 'gemini-2.5-flash'
    case 'claude-code':
      return 'sonnet'
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
  // Claude Code uses CLI authentication, no API key needed
  const needsApiKey = settings.provider !== 'claude-code'
  if (!settings.provider || (needsApiKey && !settings.apiKey)) {
    return {
      ok: false,
      error: 'AI provider not configured. Please configure it in Settings.',
      code: 'GENERATION_FAILED',
    }
  }

  const config: AIConfig = {
    provider: settings.provider,
    apiKey: settings.apiKey || '',
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
  // Claude Code uses CLI authentication, no API key needed
  const needsApiKey = settings.provider !== 'claude-code'
  if (!settings.provider || (needsApiKey && !settings.apiKey)) {
    return {
      ok: false,
      error: 'AI provider not configured. Please configure it in Settings.',
      code: 'GENERATION_FAILED',
    }
  }

  const config: AIConfig = {
    provider: settings.provider,
    apiKey: settings.apiKey || '',
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
  // Claude Code uses CLI authentication, no API key needed
  const needsApiKey = settings.provider !== 'claude-code'
  if (!settings.provider || (needsApiKey && !settings.apiKey)) {
    return {
      ok: false,
      error: 'AI provider not configured. Please configure it in Settings.',
      code: 'GENERATION_FAILED',
    }
  }

  const config: AIConfig = {
    provider: settings.provider,
    apiKey: settings.apiKey || '',
    model: settings.model || getDefaultModel(settings.provider),
  }

  // Transform Variable[] to FillFieldDefinition[] (filter out image type which can't be filled with AI)
  const fields: FillFieldDefinition[] = variables
    .filter((v) => v.type !== 'image')
    .map((v) => ({
      key: v.key,
      label: v.label,
      type: v.type as FillFieldDefinition['type'],
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
  // Claude Code uses CLI authentication, no API key needed
  const needsApiKey = settings.provider !== 'claude-code'
  if (!settings.provider || (needsApiKey && !settings.apiKey)) {
    return {
      ok: false,
      error: 'AI provider not configured. Please configure it in Settings.',
      code: 'GENERATION_FAILED',
    }
  }

  const config: AIConfig = {
    provider: settings.provider,
    apiKey: settings.apiKey || '',
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

export interface TranslatePromptOptions {
  text: string
  sourceLanguage: LanguageCode
  targetLanguage: LanguageCode
  context?: 'coding' | 'general'
  skipCache?: boolean
}

export interface TranslationResultData {
  translated: string
  confidence: TranslationConfidence
  preservedTerms: string[]
  fromCache: boolean
}

export type TranslateResult = {
  ok: true
  data: TranslationResultData
} | {
  ok: false
  error: string
  code?: 'INVALID_API_KEY' | 'RATE_LIMITED' | 'TRANSLATION_FAILED' | 'INVALID_RESPONSE' | 'NO_AI_CONFIGURED'
}

export async function translatePromptText(
  options: TranslatePromptOptions
): Promise<TranslateResult> {
  const { text, sourceLanguage, targetLanguage, context = 'coding', skipCache = false } = options

  // Check cache first (unless skipped)
  if (!skipCache) {
    const cachedResult = await getCachedTranslation(text, sourceLanguage, targetLanguage)
    if (cachedResult.ok && cachedResult.data) {
      return {
        ok: true,
        data: {
          translated: cachedResult.data.translatedText,
          confidence: cachedResult.data.confidence,
          preservedTerms: [],
          fromCache: true,
        },
      }
    }
  }

  // Get AI settings from store
  const settingsResult = await getAISettings()
  if (!settingsResult.ok) {
    return {
      ok: false,
      error: settingsResult.error,
      code: 'TRANSLATION_FAILED',
    }
  }

  const settings = settingsResult.data
  // Claude Code uses CLI authentication, no API key needed
  const needsApiKey = settings.provider !== 'claude-code'
  if (!settings.provider || (needsApiKey && !settings.apiKey)) {
    return {
      ok: false,
      error: 'AI provider not configured. Please configure it in Settings.',
      code: 'NO_AI_CONFIGURED',
    }
  }

  const config: AIConfig = {
    provider: settings.provider,
    apiKey: settings.apiKey || '',
    model: settings.model || getDefaultModel(settings.provider),
  }

  // Call the translation API
  const result = await translatePrompt(
    {
      text,
      sourceLanguage,
      targetLanguage,
      context,
    },
    config
  )

  if (!result.ok) {
    return result
  }

  // Cache the successful translation
  await cacheTranslation(
    text,
    sourceLanguage,
    targetLanguage,
    result.data.translated,
    result.data.confidence
  )

  return {
    ok: true,
    data: {
      translated: result.data.translated,
      confidence: result.data.confidence,
      preservedTerms: result.data.preservedTerms,
      fromCache: false,
    },
  }
}

// ============================================================================
// Provider Configuration Resolution
// ============================================================================

/**
 * Resolves a provider configuration by ID, falling back to default if not specified.
 * Used by agent chat and graders to determine which AI provider to use.
 */
export async function resolveProviderConfig(
  providerId?: string | null
): Promise<Result<ProviderConfig>> {
  // If a specific provider is requested, try to get it
  if (providerId) {
    const result = await getProviderConfig(providerId)
    if (result.ok && result.data) {
      return { ok: true, data: result.data }
    }
    // Provider not found, fall through to default
  }

  // Get the default provider
  const defaultResult = await getDefaultProviderConfig()
  if (defaultResult.ok && defaultResult.data) {
    return { ok: true, data: defaultResult.data }
  }

  return { ok: false, error: 'No AI provider configured. Please configure a provider in Settings.' }
}

// ============================================================================
// Generic Chat Streaming with Tool Support
// ============================================================================

export interface StreamChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// Token usage information from API responses
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
}

export interface StreamChatOptions {
  systemPrompt: string
  messages: StreamChatMessage[]
  tools?: Array<{
    type: 'function'
    function: {
      name: string
      description: string
      parameters: Record<string, unknown>
    }
  }>
  onChunk: (chunk: string) => void
  onToolCall?: (toolCall: { name: string; arguments: string }) => void
  onComplete: (usage?: TokenUsage) => void
  onError: (error: Error) => void
  signal?: AbortSignal
}

/**
 * Options for streaming with a specific provider configuration.
 * Used for parallel execution across multiple providers.
 */
export interface StreamWithProviderOptions {
  providerConfig: {
    provider: 'openai' | 'anthropic' | 'google' | 'claude-code'
    apiKey: string | null
    model: string
    claudeCodeExecutablePath?: string | null
  }
  systemPrompt: string
  messages: StreamChatMessage[]
  onChunk: (chunk: string) => void
  onComplete: (usage?: TokenUsage) => void
  onError: (error: Error) => void
  signal?: AbortSignal
}

/**
 * Stream a chat completion using a specific provider configuration.
 * This allows running the same prompt against multiple providers in parallel.
 */
export async function streamWithProvider(options: StreamWithProviderOptions): Promise<void> {
  const { providerConfig, systemPrompt, messages, onChunk, onComplete, onError, signal } = options
  const { provider, apiKey, model, claudeCodeExecutablePath } = providerConfig

  // Validate provider config
  if (provider !== 'claude-code' && !apiKey) {
    onError(new Error(`API key required for provider: ${provider}`))
    return
  }

  try {
    if (provider === 'claude-code') {
      await streamClaudeCode(model, systemPrompt, messages, onChunk, onComplete, onError, signal, claudeCodeExecutablePath)
    } else {
      // Build messages array for the API
      const apiMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ]

      switch (provider) {
        case 'openai':
          await streamOpenAI(apiKey!, model, apiMessages, onChunk, onComplete, onError, signal)
          break
        case 'anthropic':
          await streamAnthropicGeneric(apiKey!, model, systemPrompt, messages, onChunk, onComplete, onError, signal)
          break
        case 'google':
          await streamGoogle(apiKey!, model, apiMessages, onChunk, onComplete, onError, signal)
          break
        default:
          onError(new Error(`Unsupported provider: ${provider}`))
      }
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      onError(error instanceof Error ? error : new Error(String(error)))
    }
  }
}

export async function streamChat(options: StreamChatOptions): Promise<void> {
  const { systemPrompt, messages, tools, onChunk, onToolCall, onComplete, onError, signal } = options

  // Get AI settings from store
  const settingsResult = await getAISettings()
  if (!settingsResult.ok) {
    onError(new Error(settingsResult.error))
    return
  }

  const aiSettings = settingsResult.data
  // Claude Code uses CLI authentication, no API key needed
  const needsApiKey = aiSettings.provider !== 'claude-code'
  if (!aiSettings.provider || (needsApiKey && !aiSettings.apiKey)) {
    onError(new Error('AI provider not configured. Please configure it in Settings.'))
    return
  }

  const model = aiSettings.model || getDefaultModel(aiSettings.provider)

  try {
    // Currently only OpenAI supports streaming with tools properly
    // For other providers, fall back to non-tool streaming
    if (aiSettings.provider === 'openai' && tools) {
      await streamOpenAIWithTools(
        aiSettings.apiKey!,
        model,
        systemPrompt,
        messages,
        tools,
        onChunk,
        onToolCall,
        onComplete,
        onError,
        signal
      )
    } else if (aiSettings.provider === 'claude-code') {
      // Claude Code uses the AI SDK provider which handles streaming internally
      // For now, use Anthropic-style streaming since Claude Code models are Claude models
      await streamClaudeCode(model, systemPrompt, messages, onChunk, onComplete, onError, signal, aiSettings.claudeCodeExecutablePath)
    } else {
      // Build messages array for the API (without tools)
      const apiMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ]

      switch (aiSettings.provider) {
        case 'openai':
          await streamOpenAI(aiSettings.apiKey!, model, apiMessages, onChunk, onComplete, onError, signal)
          break
        case 'anthropic':
          await streamAnthropicGeneric(aiSettings.apiKey!, model, systemPrompt, messages, onChunk, onComplete, onError, signal)
          break
        case 'google':
          await streamGoogle(aiSettings.apiKey!, model, apiMessages, onChunk, onComplete, onError, signal)
          break
        default:
          onError(new Error(`Unsupported provider: ${aiSettings.provider}`))
      }
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      onError(error instanceof Error ? error : new Error(String(error)))
    }
  }
}

async function streamOpenAIWithTools(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: StreamChatMessage[],
  tools: StreamChatOptions['tools'],
  onChunk: (chunk: string) => void,
  onToolCall: ((toolCall: { name: string; arguments: string }) => void) | undefined,
  onComplete: (usage?: TokenUsage) => void,
  onError: (error: Error) => void,
  signal?: AbortSignal
): Promise<void> {
  const apiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ]

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: apiMessages,
      tools,
      stream: true,
      stream_options: { include_usage: true },
    }),
    signal,
  })

  if (!response.ok) {
    const error = await response.text()
    onError(new Error(`OpenAI API error: ${error}`))
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError(new Error('No response body'))
    return
  }

  const decoder = new TextDecoder()
  let currentToolCall: { name: string; arguments: string } | null = null
  let usage: TokenUsage | undefined

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter((line) => line.trim() !== '')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') {
          // Emit any pending tool call
          if (currentToolCall && onToolCall) {
            onToolCall(currentToolCall)
          }
          onComplete(usage)
          return
        }
        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta

          // Handle content
          if (delta?.content) {
            onChunk(delta.content)
          }

          // Handle tool calls
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.function?.name) {
                // New tool call starting
                if (currentToolCall && onToolCall) {
                  onToolCall(currentToolCall)
                }
                currentToolCall = { name: tc.function.name, arguments: '' }
              }
              if (tc.function?.arguments && currentToolCall) {
                currentToolCall.arguments += tc.function.arguments
              }
            }
          }

          // Capture usage from final chunk
          if (parsed.usage) {
            usage = {
              inputTokens: parsed.usage.prompt_tokens ?? 0,
              outputTokens: parsed.usage.completion_tokens ?? 0,
            }
          }
        } catch {
          // Ignore parsing errors for incomplete JSON
        }
      }
    }
  }

  // Emit any pending tool call
  if (currentToolCall && onToolCall) {
    onToolCall(currentToolCall)
  }
  onComplete(usage)
}

async function streamAnthropicGeneric(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: StreamChatMessage[],
  onChunk: (chunk: string) => void,
  onComplete: (usage?: TokenUsage) => void,
  onError: (error: Error) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      stream: true,
    }),
    signal,
  })

  if (!response.ok) {
    const error = await response.text()
    onError(new Error(`Anthropic API error: ${error}`))
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError(new Error('No response body'))
    return
  }

  const decoder = new TextDecoder()
  let usage: TokenUsage | undefined

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter((line) => line.trim() !== '')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'content_block_delta') {
            const text = parsed.delta?.text
            if (text) {
              onChunk(text)
            }
          } else if (parsed.type === 'message_delta' && parsed.usage) {
            // Anthropic provides output_tokens in message_delta
            usage = {
              inputTokens: usage?.inputTokens ?? 0,
              outputTokens: parsed.usage.output_tokens ?? 0,
            }
          } else if (parsed.type === 'message_start' && parsed.message?.usage) {
            // Anthropic provides input_tokens in message_start
            usage = {
              inputTokens: parsed.message.usage.input_tokens ?? 0,
              outputTokens: usage?.outputTokens ?? 0,
            }
          } else if (parsed.type === 'message_stop') {
            onComplete(usage)
            return
          }
        } catch {
          // Ignore parsing errors for incomplete JSON
        }
      }
    }
  }
  onComplete(usage)
}

// Multimodal content building for different providers

type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

type AnthropicContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

function buildOpenAIMultimodalContent(text: string, attachments?: ChatAttachment[]): string | OpenAIContentPart[] {
  if (!attachments || attachments.length === 0) return text

  const content: OpenAIContentPart[] = []

  // Add images first
  for (const attachment of attachments) {
    if (attachment.type === 'image') {
      content.push({
        type: 'image_url',
        image_url: { url: `data:${attachment.mimeType};base64,${attachment.base64Data}` }
      })
    } else if (attachment.type === 'text' || attachment.type === 'pdf') {
      // For text files, decode and include as text
      try {
        const decoded = atob(attachment.base64Data)
        content.push({
          type: 'text',
          text: `[File: ${attachment.fileName}]\n${decoded}\n[End of file]`
        })
      } catch {
        // If decoding fails, mention the file
        content.push({
          type: 'text',
          text: `[Attached file: ${attachment.fileName}]`
        })
      }
    }
  }

  // Add the user's text message
  if (text) {
    content.push({ type: 'text', text })
  }

  return content.length > 0 ? content : text
}

function buildAnthropicMultimodalContent(text: string, attachments?: ChatAttachment[]): string | AnthropicContentPart[] {
  if (!attachments || attachments.length === 0) return text

  const content: AnthropicContentPart[] = []

  // Add images first
  for (const attachment of attachments) {
    if (attachment.type === 'image') {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: attachment.mimeType,
          data: attachment.base64Data
        }
      })
    } else if (attachment.type === 'text' || attachment.type === 'pdf') {
      // For text files, decode and include as text
      try {
        const decoded = atob(attachment.base64Data)
        content.push({
          type: 'text',
          text: `[File: ${attachment.fileName}]\n${decoded}\n[End of file]`
        })
      } catch {
        content.push({
          type: 'text',
          text: `[Attached file: ${attachment.fileName}]`
        })
      }
    }
  }

  // Add the user's text message
  if (text) {
    content.push({ type: 'text', text })
  }

  return content.length > 0 ? content : text
}

// Agent Chat Streaming

export interface StreamAgentChatOptions {
  agentId: string
  systemPrompt: string
  messages: ChatMessage[]
  settings?: AgentSettings
  attachments?: ChatAttachment[]
  onChunk: (chunk: string) => void
  onComplete: () => void
  onError: (error: Error) => void
  signal?: AbortSignal
}

export async function streamAgentChat(options: StreamAgentChatOptions): Promise<void> {
  const { systemPrompt, messages, settings, attachments, onChunk, onComplete, onError, signal } = options

  // Resolve provider config - use agent's providerId if set, otherwise default
  const providerResult = await resolveProviderConfig(settings?.providerId)
  if (!providerResult.ok) {
    onError(new Error(providerResult.error))
    return
  }

  const providerConfig = providerResult.data
  const { provider, apiKey, model: configModel, claudeCodeExecutablePath } = providerConfig

  // Use agent's model override if specified, otherwise use provider config's model
  const model = settings?.model || configModel

  // Convert ChatMessage[] to StreamChatMessage[] for streamClaudeCode
  const streamMessages: StreamChatMessage[] = messages.map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }))

  try {
    // Call the appropriate provider's streaming API
    switch (provider) {
      case 'openai':
        await streamOpenAIWithAttachments(apiKey!, model, systemPrompt, messages, attachments, onChunk, onComplete, onError, signal)
        break
      case 'anthropic':
        await streamAnthropicWithAttachments(apiKey!, model, systemPrompt, messages, attachments, onChunk, onComplete, onError, signal)
        break
      case 'google':
        // Google doesn't support multimodal in this format yet, fall back to text-only
        const apiMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...messages.map((m) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
          })),
        ]
        await streamGoogle(apiKey!, model, apiMessages, onChunk, onComplete, onError, signal)
        break
      case 'claude-code':
        await streamClaudeCodeWithAttachments(model, systemPrompt, streamMessages, attachments, onChunk, onComplete, onError, signal, claudeCodeExecutablePath)
        break
      default:
        onError(new Error(`Unsupported provider: ${provider}`))
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      onError(error instanceof Error ? error : new Error(String(error)))
    }
  }
}

async function streamOpenAI(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void,
  onComplete: (usage?: TokenUsage) => void,
  onError: (error: Error) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      stream_options: { include_usage: true },
    }),
    signal,
  })

  if (!response.ok) {
    const error = await response.text()
    onError(new Error(`OpenAI API error: ${error}`))
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError(new Error('No response body'))
    return
  }

  const decoder = new TextDecoder()
  let usage: TokenUsage | undefined

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter((line) => line.trim() !== '')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') {
          onComplete(usage)
          return
        }
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            onChunk(content)
          }
          // Capture usage from final chunk
          if (parsed.usage) {
            usage = {
              inputTokens: parsed.usage.prompt_tokens ?? 0,
              outputTokens: parsed.usage.completion_tokens ?? 0,
            }
          }
        } catch {
          // Ignore parsing errors for incomplete JSON
        }
      }
    }
  }
  onComplete(usage)
}

async function streamGoogle(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void,
  onComplete: (usage?: TokenUsage) => void,
  onError: (error: Error) => void,
  signal?: AbortSignal
): Promise<void> {
  // Google Gemini uses a different format
  const contents = messages.map((m) => ({
    role: m.role === 'system' ? 'user' : m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
      }),
      signal,
    }
  )

  if (!response.ok) {
    const error = await response.text()
    onError(new Error(`Google AI API error: ${error}`))
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError(new Error('No response body'))
    return
  }

  const decoder = new TextDecoder()
  let usage: TokenUsage | undefined

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    try {
      // Google returns JSON objects separated by newlines
      const lines = chunk.split('\n').filter((line) => line.trim() !== '')
      for (const line of lines) {
        const parsed = JSON.parse(line)
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          onChunk(text)
        }
        // Capture usage metadata from Google responses
        if (parsed.usageMetadata) {
          usage = {
            inputTokens: parsed.usageMetadata.promptTokenCount ?? 0,
            outputTokens: parsed.usageMetadata.candidatesTokenCount ?? 0,
          }
        }
      }
    } catch {
      // Ignore parsing errors for incomplete JSON
    }
  }
  onComplete(usage)
}

async function streamOpenAIWithAttachments(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  attachments: ChatAttachment[] | undefined,
  onChunk: (chunk: string) => void,
  onComplete: (usage?: TokenUsage) => void,
  onError: (error: Error) => void,
  signal?: AbortSignal
): Promise<void> {
  // Build messages with multimodal content for the last user message
  const apiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map((m, index) => {
      const isLastUserMessage = index === messages.length - 1 && m.role === 'user'
      const messageAttachments = isLastUserMessage ? attachments : m.attachments
      return {
        role: m.role as 'user' | 'assistant' | 'system',
        content: buildOpenAIMultimodalContent(m.content, messageAttachments),
      }
    }),
  ]

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: apiMessages,
      stream: true,
      stream_options: { include_usage: true },
    }),
    signal,
  })

  if (!response.ok) {
    const error = await response.text()
    onError(new Error(`OpenAI API error: ${error}`))
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError(new Error('No response body'))
    return
  }

  const decoder = new TextDecoder()
  let usage: TokenUsage | undefined

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter((line) => line.trim() !== '')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') {
          onComplete(usage)
          return
        }
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            onChunk(content)
          }
          // Capture usage from final chunk
          if (parsed.usage) {
            usage = {
              inputTokens: parsed.usage.prompt_tokens ?? 0,
              outputTokens: parsed.usage.completion_tokens ?? 0,
            }
          }
        } catch {
          // Ignore parsing errors for incomplete JSON
        }
      }
    }
  }
  onComplete(usage)
}

async function streamAnthropicWithAttachments(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  attachments: ChatAttachment[] | undefined,
  onChunk: (chunk: string) => void,
  onComplete: (usage?: TokenUsage) => void,
  onError: (error: Error) => void,
  signal?: AbortSignal
): Promise<void> {
  // Build messages with multimodal content for the last user message
  const apiMessages = messages.map((m, index) => {
    const isLastUserMessage = index === messages.length - 1 && m.role === 'user'
    const messageAttachments = isLastUserMessage ? attachments : m.attachments
    return {
      role: m.role === 'user' ? 'user' as const : 'assistant' as const,
      content: buildAnthropicMultimodalContent(m.content, messageAttachments),
    }
  })

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: apiMessages,
      stream: true,
    }),
    signal,
  })

  if (!response.ok) {
    const error = await response.text()
    onError(new Error(`Anthropic API error: ${error}`))
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError(new Error('No response body'))
    return
  }

  const decoder = new TextDecoder()
  let usage: TokenUsage | undefined

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter((line) => line.trim() !== '')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'content_block_delta') {
            const text = parsed.delta?.text
            if (text) {
              onChunk(text)
            }
          } else if (parsed.type === 'message_delta' && parsed.usage) {
            // Anthropic provides output_tokens in message_delta
            usage = {
              inputTokens: usage?.inputTokens ?? 0,
              outputTokens: parsed.usage.output_tokens ?? 0,
            }
          } else if (parsed.type === 'message_start' && parsed.message?.usage) {
            // Anthropic provides input_tokens in message_start
            usage = {
              inputTokens: parsed.message.usage.input_tokens ?? 0,
              outputTokens: usage?.outputTokens ?? 0,
            }
          } else if (parsed.type === 'message_stop') {
            onComplete(usage)
            return
          }
        } catch {
          // Ignore parsing errors for incomplete JSON
        }
      }
    }
  }
  onComplete(usage)
}

async function streamClaudeCodeWithAttachments(
  model: string,
  systemPrompt: string,
  messages: StreamChatMessage[],
  attachments: ChatAttachment[] | undefined,
  onChunk: (chunk: string) => void,
  onComplete: (usage?: TokenUsage) => void,
  onError: (error: Error) => void,
  signal?: AbortSignal,
  executablePath?: string | null
): Promise<void> {
  // Ensure the Claude Code sidecar server is running
  const serverReady = await ensureClaudeCodeServer(executablePath)
  if (!serverReady) {
    onError(new Error('Failed to start Claude Code server. Please check that the application was installed correctly.'))
    return
  }

  // Check if Claude CLI is authenticated
  const authStatus = await checkClaudeCodeAuth()
  if (!authStatus.authenticated) {
    onError(new Error(`Claude CLI not authenticated. ${authStatus.hint || 'Run "claude login" to authenticate.'}`))
    return
  }

  // Claude Code sidecar doesn't support multimodal yet, so we'll include text file contents inline
  // and reference images by name (images won't be visible to the model)
  const processedMessages = messages.map((m, index) => {
    const isLastUserMessage = index === messages.length - 1 && m.role === 'user'
    const messageAttachments = isLastUserMessage ? attachments : undefined

    if (!messageAttachments || messageAttachments.length === 0) {
      return { role: m.role as 'user' | 'assistant' | 'system', content: m.content }
    }

    // Build content with text file contents included inline
    let content = m.content
    const attachmentDescriptions: string[] = []

    for (const attachment of messageAttachments) {
      if (attachment.type === 'text') {
        try {
          const decoded = atob(attachment.base64Data)
          attachmentDescriptions.push(`[File: ${attachment.fileName}]\n${decoded}\n[End of file]`)
        } catch {
          attachmentDescriptions.push(`[Attached file: ${attachment.fileName}]`)
        }
      } else if (attachment.type === 'image') {
        attachmentDescriptions.push(`[Image attached: ${attachment.fileName} - Note: Claude Code sidecar does not currently support image viewing]`)
      } else {
        attachmentDescriptions.push(`[Attached file: ${attachment.fileName}]`)
      }
    }

    if (attachmentDescriptions.length > 0) {
      content = attachmentDescriptions.join('\n\n') + '\n\n' + content
    }

    return { role: m.role as 'user' | 'assistant' | 'system', content }
  })

  // Stream using the sidecar
  // Note: Claude Code sidecar doesn't currently return token usage
  await streamWithClaudeCode(
    processedMessages,
    {
      model: model as 'opus' | 'sonnet' | 'haiku',
      system: systemPrompt,
    },
    { onChunk, onComplete: () => onComplete(), onError },
    signal
  )
}

async function streamClaudeCode(
  model: string,
  systemPrompt: string,
  messages: StreamChatMessage[],
  onChunk: (chunk: string) => void,
  onComplete: (usage?: TokenUsage) => void,
  onError: (error: Error) => void,
  signal?: AbortSignal,
  executablePath?: string | null
): Promise<void> {
  // Ensure the Claude Code sidecar server is running
  const serverReady = await ensureClaudeCodeServer(executablePath)
  if (!serverReady) {
    onError(new Error('Failed to start Claude Code server. Please check that the application was installed correctly.'))
    return
  }

  // Check if Claude CLI is authenticated
  const authStatus = await checkClaudeCodeAuth()
  if (!authStatus.authenticated) {
    onError(new Error(`Claude CLI not authenticated. ${authStatus.hint || 'Run "claude login" to authenticate.'}`))
    return
  }

  // Stream using the sidecar
  // Note: Claude Code sidecar doesn't currently return token usage
  await streamWithClaudeCode(
    messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
    {
      model: model as 'opus' | 'sonnet' | 'haiku',
      system: systemPrompt,
    },
    { onChunk, onComplete: () => onComplete(), onError },
    signal
  )
}
