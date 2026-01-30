// Local grader execution for assertions (runs in the frontend)
// LLM judge graders require the backend server

import type { AssertionGrader } from '@/types/grader'

interface AssertionResult {
  score: number
  passed: boolean
  reason?: string
  executionTimeMs: number
}

export function executeAssertionGrader(
  grader: AssertionGrader,
  output: string
): AssertionResult {
  const startTime = performance.now()
  const { operator, value, caseSensitive } = grader.logic

  // Normalize for case-insensitive comparisons
  const normalizedOutput = caseSensitive ? output : output.toLowerCase()
  const normalizedValue = typeof value === 'string' && !caseSensitive
    ? value.toLowerCase()
    : value

  let passed = false
  let reason: string | undefined

  switch (operator) {
    case 'contains':
      passed = normalizedOutput.includes(String(normalizedValue))
      reason = passed
        ? `Output contains "${value}"`
        : `Output does not contain "${value}"`
      break

    case 'not_contains':
      passed = !normalizedOutput.includes(String(normalizedValue))
      reason = passed
        ? `Output does not contain "${value}"`
        : `Output contains "${value}" (should not)`
      break

    case 'starts_with':
      passed = normalizedOutput.startsWith(String(normalizedValue))
      reason = passed
        ? `Output starts with "${value}"`
        : `Output does not start with "${value}"`
      break

    case 'ends_with':
      passed = normalizedOutput.endsWith(String(normalizedValue))
      reason = passed
        ? `Output ends with "${value}"`
        : `Output does not end with "${value}"`
      break

    case 'equals':
      passed = normalizedOutput === String(normalizedValue)
      reason = passed
        ? `Output equals expected value`
        : `Output does not equal expected value`
      break

    case 'max_length':
      passed = output.length <= Number(value)
      reason = passed
        ? `Output length (${output.length}) is within limit (${value})`
        : `Output length (${output.length}) exceeds limit (${value})`
      break

    case 'min_length':
      passed = output.length >= Number(value)
      reason = passed
        ? `Output length (${output.length}) meets minimum (${value})`
        : `Output length (${output.length}) is below minimum (${value})`
      break

    case 'regex':
      try {
        const regex = new RegExp(String(value), caseSensitive ? '' : 'i')
        passed = regex.test(output)
        reason = passed
          ? `Output matches pattern`
          : `Output does not match pattern`
      } catch (e) {
        passed = false
        reason = `Invalid regex pattern: ${e instanceof Error ? e.message : 'Unknown error'}`
      }
      break

    case 'json_valid':
      try {
        JSON.parse(output)
        passed = true
        reason = 'Output is valid JSON'
      } catch (e) {
        passed = false
        reason = `Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}`
      }
      break

    default:
      passed = false
      reason = `Unknown operator: ${operator}`
  }

  const executionTimeMs = Math.round(performance.now() - startTime)

  return {
    score: passed ? 1.0 : 0.0,
    passed,
    reason,
    executionTimeMs,
  }
}
