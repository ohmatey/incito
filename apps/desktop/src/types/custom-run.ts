// ============================================================================
// Custom Run Types
// ============================================================================

import type { Variable } from './prompt'
import type { AIPromptSettings, ProviderRunSettings, EvalConfig } from './prompt-config'

/**
 * Mode for custom run creation
 */
export type CustomRunMode = 'scratch' | 'existing'

/**
 * Execution state for a custom run
 */
export type CustomRunExecutionState = 'idle' | 'running' | 'completed' | 'error'

/**
 * A history entry for tracking run iterations in a custom run session
 */
export interface CustomRunHistoryEntry {
  id: string
  timestamp: string
  variableValues: Record<string, unknown>
  output: string
  executionTimeMs: number
  inputTokens?: number
  outputTokens?: number
  error?: string
  graderResults?: CustomRunGraderResult[]
}

/**
 * Result of running a grader on a custom run output
 */
export interface CustomRunGraderResult {
  graderId: string
  graderName: string
  score: number
  passed: boolean
  reason?: string
  executionTimeMs: number
}

/**
 * Complete state for a custom run session
 */
export interface CustomRunState {
  // Mode
  mode: CustomRunMode
  basePromptId?: string
  basePromptPath?: string

  // Prompt configuration
  promptName: string
  promptDescription: string
  promptTemplate: string
  variables: Variable[]

  // AI behavior settings
  aiPrompt: AIPromptSettings

  // Provider settings
  provider: ProviderRunSettings

  // Evaluation settings
  evals: EvalConfig

  // Execution state
  variableValues: Record<string, unknown>
  executionState: CustomRunExecutionState
  currentOutput: string
  currentError?: string

  // Run history for this session
  runHistory: CustomRunHistoryEntry[]
}

/**
 * Initial state factory for custom run
 */
export function getInitialCustomRunState(mode: CustomRunMode = 'scratch'): CustomRunState {
  return {
    mode,
    promptName: '',
    promptDescription: '',
    promptTemplate: '',
    variables: [],
    aiPrompt: {
      temperature: 0.7,
    },
    provider: {},
    evals: {
      graderIds: [],
      runOnComplete: false,
    },
    variableValues: {},
    executionState: 'idle',
    currentOutput: '',
    runHistory: [],
  }
}

/**
 * Config to save when creating a new prompt from a custom run
 */
export interface SavePromptConfig {
  name: string
  description: string
  template: string
  variables: Variable[]
  tags: string[]
  aiPrompt: AIPromptSettings
  provider: ProviderRunSettings
  evals: EvalConfig
}
