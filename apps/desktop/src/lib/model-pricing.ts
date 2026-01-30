// Model pricing data - prices per 1M tokens in USD
// Last updated: January 2026

export interface ModelPricing {
  inputPer1M: number   // Cost per 1M input tokens
  outputPer1M: number  // Cost per 1M output tokens
}

// Pricing data for all supported models
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI Models
  'gpt-5.2': { inputPer1M: 5.00, outputPer1M: 15.00 },
  'gpt-5.2-mini': { inputPer1M: 0.50, outputPer1M: 1.50 },
  'gpt-5.2-nano': { inputPer1M: 0.10, outputPer1M: 0.30 },
  'gpt-5.1': { inputPer1M: 4.00, outputPer1M: 12.00 },
  'gpt-5': { inputPer1M: 3.00, outputPer1M: 10.00 },
  'gpt-5-mini': { inputPer1M: 0.40, outputPer1M: 1.20 },
  'gpt-4.1': { inputPer1M: 2.00, outputPer1M: 8.00 },
  'gpt-4.1-mini': { inputPer1M: 0.20, outputPer1M: 0.60 },
  'gpt-4.1-nano': { inputPer1M: 0.08, outputPer1M: 0.24 },
  'gpt-4o': { inputPer1M: 2.50, outputPer1M: 10.00 },
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.60 },

  // Anthropic Models
  'claude-opus-4-5': { inputPer1M: 15.00, outputPer1M: 75.00 },
  'claude-sonnet-4-5': { inputPer1M: 3.00, outputPer1M: 15.00 },
  'claude-opus-4-1': { inputPer1M: 12.00, outputPer1M: 60.00 },
  'claude-opus-4-0': { inputPer1M: 10.00, outputPer1M: 50.00 },
  'claude-sonnet-4-0': { inputPer1M: 2.50, outputPer1M: 12.50 },
  'claude-haiku-4-5': { inputPer1M: 0.80, outputPer1M: 4.00 },

  // Claude Code Models (uses Anthropic models under the hood)
  'sonnet': { inputPer1M: 3.00, outputPer1M: 15.00 },
  'opus': { inputPer1M: 15.00, outputPer1M: 75.00 },
  'haiku': { inputPer1M: 0.80, outputPer1M: 4.00 },

  // Google Models
  'gemini-3-pro-preview': { inputPer1M: 7.00, outputPer1M: 21.00 },
  'gemini-3-flash-preview': { inputPer1M: 0.50, outputPer1M: 1.50 },
  'gemini-2.5-pro': { inputPer1M: 5.00, outputPer1M: 15.00 },
  'gemini-2.5-flash': { inputPer1M: 0.35, outputPer1M: 1.05 },
}

/**
 * Calculate the estimated cost for a given token usage
 * @param inputTokens Number of input tokens
 * @param outputTokens Number of output tokens
 * @param modelId The model ID to look up pricing for
 * @returns Estimated cost in USD, or undefined if model pricing not found
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  modelId: string
): number | undefined {
  const pricing = MODEL_PRICING[modelId]
  if (!pricing) {
    return undefined
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M

  return inputCost + outputCost
}

/**
 * Format a cost value for display
 * @param cost Cost in USD
 * @returns Formatted string like "$0.0045" or "< $0.01"
 */
export function formatCost(cost: number): string {
  if (cost < 0.0001) {
    return '< $0.0001'
  }
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`
  }
  if (cost < 1) {
    return `$${cost.toFixed(3)}`
  }
  return `$${cost.toFixed(2)}`
}

/**
 * Format token count for display
 * @param tokens Number of tokens
 * @returns Formatted string like "1.2K", "45.3K", "1.5M"
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return tokens.toString()
  }
  if (tokens < 1_000_000) {
    const k = tokens / 1000
    return k >= 10 ? `${Math.round(k)}K` : `${k.toFixed(1)}K`
  }
  const m = tokens / 1_000_000
  return m >= 10 ? `${Math.round(m)}M` : `${m.toFixed(1)}M`
}
