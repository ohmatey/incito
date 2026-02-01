// ============================================================================
// Grader Types - Union Type for Assertion vs LLM Judge
// ============================================================================

export type Grader = AssertionGrader | LLMJudgeGrader

export type GraderType = 'assertion' | 'llm_judge'

// ----------------------------------------------------------------------------
// Assertion Grader (Code-Based, Deterministic, Free, Instant)
// ----------------------------------------------------------------------------

export type AssertionOperator =
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'equals'
  | 'max_length'
  | 'min_length'
  | 'regex'
  | 'json_valid'

export interface AssertionLogic {
  operator: AssertionOperator
  value: string | number
  caseSensitive?: boolean
}

export interface AssertionGrader {
  id: string
  syncId: string  // Immutable UUID for sync
  name: string
  description?: string
  type: 'assertion'
  logic: AssertionLogic
  isBuiltin: boolean
  enabled: boolean
  createdAt: string
  updatedAt: string
}

// ----------------------------------------------------------------------------
// LLM Judge Grader (Model-Based, Probabilistic, Paid, Slow)
// ----------------------------------------------------------------------------

export type JudgeModel =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-sonnet-4-5'
  | 'claude-haiku-4-5'

export type OutputSchema =
  | 'score_1_to_5'
  | 'score_1_to_10'
  | 'boolean'
  | 'pass_fail_reason'

export interface LLMJudgeConfig {
  providerId: string | null // null = use default provider
  // Legacy field for backward compatibility - will be migrated to providerId
  model?: JudgeModel
  promptTemplate: string // "Rate the following text: {{output}}..."
  outputSchema: OutputSchema
  systemPrompt?: string // Optional system context
}

export interface LLMJudgeGrader {
  id: string
  syncId: string  // Immutable UUID for sync
  name: string
  description?: string
  type: 'llm_judge'
  config: LLMJudgeConfig
  isBuiltin: boolean
  enabled: boolean
  createdAt: string
  updatedAt: string
}

// ----------------------------------------------------------------------------
// Grader Results
// ----------------------------------------------------------------------------

export interface GraderResult {
  id: string
  runId: string
  graderId: string
  score: number // 0.0 to 1.0 normalized
  passed: boolean
  reason?: string // LLM explanation or rule failure message
  rawScore?: number // Original score (e.g., 4 out of 5)
  executionTimeMs: number
  createdAt: string
}

export interface GraderResultWithGrader extends GraderResult {
  grader: Grader
}

// ----------------------------------------------------------------------------
// Prompt-Grader Associations
// ----------------------------------------------------------------------------

export interface PromptGrader {
  id: string
  promptId: string
  graderId: string
  enabled: boolean
  createdAt: string
}

// ----------------------------------------------------------------------------
// Type Guards
// ----------------------------------------------------------------------------

export function isAssertionGrader(grader: Grader): grader is AssertionGrader {
  return grader.type === 'assertion'
}

export function isLLMJudgeGrader(grader: Grader): grader is LLMJudgeGrader {
  return grader.type === 'llm_judge'
}

// ----------------------------------------------------------------------------
// API Types
// ----------------------------------------------------------------------------

export interface RunGradersRequest {
  input: string // The interpolated prompt
  output: string // The AI response
  graders: Grader[] // Selected graders to run
}

export interface RunGradersResponse {
  results: GraderResult[]
}

export interface TestGraderRequest {
  grader: Grader
  input: string
  output: string
}

export interface TestGraderResponse {
  score: number
  passed: boolean
  reason?: string
  rawScore?: number
  executionTimeMs: number
}

// ----------------------------------------------------------------------------
// Built-in Grader Templates
// ----------------------------------------------------------------------------

export const ASSERTION_OPERATORS: {
  value: AssertionOperator
  label: string
  description: string
  valueType: 'string' | 'number' | 'string[]' | 'none'
}[] = [
  {
    value: 'contains',
    label: 'Contains',
    description: 'Output contains the specified text',
    valueType: 'string',
  },
  {
    value: 'not_contains',
    label: 'Does not contain',
    description: 'Output does not contain the specified text',
    valueType: 'string',
  },
  {
    value: 'starts_with',
    label: 'Starts with',
    description: 'Output starts with the specified text',
    valueType: 'string',
  },
  {
    value: 'ends_with',
    label: 'Ends with',
    description: 'Output ends with the specified text',
    valueType: 'string',
  },
  {
    value: 'equals',
    label: 'Equals',
    description: 'Output exactly matches the specified text',
    valueType: 'string',
  },
  {
    value: 'max_length',
    label: 'Maximum length',
    description: 'Output is at most N characters',
    valueType: 'number',
  },
  {
    value: 'min_length',
    label: 'Minimum length',
    description: 'Output is at least N characters',
    valueType: 'number',
  },
  {
    value: 'regex',
    label: 'Matches regex',
    description: 'Output matches the regular expression',
    valueType: 'string',
  },
  {
    value: 'json_valid',
    label: 'Valid JSON',
    description: 'Output is valid JSON',
    valueType: 'none',
  },
]

export const JUDGE_MODELS: { value: JudgeModel; label: string }[] = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast, Cheap)' },
  { value: 'gpt-4o', label: 'GPT-4o (Accurate)' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (Fast, Cheap)' },
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (Accurate)' },
]

export const OUTPUT_SCHEMAS: { value: OutputSchema; label: string; description: string }[] = [
  {
    value: 'score_1_to_5',
    label: 'Score 1-5',
    description: 'Returns a score from 1 to 5',
  },
  {
    value: 'score_1_to_10',
    label: 'Score 1-10',
    description: 'Returns a score from 1 to 10',
  },
  {
    value: 'boolean',
    label: 'Pass/Fail',
    description: 'Returns true (pass) or false (fail)',
  },
  {
    value: 'pass_fail_reason',
    label: 'Pass/Fail with Reason',
    description: 'Returns pass/fail with explanation',
  },
]
