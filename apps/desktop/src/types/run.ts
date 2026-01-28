// Run types - for prompt execution tracking and analytics

export type RunStatus = 'pending' | 'in_progress' | 'completed' | 'error' | 'cancelled'

// Known launcher types, plus any external launcher ID
export type RunLauncher = 'copy' | 'run_mode' | 'agent' | 'api' | string

export interface PromptRun {
  id: string
  promptId: string
  promptPath: string
  promptName: string
  launcherId: RunLauncher
  status: RunStatus
  errorMessage?: string
  startedAt: string
  completedAt?: string
  executionTimeMs?: number
  runFilePath?: string // Path to full run log file
  createdAt: string
}

export interface RunVariable {
  id: string
  runId: string
  variableKey: string
  variableValue: string
  variableType: string
}

export interface RunAnalyticsDaily {
  id: string
  promptId: string
  date: string // YYYY-MM-DD
  runCount: number
  successCount: number
  errorCount: number
  totalExecutionTimeMs: number
  avgExecutionTimeMs: number
}

// Aggregated analytics for display
export interface PromptAnalyticsSummary {
  promptId: string
  totalRuns: number
  successRate: number
  avgExecutionTimeMs: number
  lastRunAt?: string
  runsByDay: { date: string; count: number }[]
}

// Run mode specific types

export interface RunModeState {
  isActive: boolean
  promptId: string | null
  currentFieldIndex: number
  completedFields: string[]
  fieldValues: Record<string, unknown>
  messages: RunModeMessage[]
}

export interface RunModeMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  toolCall?: RunModeToolCall
}

export interface RunModeToolCall {
  type: 'displayField' | 'completeField' | 'askFollowUp'
  data: DisplayFieldTool | CompleteFieldTool | AskFollowUpTool
}

// Tool schemas for run mode AI

export interface DisplayFieldTool {
  variableKey: string
  guidance?: string
  suggestedValue?: string
}

export interface CompleteFieldTool {
  variableKey: string
  value: unknown
  reasoning?: string
}

export interface AskFollowUpTool {
  question: string
  relatedField: string
}
