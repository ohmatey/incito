import { generate, refine, summarizeChanges as summarize } from './agents/prompt-generator'
import { fillFields } from './agents/field-filler'
import { fillSingleField as fillSingle } from './agents/single-field-filler'
import { GeneratedPromptSchema, type AIConfig, type GeneratePromptInput, type GeneratePromptResult, type RefineTemplateInput, type RefineTemplateResult, type SummarizeChangesInput, type SummarizeChangesResult, type FillFieldsInput, type FillFieldsResult, type FillFieldDefinition, type FillSingleFieldInput, type FillSingleFieldResult } from './types'

// Valid variable types
const VALID_TYPES = ['text', 'textarea', 'select', 'number', 'slider', 'array', 'multi-select'] as const

// Map invalid types to valid ones
const TYPE_MAPPING: Record<string, typeof VALID_TYPES[number]> = {
  'checkbox': 'select', // checkbox -> select with yes/no options
  'boolean': 'select',
  'bool': 'select',
  'radio': 'select',
  'dropdown': 'select',
  'list': 'array',
  'tags': 'array',
  'multiselect': 'multi-select',
  'multi_select': 'multi-select',
  'range': 'slider',
  'string': 'text',
  'longtext': 'textarea',
  'paragraph': 'textarea',
  'int': 'number',
  'integer': 'number',
  'float': 'number',
}

// Sanitize the parsed response to fix common AI mistakes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeResponse(parsed: any): any {
  if (!parsed || typeof parsed !== 'object') return parsed

  // Sanitize variables array
  if (Array.isArray(parsed.variables)) {
    parsed.variables = parsed.variables.map((v: Record<string, unknown>) => {
      if (!v || typeof v !== 'object') return v

      // Fix type field
      if (typeof v.type === 'string') {
        const lowerType = v.type.toLowerCase()
        if (!VALID_TYPES.includes(lowerType as typeof VALID_TYPES[number])) {
          // Check if we have a mapping for this type
          const mappedType = TYPE_MAPPING[lowerType]
          if (mappedType) {
            v.type = mappedType
            // If converting checkbox/boolean to select, add yes/no options
            if ((lowerType === 'checkbox' || lowerType === 'boolean' || lowerType === 'bool') && !v.options) {
              v.options = ['Yes', 'No']
            }
          } else {
            // Default to text for unknown types
            v.type = 'text'
          }
        } else {
          v.type = lowerType
        }
      } else {
        v.type = 'text'
      }

      // Fix required field - must be boolean
      if (typeof v.required === 'string') {
        v.required = v.required.toLowerCase() === 'true' || v.required === '1'
      } else if (typeof v.required !== 'boolean') {
        v.required = false
      }

      // Fix preview field - must be string
      if (v.preview !== undefined && typeof v.preview !== 'string') {
        v.preview = String(v.preview)
      }

      // Fix default field - convert to appropriate type
      if (v.default !== undefined) {
        if (v.type === 'number' || v.type === 'slider') {
          // For number/slider, try to convert to number
          if (typeof v.default === 'string') {
            const num = parseFloat(v.default)
            if (!isNaN(num)) {
              v.default = num
            }
          } else if (typeof v.default === 'boolean') {
            v.default = v.default ? 1 : 0
          }
        } else if (v.type === 'array' || v.type === 'multi-select') {
          // For array types, ensure it's an array of strings
          if (!Array.isArray(v.default)) {
            v.default = v.default ? [String(v.default)] : undefined
          } else {
            v.default = v.default.map((item: unknown) => String(item))
          }
        } else {
          // For other types, convert to string
          if (typeof v.default !== 'string') {
            v.default = String(v.default)
          }
        }
      }

      // Fix options field - must be array of non-empty strings
      if (v.options !== undefined) {
        if (Array.isArray(v.options)) {
          v.options = v.options
            .map((opt: unknown) => (opt !== null && opt !== undefined ? String(opt) : ''))
            .filter((opt: string) => opt.trim() !== '')
        } else {
          v.options = undefined
        }
        // Remove empty options array
        if (Array.isArray(v.options) && v.options.length === 0) {
          v.options = undefined
        }
      }

      // Ensure select/multi-select have options, otherwise convert to text/array
      if (v.type === 'select' && (!Array.isArray(v.options) || v.options.length === 0)) {
        v.type = 'text'
      }
      if (v.type === 'multi-select' && (!Array.isArray(v.options) || v.options.length === 0)) {
        v.type = 'array'
      }

      return v
    })
  }

  // Ensure tags is an array of strings
  if (parsed.tags !== undefined) {
    if (Array.isArray(parsed.tags)) {
      parsed.tags = parsed.tags
        .map((tag: unknown) => (tag !== null && tag !== undefined ? String(tag) : ''))
        .filter((tag: string) => tag.trim() !== '')
    } else {
      parsed.tags = undefined
    }
  }

  return parsed
}

export async function generatePrompt(
  input: GeneratePromptInput,
  config: AIConfig
): Promise<GeneratePromptResult> {
  try {
    const userMessage = `Generate a prompt template based on this description:\n\n${input.description}`

    const responseText = await generate(userMessage, config, input.existingTags)

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

    // Sanitize the response to fix common AI mistakes
    parsed = sanitizeResponse(parsed)

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

export async function refineTemplate(
  input: RefineTemplateInput,
  config: AIConfig
): Promise<RefineTemplateResult> {
  try {
    const refinedText = await refine(input.template, input.instruction, config)
    return {
      ok: true,
      data: refinedText,
    }
  } catch (error) {
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
      error: `Failed to refine template: ${errorMessage}`,
      code: 'GENERATION_FAILED',
    }
  }
}

export async function summarizeChanges(
  input: SummarizeChangesInput,
  config: AIConfig
): Promise<SummarizeChangesResult> {
  try {
    const summary = await summarize(input.previousContent, input.currentContent, config)
    return {
      ok: true,
      data: summary,
    }
  } catch (error) {
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
      error: `Failed to summarize changes: ${errorMessage}`,
      code: 'GENERATION_FAILED',
    }
  }
}

// Validate a single field value against its type constraints
function validateFieldValue(
  value: unknown,
  field: FillFieldDefinition
): unknown | null {
  if (value === undefined || value === null) return null

  switch (field.type) {
    case 'text':
    case 'textarea':
      // Must be a string
      if (typeof value !== 'string') {
        return String(value)
      }
      return value

    case 'select':
      // Must match one of the options (case-insensitive)
      if (typeof value !== 'string' || !field.options) return null
      const matchedOption = field.options.find(
        (opt) => opt.toLowerCase() === value.toLowerCase()
      )
      return matchedOption || null

    case 'multi-select':
      // Must be an array where all items match options
      if (!Array.isArray(value) || !field.options) return null
      const validItems = value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => {
          const matched = field.options!.find(
            (opt) => opt.toLowerCase() === item.toLowerCase()
          )
          return matched
        })
        .filter((item): item is string => item !== undefined)
      return validItems.length > 0 ? validItems : null

    case 'number':
    case 'slider':
      // Must be a number within min/max range
      let numValue: number
      if (typeof value === 'number') {
        numValue = value
      } else if (typeof value === 'string') {
        numValue = parseFloat(value)
        if (isNaN(numValue)) return null
      } else {
        return null
      }
      // Clamp to min/max if specified
      if (field.min !== undefined && numValue < field.min) {
        numValue = field.min
      }
      if (field.max !== undefined && numValue > field.max) {
        numValue = field.max
      }
      return numValue

    case 'array':
      // Must be an array of strings
      if (Array.isArray(value)) {
        const stringItems = value
          .filter((item) => item !== null && item !== undefined)
          .map((item) => String(item))
        return stringItems.length > 0 ? stringItems : null
      }
      // Single string value - convert to array
      if (typeof value === 'string' && value.trim()) {
        return [value.trim()]
      }
      return null

    default:
      return null
  }
}

export async function fillFormFields(
  input: FillFieldsInput,
  config: AIConfig
): Promise<FillFieldsResult> {
  try {
    const responseText = await fillFields(
      {
        context: input.context,
        fields: input.fields.map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          options: f.options,
          min: f.min,
          max: f.max,
        })),
      },
      config
    )

    // Try to parse the JSON response
    let parsed: { fields?: Record<string, unknown>; confidence?: string }
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
        error: 'Failed to parse AI response. Please try again.',
        code: 'INVALID_RESPONSE',
      }
    }

    // Validate the parsed response structure
    if (!parsed.fields || typeof parsed.fields !== 'object') {
      return {
        ok: false,
        error: 'Invalid response structure. Please try again.',
        code: 'INVALID_RESPONSE',
      }
    }

    // Validate each field value against its type constraints
    const validatedFields: Record<string, unknown> = {}
    let filledCount = 0

    for (const field of input.fields) {
      const rawValue = parsed.fields[field.key]
      if (rawValue !== undefined) {
        const validatedValue = validateFieldValue(rawValue, field)
        if (validatedValue !== null) {
          validatedFields[field.key] = validatedValue
          filledCount++
        }
      }
    }

    // Determine confidence level
    const confidence = (parsed.confidence as 'high' | 'medium' | 'low') || 'medium'

    return {
      ok: true,
      data: {
        fields: validatedFields,
        filledCount,
        totalCount: input.fields.length,
        confidence,
      },
    }
  } catch (error) {
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
      error: `Failed to fill fields: ${errorMessage}`,
      code: 'GENERATION_FAILED',
    }
  }
}

export async function fillSingleField(
  input: FillSingleFieldInput,
  config: AIConfig
): Promise<FillSingleFieldResult> {
  try {
    const value = await fillSingle(input, config)

    return {
      ok: true,
      data: {
        value,
      },
    }
  } catch (error) {
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
      error: `Failed to generate content: ${errorMessage}`,
      code: 'GENERATION_FAILED',
    }
  }
}
