/**
 * Parallel execution module for running prompts across multiple AI providers simultaneously.
 *
 * This module provides:
 * - Parallel streaming from multiple providers
 * - Per-provider result tracking with token/cost data
 * - Abort support for individual or all providers
 */

import type { ProviderConfig } from './store'
import type { ProviderRunResult, ProviderRunStatus } from '@/types/run'
import { calculateCost } from './model-pricing'
import { streamWithProvider, type TokenUsage } from './mastra-client'

export interface ParallelExecutionOptions {
  /** The rendered prompt content to execute */
  promptContent: string
  /** System prompt for the AI */
  systemPrompt?: string
  /** Provider configurations to run against */
  providerConfigs: ProviderConfig[]
  /** Callback fired when a provider's result updates */
  onProviderUpdate: (providerId: string, update: Partial<ProviderRunResult>) => void
  /** Optional abort signal for all executions */
  signal?: AbortSignal
}

export interface ParallelExecutionResult {
  /** Results keyed by provider ID */
  results: Record<string, ProviderRunResult>
  /** Whether all executions completed successfully */
  allSucceeded: boolean
  /** Number of providers that completed successfully */
  successCount: number
  /** Number of providers that failed */
  errorCount: number
}

/**
 * Execute a prompt across multiple providers in parallel.
 *
 * Each provider streams independently, with updates flowing through the onProviderUpdate callback.
 * The function returns when all providers have completed (success or error).
 */
export async function executeParallel(options: ParallelExecutionOptions): Promise<ParallelExecutionResult> {
  const { promptContent, systemPrompt, providerConfigs, onProviderUpdate, signal } = options

  const results: Record<string, ProviderRunResult> = {}

  // Initialize all providers as pending
  for (const config of providerConfigs) {
    const initialResult: ProviderRunResult = {
      providerId: config.id,
      providerAlias: config.alias,
      status: 'pending',
      content: '',
    }
    results[config.id] = initialResult
    onProviderUpdate(config.id, initialResult)
  }

  // Create execution promises for each provider
  const executions = providerConfigs.map(async (config) => {
    const startedAt = new Date().toISOString()

    // Mark as streaming
    onProviderUpdate(config.id, {
      status: 'streaming',
      startedAt,
    })
    results[config.id].status = 'streaming'
    results[config.id].startedAt = startedAt

    let content = ''
    let usage: TokenUsage | undefined

    return new Promise<void>((resolve) => {
      streamWithProvider({
        providerConfig: {
          provider: config.provider,
          apiKey: config.apiKey,
          model: config.model,
          claudeCodeExecutablePath: config.claudeCodeExecutablePath,
        },
        systemPrompt: systemPrompt || 'You are a helpful assistant.',
        messages: [{ role: 'user', content: promptContent }],
        onChunk: (chunk) => {
          content += chunk
          onProviderUpdate(config.id, { content })
          results[config.id].content = content
        },
        onComplete: (tokenUsage) => {
          usage = tokenUsage
          const completedAt = new Date().toISOString()
          const finalResult: Partial<ProviderRunResult> = {
            status: 'completed' as ProviderRunStatus,
            completedAt,
            inputTokens: usage?.inputTokens,
            outputTokens: usage?.outputTokens,
            totalTokens: usage ? usage.inputTokens + usage.outputTokens : undefined,
            estimatedCostUsd: usage ? calculateCost(usage.inputTokens, usage.outputTokens, config.model) : undefined,
          }

          Object.assign(results[config.id], finalResult)
          onProviderUpdate(config.id, finalResult)
          resolve()
        },
        onError: (error) => {
          const errorMessage = error.message
          const completedAt = new Date().toISOString()

          const errorResult: Partial<ProviderRunResult> = {
            status: 'error' as ProviderRunStatus,
            error: errorMessage,
            completedAt,
          }

          Object.assign(results[config.id], errorResult)
          onProviderUpdate(config.id, errorResult)
          resolve()
        },
        signal,
      })
    })
  })

  // Wait for all executions to complete
  await Promise.allSettled(executions)

  // Calculate summary stats in a single iteration
  let successCount = 0
  let errorCount = 0
  for (const result of Object.values(results)) {
    if (result.status === 'completed') successCount++
    else if (result.status === 'error') errorCount++
  }

  return {
    results,
    allSucceeded: errorCount === 0,
    successCount,
    errorCount,
  }
}

/**
 * Create a combined abort controller that can abort multiple providers.
 */
export function createParallelAbortController(): {
  controller: AbortController
  abort: () => void
} {
  const controller = new AbortController()
  return {
    controller,
    abort: () => controller.abort(),
  }
}
