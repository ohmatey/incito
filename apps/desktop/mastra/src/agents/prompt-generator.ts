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
      "type": "text|textarea|select|number|slider|array|multi-select",
      "required": true,
      "placeholder": "Optional placeholder text",
      "preview": "Example value for preview (always a string)",
      "default": "Optional default value (string for most types, number for number/slider)",
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
   - select: Single selection from predefined options (requires "options" array)
   - multi-select: Multiple selections from predefined options (requires "options" array)
   - number: Numeric values
   - slider: Numeric range with min/max (for values like temperature, percentages)
   - array: List of user-provided items (tags, keywords, etc.)
4. IMPORTANT: "required" must be a boolean (true or false), not a string
5. IMPORTANT: "preview" must always be a string, even for numbers (e.g., "42" not 42)
6. Provide helpful placeholder and preview values
7. Use {{#if variable}}content{{/if}} for conditional sections
8. Create clear, reusable templates that solve real problems
9. Add 1-3 relevant tags for categorization
10. For select/multi-select types, always provide an "options" array with at least 2 non-empty options

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

const REFINE_SYSTEM_PROMPT = `You are a prompt template editor for Incito, an application that helps users create and manage reusable prompt templates.

Your task is to refine an existing prompt template based on user instructions. The template uses:
- {{variable_name}} syntax for variable placeholders (double curly braces)
- {{#if variable}}content{{/if}} for conditional sections

Guidelines:
1. Keep the same variable placeholders ({{variable}}) unless the user explicitly asks to change them
2. Maintain the overall structure and purpose of the template
3. Apply the user's requested changes (tone, style, length, focus, etc.)
4. Do not add new variables unless explicitly requested
5. Preserve any conditional sections unless modification is requested

IMPORTANT: Respond with ONLY the refined template text. Do not include any explanations, markdown formatting, or additional text. Just output the refined template directly.`

export async function refine(template: string, instruction: string, config: AIConfig): Promise<string> {
  const model = getModel(config)

  const userMessage = `Here is the current template:

---
${template}
---

Please refine this template according to this instruction: ${instruction}

Remember: Output ONLY the refined template, nothing else.`

  const { text } = await generateText({
    model,
    system: REFINE_SYSTEM_PROMPT,
    prompt: userMessage,
  })

  return text.trim()
}

export { SYSTEM_PROMPT, getModel }
