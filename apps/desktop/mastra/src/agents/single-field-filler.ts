import { generateText } from 'ai'
import type { AIConfig, FillSingleFieldInput } from '../types'
import { getModel } from './prompt-generator'

const SINGLE_FIELD_SYSTEM_PROMPT = `You are a form field content generator.

Given:
- A target field to fill (with its label and type)
- Other form fields and their current values as context
- User instructions for what to generate

Generate appropriate content for the target field. Output ONLY the content to fill in the field, nothing else. No quotes, no markdown, no explanations - just the raw content.

Be concise and relevant. Match the field type expectations:
- text: Short, single-line content (typically a few words to a sentence)
- textarea: Can be longer, multi-line content if appropriate

Use the other field values as context to make the generated content relevant and coherent with the overall form.`

export async function fillSingleField(
  input: FillSingleFieldInput,
  config: AIConfig
): Promise<string> {
  const model = getModel(config)

  // Build context from other fields
  const otherFieldsContext = input.otherFields
    .filter(f => f.value !== undefined && f.value !== null && f.value !== '')
    .map(f => `- ${f.label}: ${formatFieldValue(f.value)}`)
    .join('\n')

  const userMessage = `Generate content for the following field:

TARGET FIELD:
- Label: ${input.targetField.label}
- Type: ${input.targetField.type}${input.targetField.description ? `\n- Description: ${input.targetField.description}` : ''}${input.targetField.placeholder ? `\n- Placeholder hint: ${input.targetField.placeholder}` : ''}

${otherFieldsContext ? `OTHER FORM FIELDS (for context):
${otherFieldsContext}

` : ''}USER INSTRUCTIONS:
${input.userPrompt}

Generate the content for "${input.targetField.label}" now. Output ONLY the content, nothing else.`

  const { text } = await generateText({
    model,
    system: SINGLE_FIELD_SYSTEM_PROMPT,
    prompt: userMessage,
  })

  // Clean up the response - remove any surrounding quotes or markdown
  let result = text.trim()

  // Remove surrounding quotes if present
  if ((result.startsWith('"') && result.endsWith('"')) ||
      (result.startsWith("'") && result.endsWith("'"))) {
    result = result.slice(1, -1)
  }

  return result
}

function formatFieldValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  return String(value)
}
