// Run History Operations
// Functions for tracking prompt runs and managing run history

import type { PromptRun, RunLauncher } from '@/types/run'
import {
  createPromptRun,
  updatePromptRunStatus,
  getPromptRuns,
  saveRunVariables,
} from './store'

export interface StartRunOptions {
  promptId: string
  promptPath: string
  promptName: string
  launcher: RunLauncher
}

export interface CompleteRunOptions {
  runId: string
  variableValues: Record<string, unknown>
  success: boolean
  errorMessage?: string
}

/**
 * Start tracking a new prompt run
 */
export async function startRun(options: StartRunOptions): Promise<string | null> {
  const result = await createPromptRun(
    options.promptId,
    options.promptPath,
    options.promptName,
    options.launcher
  )

  if (result.ok) {
    return result.data.id
  }

  console.error('Failed to start run:', result.error)
  return null
}

/**
 * Complete a run with success or failure
 */
export async function completeRun(options: CompleteRunOptions): Promise<boolean> {
  const { runId, variableValues, success, errorMessage } = options

  // Save variable values
  const variables = Object.entries(variableValues).map(([key, value]) => ({
    key,
    value,
    type: Array.isArray(value) ? 'array' : typeof value,
  }))

  if (variables.length > 0) {
    await saveRunVariables(runId, variables)
  }

  // Update run status
  const status = success ? 'completed' : 'error'
  const result = await updatePromptRunStatus(runId, status, errorMessage)

  return result.ok
}

/**
 * Get run history for a prompt
 */
export async function getRunHistory(
  promptId: string,
  limit = 50
): Promise<PromptRun[]> {
  const result = await getPromptRuns(promptId, limit)
  return result.ok ? result.data : []
}

/**
 * Format run duration for display
 */
export function formatDuration(ms?: number): string {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}
