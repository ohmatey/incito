import type { Variable } from '../types/prompt'
import { VARIABLE_PATTERN, CONDITIONAL_PATTERN } from './constants'

export function interpolate(
  template: string,
  values: Record<string, unknown>,
  variables: Variable[]
): string {
  let result = template

  // Handle conditional blocks: {{#if key}}...{{/if}}
  // Create new regex instances to avoid issues with global flag state
  const conditionalRegex = new RegExp(CONDITIONAL_PATTERN.source, 'g')
  result = result.replace(conditionalRegex, (_, key, content) => {
    const value = values[key]
    if (value && value !== '' && value !== false) {
      return content
    }
    return ''
  })

  // Handle simple variable substitution: {{key}}
  const variableRegex = new RegExp(VARIABLE_PATTERN.source, 'g')
  result = result.replace(variableRegex, (_, key) => {
    if (values[key] !== undefined && values[key] !== '') {
      return String(values[key])
    }
    // Fall back to default value
    const variable = variables.find((v) => v.key === key)
    if (variable?.default !== undefined) {
      return String(variable.default)
    }
    return `{{${key}}}` // Leave placeholder if no value
  })

  return result
}

export function getPreviewValues(variables: Variable[]): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  variables.forEach((v) => {
    if (v.preview !== undefined) {
      values[v.key] = v.preview
    } else if (v.default !== undefined) {
      values[v.key] = v.default
    }
  })
  return values
}

export function getDefaultValues(variables: Variable[]): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  variables.forEach((v) => {
    if (v.default !== undefined) {
      values[v.key] = v.default
    }
  })
  return values
}
