import Handlebars from 'handlebars'
import type { Variable, SerializationFormat } from '../types/prompt'

// Register comparison helpers
Handlebars.registerHelper('eq', (a, b) => a === b)
Handlebars.registerHelper('ne', (a, b) => a !== b)
Handlebars.registerHelper('gt', (a, b) => a > b)
Handlebars.registerHelper('gte', (a, b) => a >= b)
Handlebars.registerHelper('lt', (a, b) => a < b)
Handlebars.registerHelper('lte', (a, b) => a <= b)

// Register logical helpers
Handlebars.registerHelper('and', (a, b) => a && b)
Handlebars.registerHelper('or', (a, b) => a || b)
Handlebars.registerHelper('not', (a) => !a)

// Register array helpers
Handlebars.registerHelper('contains', (arr, item) => {
  if (Array.isArray(arr)) return arr.includes(item)
  return false
})

Handlebars.registerHelper('length', (arr) => {
  if (Array.isArray(arr)) return arr.length
  if (typeof arr === 'string') return arr.length
  return 0
})

// Helper for array formatting
Handlebars.registerHelper('formatArray', function(items: string[], format: SerializationFormat = 'comma') {
  if (!Array.isArray(items) || items.length === 0) return ''
  switch (format) {
    case 'newline':
      return items.join('\n')
    case 'numbered':
      return items.map((item, i) => `${i + 1}. ${item}`).join('\n')
    case 'bullet':
      return items.map(item => `- ${item}`).join('\n')
    case 'comma':
    default:
      return items.join(', ')
  }
})

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
  // Build context with defaults and formatted arrays
  const context: Record<string, unknown> = {}

  for (const v of variables) {
    const value = values[v.key]

    if (value !== undefined && value !== '') {
      // Handle array values with formatting for direct substitution
      if (Array.isArray(value)) {
        const format = v.format || 'comma'
        // Store both the raw array and a formatted version
        context[v.key] = serializeArray(value as string[], format)
        context[`${v.key}_array`] = value // Raw array for iteration
      } else {
        context[v.key] = value
      }
    } else if (v.default !== undefined) {
      // Handle default values
      if (Array.isArray(v.default)) {
        const format = v.format || 'comma'
        context[v.key] = serializeArray(v.default, format)
        context[`${v.key}_array`] = v.default
      } else {
        context[v.key] = v.default
      }
    }
  }

  try {
    // noEscape prevents HTML escaping (we want raw output for prompts)
    const compiled = Handlebars.compile(template, { noEscape: true })
    return compiled(context)
  } catch {
    // Return original template on compilation/runtime errors
    return template
  }
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
