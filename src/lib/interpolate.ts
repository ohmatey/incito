import type { Variable, SerializationFormat } from '../types/prompt'
import { VARIABLE_PATTERN, CONDITIONAL_PATTERN } from './constants'

function serializeArray(items: string[], format: SerializationFormat = 'comma'): string {
  if (items.length === 0) return ''
  switch (format) {
    case 'newline':
      return items.join('\n')
    case 'comma':
      return items.join(', ')
    case 'numbered':
      return items.map((item, i) => `${i + 1}. ${item}`).join('\n')
    case 'bullet':
      return items.map(item => `- ${item}`).join('\n')
  }
}

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
    // For arrays, check if they have any items
    if (Array.isArray(value)) {
      return value.length > 0 ? content : ''
    }
    if (value && value !== '' && value !== false) {
      return content
    }
    return ''
  })

  // Handle simple variable substitution: {{key}}
  const variableRegex = new RegExp(VARIABLE_PATTERN.source, 'g')
  result = result.replace(variableRegex, (_, key) => {
    const variable = variables.find((v) => v.key === key)
    const value = values[key]

    if (value !== undefined && value !== '') {
      // Handle array values (from array or multi-select types)
      if (Array.isArray(value)) {
        const format = variable?.format || 'comma'
        return serializeArray(value as string[], format)
      }
      return String(value)
    }
    // Fall back to default value
    if (variable?.default !== undefined) {
      if (Array.isArray(variable.default)) {
        const format = variable?.format || 'comma'
        return serializeArray(variable.default, format)
      }
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
