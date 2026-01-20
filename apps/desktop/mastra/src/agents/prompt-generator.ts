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
      "options": ["option1", "option2"],
      "description": "Optional - only include if it adds context beyond the label"
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
7. For conditional sections:
   - Use {{#if variable}}content{{/if}} for optional variables (shows content if variable has any value)
   - For select variables, ALWAYS use {{#if (eq variable "option_value")}}content{{else}}alternative{{/if}} to compare against specific option values
   - Example: {{#if (eq tone "formal")}}Use formal language{{else}}Use casual language{{/if}}
   - Available helpers: eq, ne, gt, gte, lt, lte, and, or, not
8. Create clear, reusable templates that solve real problems
9. For variable descriptions: ONLY add a "description" field when it provides context that isn't obvious from the label. Most variables should NOT have descriptions. Good examples where description helps: "target_audience" with description "Who will read this content" or "context" with description "Background information the AI should know". Bad examples (skip description): "topic", "name", "email" - these are self-explanatory from the label.
10. IMPORTANT for tags: You will be given a list of existing tags. ONLY use tags from that list. If no existing tags are provided or none are relevant, set "tags" to an empty array []. Never invent new tags.
11. For select/multi-select types, always provide an "options" array with at least 2 non-empty options

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

export async function generate(userMessage: string, config: AIConfig, existingTags?: string[]): Promise<string> {
  const model = getModel(config)

  // Build the full prompt with existing tags information
  let fullPrompt = userMessage
  if (existingTags && existingTags.length > 0) {
    fullPrompt += `\n\nExisting tags you can use (only use tags from this list): ${existingTags.join(', ')}`
  } else {
    fullPrompt += `\n\nNo existing tags are defined. Set "tags" to an empty array [].`
  }

  const { text } = await generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt: fullPrompt,
  })

  return text
}

const REFINE_SYSTEM_PROMPT = `You are a prompt template editor for Incito, an application that helps users create and manage reusable prompt templates.

Your task is to refine an existing prompt template based on user instructions. The template uses:
- {{variable_name}} syntax for variable placeholders (double curly braces)
- {{#if variable}}content{{/if}} for optional variables (shows content if variable has any value)
- {{#if (eq variable "value")}}content{{else}}alternative{{/if}} for comparing select variables against specific options

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

const SUMMARIZE_CHANGES_SYSTEM_PROMPT = `You are a concise change summarizer for prompt templates. Given the previous and current versions of a prompt template, describe what changed in 5-10 words.

Guidelines:
1. Focus on the most significant change
2. Use past tense verbs (e.g., "Added", "Updated", "Removed", "Simplified", "Expanded")
3. Be specific but brief (e.g., "Added tone variable", "Simplified introduction", "Expanded output format")
4. If multiple changes, mention the most important one
5. Do not use punctuation at the end

Examples of good summaries:
- "Added temperature and length controls"
- "Simplified the system instructions"
- "Changed output format to JSON"
- "Removed redundant examples"
- "Updated variable placeholders"

Respond with ONLY the summary text, nothing else.`

export async function summarizeChanges(previousContent: string, currentContent: string, config: AIConfig): Promise<string> {
  const model = getModel(config)

  const userMessage = `Previous version:
---
${previousContent}
---

Current version:
---
${currentContent}
---

Summarize what changed in 5-10 words.`

  const { text } = await generateText({
    model,
    system: SUMMARIZE_CHANGES_SYSTEM_PROMPT,
    prompt: userMessage,
  })

  return text.trim()
}

export { SYSTEM_PROMPT, getModel }
