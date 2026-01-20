import { generateText } from 'ai'
import type { AIConfig } from '../types'
import { getModel } from './prompt-generator'

const FIELD_FILLER_SYSTEM_PROMPT = `You are a form field extractor for Incito, an application that helps users manage prompt templates.

Your task is to extract relevant information from user-provided context and map it to form fields.

You will receive:
1. A context text (notes, documents, project details, etc.)
2. A list of form fields with their types and constraints

You must output valid JSON with this exact structure:
{
  "fields": {
    "field_key": "extracted_value"
  },
  "confidence": "high|medium|low"
}

Guidelines:
1. Only include fields where you found relevant information in the context
2. Skip fields where no clear information was found - do not guess or make up values
3. Match the expected type for each field:
   - text: String value
   - textarea: String value (can be longer, multi-line)
   - select: MUST be one of the provided options (case-insensitive match, output the exact option)
   - multi-select: Array of strings, each MUST be from the provided options
   - number: Numeric value within the specified min/max range
   - slider: Numeric value within the specified min/max range
   - array: Array of strings (extracted items, tags, keywords, etc.)
4. For select/multi-select fields, if the context mentions something similar but not exact, choose the closest matching option
5. Be conservative - only fill fields where you have reasonable confidence
6. If no relevant information is found for any field, return empty fields: {"fields": {}, "confidence": "low"}

Confidence levels:
- high: Most or all extracted values are clear and unambiguous
- medium: Some values required interpretation or are partial matches
- low: Few values found or significant uncertainty

Always respond with ONLY the JSON object, no additional text or markdown formatting.`

export interface FieldDefinition {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'slider' | 'array' | 'multi-select'
  options?: string[]
  min?: number
  max?: number
}

export interface FillFieldsRequest {
  context: string
  fields: FieldDefinition[]
}

export async function fillFields(
  request: FillFieldsRequest,
  config: AIConfig
): Promise<string> {
  const model = getModel(config)

  // Build the field descriptions for the prompt
  const fieldDescriptions = request.fields.map((field) => {
    let desc = `- ${field.key} (${field.label}): type=${field.type}`
    if (field.options && field.options.length > 0) {
      desc += `, options=[${field.options.join(', ')}]`
    }
    if (field.min !== undefined) {
      desc += `, min=${field.min}`
    }
    if (field.max !== undefined) {
      desc += `, max=${field.max}`
    }
    return desc
  }).join('\n')

  const userMessage = `Extract field values from the following context.

CONTEXT:
---
${request.context}
---

FIELDS TO FILL:
${fieldDescriptions}

Extract relevant information and output JSON with the field values.`

  const { text } = await generateText({
    model,
    system: FIELD_FILLER_SYSTEM_PROMPT,
    prompt: userMessage,
  })

  return text
}
