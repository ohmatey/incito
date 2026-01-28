import { generatePrompt, refineTemplate, summarizeChanges, fillFormFields, fillSingleField, translatePrompt, SYSTEM_PROMPT as PROMPT_GENERATOR_SYSTEM, type AIConfig, type GeneratedPrompt, type GeneratePromptResult, type RefineTemplateResult, type SummarizeChangesResult, type FillFieldsResult, type FillFieldDefinition, type FillSingleFieldResult, type TranslatePromptResult } from '../../mastra/src'
import { getAISettings, getCachedTranslation, cacheTranslation, type AISettings } from './store'
import { ensureClaudeCodeServer, streamWithClaudeCode, checkClaudeCodeAuth, generateWithClaudeCode } from './claude-code-client'
import type { Variable, LanguageCode, TranslationConfidence } from '@/types/prompt'
import type { ChatMessage, AgentSettings } from '@/types/agent'

export type { GeneratedPrompt, GeneratePromptResult, RefineTemplateResult, SummarizeChangesResult, FillFieldsResult, FillSingleFieldResult, TranslatePromptResult }

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

// Generic Chat Streaming with Tool Support

export interface StreamChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
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
  onComplete: () => void
  onError: (error: Error) => void
  signal?: AbortSignal
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
  onComplete: () => void,
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
          onComplete()
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
  onComplete()
}

async function streamAnthropicGeneric(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: StreamChatMessage[],
  onChunk: (chunk: string) => void,
  onComplete: () => void,
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
          } else if (parsed.type === 'message_stop') {
            onComplete()
            return
          }
        } catch {
          // Ignore parsing errors for incomplete JSON
        }
      }
    }
  }
  onComplete()
}

// Agent Chat Streaming

export interface StreamAgentChatOptions {
  agentId: string
  systemPrompt: string
  messages: ChatMessage[]
  settings?: AgentSettings
  onChunk: (chunk: string) => void
  onComplete: () => void
  onError: (error: Error) => void
  signal?: AbortSignal
}

export async function streamAgentChat(options: StreamAgentChatOptions): Promise<void> {
  const { systemPrompt, messages, settings, onChunk, onComplete, onError, signal } = options

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

  const model = settings?.model || aiSettings.model || getDefaultModel(aiSettings.provider)

  // Build messages array for the API
  const apiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
  ]

  // Convert ChatMessage[] to StreamChatMessage[] for streamClaudeCode
  const streamMessages: StreamChatMessage[] = messages.map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }))

  try {
    // Call the appropriate provider's streaming API
    switch (aiSettings.provider) {
      case 'openai':
        await streamOpenAI(aiSettings.apiKey!, model, apiMessages, onChunk, onComplete, onError, signal)
        break
      case 'anthropic':
        await streamAnthropic(aiSettings.apiKey!, model, systemPrompt, messages, onChunk, onComplete, onError, signal)
        break
      case 'google':
        await streamGoogle(aiSettings.apiKey!, model, apiMessages, onChunk, onComplete, onError, signal)
        break
      case 'claude-code':
        await streamClaudeCode(model, systemPrompt, streamMessages, onChunk, onComplete, onError, signal, aiSettings.claudeCodeExecutablePath)
        break
      default:
        onError(new Error(`Unsupported provider: ${aiSettings.provider}`))
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
  onComplete: () => void,
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
  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter((line) => line.trim() !== '')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') {
          onComplete()
          return
        }
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            onChunk(content)
          }
        } catch {
          // Ignore parsing errors for incomplete JSON
        }
      }
    }
  }
  onComplete()
}

async function streamAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  onComplete: () => void,
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
          } else if (parsed.type === 'message_stop') {
            onComplete()
            return
          }
        } catch {
          // Ignore parsing errors for incomplete JSON
        }
      }
    }
  }
  onComplete()
}

async function streamGoogle(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void,
  onComplete: () => void,
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
      }
    } catch {
      // Ignore parsing errors for incomplete JSON
    }
  }
  onComplete()
}

async function streamClaudeCode(
  model: string,
  systemPrompt: string,
  messages: StreamChatMessage[],
  onChunk: (chunk: string) => void,
  onComplete: () => void,
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
  await streamWithClaudeCode(
    messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
    {
      model: model as 'opus' | 'sonnet' | 'haiku',
      system: systemPrompt,
    },
    { onChunk, onComplete, onError },
    signal
  )
}
