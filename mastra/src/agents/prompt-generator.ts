import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { AIConfig } from '../types'

const SYSTEM_PROMPT = `You are a prompt template generator for Incito, an application that helps users create and manage reusable prompt templates.

When generating a prompt template, you must output valid JSON with this exact structure:
{
  "name": "Short descriptive name",
  "description": "Brief description of what this prompt does",
  "template": "The prompt template text with {{variable}} placeholders",
  "variables": [
    {
      "key": "variable_name",
      "label": "Human Readable Label",
      "type": "text|textarea|select|number|checkbox",
      "required": true|false,
      "placeholder": "Optional placeholder text",
      "preview": "Example value for preview",
      "default": "Optional default value",
      "options": ["option1", "option2"]
    }
  ],
  "tags": ["tag1", "tag2"]
}

Guidelines for generating templates:
1. Use {{variable_name}} syntax for variables (double curly braces)
2. Use snake_case for variable keys
3. Choose appropriate variable types:
   - text: Short single-line input
   - textarea: Long multi-line input
   - select: Predefined options
   - number: Numeric values
   - checkbox: Boolean true/false
4. Provide helpful placeholder and preview values
5. Use {{#if variable}}content{{/if}} for conditional sections
6. Create clear, reusable templates that solve real problems
7. Add 1-3 relevant tags for categorization

Always respond with ONLY the JSON object, no additional text or markdown formatting.`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getModel(config: AIConfig): any {
  switch (config.provider) {
    case 'openai': {
      const openai = createOpenAI({ apiKey: config.apiKey })
      return openai(config.model)
    }
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey: config.apiKey })
      return anthropic(config.model)
    }
    case 'google': {
      const google = createGoogleGenerativeAI({ apiKey: config.apiKey })
      return google(config.model)
    }
    default:
      throw new Error(`Unsupported provider: ${config.provider}`)
  }
}

export async function generate(userMessage: string, config: AIConfig): Promise<string> {
  const model = getModel(config)

  const { text } = await generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt: userMessage,
  })

  return text
}

export { SYSTEM_PROMPT, getModel }
