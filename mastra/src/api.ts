import { generate } from './agents/prompt-generator'
import { GeneratedPromptSchema, type AIConfig, type GeneratePromptInput, type GeneratePromptResult } from './types'

export async function generatePrompt(
  input: GeneratePromptInput,
  config: AIConfig
): Promise<GeneratePromptResult> {
  try {
    let userMessage = `Generate a prompt template based on this description:\n\n${input.description}`

    if (input.outputFormat) {
      userMessage += `\n\nThe template should be optimized for ${input.outputFormat} output.`
    }

    const responseText = await generate(userMessage, config)

    // Try to parse the JSON response
    let parsed
    try {
      // Handle potential markdown code blocks
      let jsonText = responseText.trim()
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7)
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3)
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3)
      }
      jsonText = jsonText.trim()

      parsed = JSON.parse(jsonText)
    } catch {
      return {
        ok: false,
        error: 'Failed to parse AI response as JSON. Please try again.',
        code: 'INVALID_RESPONSE',
      }
    }

    // Validate against schema
    const validationResult = GeneratedPromptSchema.safeParse(parsed)
    if (!validationResult.success) {
      return {
        ok: false,
        error: `Invalid response structure: ${validationResult.error.issues.map(i => i.message).join(', ')}`,
        code: 'INVALID_RESPONSE',
      }
    }

    return {
      ok: true,
      data: validationResult.data,
    }
  } catch (error) {
    // Handle specific API errors
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('invalid_api_key')) {
      return {
        ok: false,
        error: 'Invalid API key. Please check your API key in Settings.',
        code: 'INVALID_API_KEY',
      }
    }

    if (errorMessage.includes('429') || errorMessage.includes('rate_limit') || errorMessage.includes('Rate limit')) {
      return {
        ok: false,
        error: 'Rate limit exceeded. Please wait a moment and try again.',
        code: 'RATE_LIMITED',
      }
    }

    return {
      ok: false,
      error: `Failed to generate prompt: ${errorMessage}`,
      code: 'GENERATION_FAILED',
    }
  }
}
