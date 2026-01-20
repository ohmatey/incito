// Types
export type {
  VariableType,
  GeneratedVariable,
  GeneratedPrompt,
  AIProvider,
  AIConfig,
  GeneratePromptInput,
  GeneratePromptResult,
  RefineTemplateInput,
  RefineTemplateResult,
  SummarizeChangesInput,
  SummarizeChangesResult,
  FillFieldDefinition,
  FillFieldsInput,
  FillFieldsResult,
  FillSingleFieldInput,
  FillSingleFieldResult,
} from './types'

export {
  VariableTypeSchema,
  GeneratedVariableSchema,
  GeneratedPromptSchema,
} from './types'

// API
export { generatePrompt, refineTemplate, summarizeChanges, fillFormFields, fillSingleField } from './api'

// Generator utilities
export { generate, getModel, SYSTEM_PROMPT } from './agents/prompt-generator'
