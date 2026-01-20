import { z } from 'zod'

// Variable types supported by the prompt template
export const VariableTypeSchema = z.enum(['text', 'textarea', 'select', 'number', 'slider', 'array', 'multi-select'])
export type VariableType = z.infer<typeof VariableTypeSchema>

// Variable definition for a prompt template
export const GeneratedVariableSchema = z.object({
  key: z.string().describe('Unique identifier for the variable, snake_case'),
  label: z.string().describe('Human-readable label for the variable'),
  type: VariableTypeSchema.describe('Type of input field to render'),
  required: z.boolean().optional().describe('Whether this variable is required'),
  placeholder: z.string().optional().describe('Placeholder text for the input'),
  preview: z.string().optional().describe('Example value shown in preview mode'),
  default: z.union([z.string(), z.number(), z.array(z.string())]).optional().describe('Default value'),
  options: z.array(z.string()).optional().describe('Options for select type variables'),
})

export type GeneratedVariable = z.infer<typeof GeneratedVariableSchema>

// The generated prompt output
export const GeneratedPromptSchema = z.object({
  name: z.string().describe('Short, descriptive name for the prompt'),
  description: z.string().describe('Brief description of what the prompt does'),
  template: z.string().describe('The prompt template with {{variable}} placeholders'),
  variables: z.array(GeneratedVariableSchema).describe('Variable definitions for the template'),
  tags: z.array(z.string()).optional().describe('Tags for categorizing the prompt'),
})

export type GeneratedPrompt = z.infer<typeof GeneratedPromptSchema>

// AI Provider configuration
export type AIProvider = 'openai' | 'anthropic' | 'google'

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  model: string
}

// Input for generating a prompt
export interface GeneratePromptInput {
  description: string
  existingTags?: string[]  // Tags already defined in the system - AI will only use these
}

// Generation result
export type GeneratePromptResult = {
  ok: true
  data: GeneratedPrompt
} | {
  ok: false
  error: string
  code?: 'INVALID_API_KEY' | 'RATE_LIMITED' | 'GENERATION_FAILED' | 'INVALID_RESPONSE'
}

// Input for refining a template
export interface RefineTemplateInput {
  template: string
  instruction: string
}

// Refine result
export type RefineTemplateResult = {
  ok: true
  data: string // The refined template
} | {
  ok: false
  error: string
  code?: 'INVALID_API_KEY' | 'RATE_LIMITED' | 'GENERATION_FAILED'
}

// Input for summarizing changes
export interface SummarizeChangesInput {
  previousContent: string
  currentContent: string
}

// Summarize changes result
export type SummarizeChangesResult = {
  ok: true
  data: string // The summary description
} | {
  ok: false
  error: string
  code?: 'INVALID_API_KEY' | 'RATE_LIMITED' | 'GENERATION_FAILED'
}

// Field definition for fill fields input
export interface FillFieldDefinition {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'slider' | 'array' | 'multi-select'
  options?: string[]
  min?: number
  max?: number
}

// Input for filling form fields with AI
export interface FillFieldsInput {
  context: string
  fields: FillFieldDefinition[]
}

// Fill fields result
export type FillFieldsResult = {
  ok: true
  data: {
    fields: Record<string, unknown>
    filledCount: number
    totalCount: number
    confidence: 'high' | 'medium' | 'low'
  }
} | {
  ok: false
  error: string
  code?: 'INVALID_API_KEY' | 'RATE_LIMITED' | 'GENERATION_FAILED' | 'INVALID_RESPONSE' | 'NO_FIELDS_EXTRACTED'
}

// Input for filling a single field with AI
export interface FillSingleFieldInput {
  targetField: {
    key: string
    label: string
    type: 'text' | 'textarea'
    description?: string
    placeholder?: string
  }
  otherFields: Array<{
    key: string
    label: string
    value: unknown
  }>
  userPrompt: string
}

// Single field fill result
export type FillSingleFieldResult = {
  ok: true
  data: {
    value: string
  }
} | {
  ok: false
  error: string
  code?: 'INVALID_API_KEY' | 'RATE_LIMITED' | 'GENERATION_FAILED'
}
