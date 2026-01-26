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

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{\{/g, '\\{{').replace(/\}\}/g, '\\}}')
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue)
  }
  return value
}

export function interpolate(
  template: string,
  values: Record<string, unknown>,
  variables: Variable[]
): string {
  // Build context with defaults and formatted arrays
  const context: Record<string, unknown> = {}

  // Create a map of variable keys for quick lookup
  const variableMap = new Map(variables.map(v => [v.key, v]))

  // First, add all values passed in (even those without variable definitions)
  // Track which keys were explicitly set (even if empty string)
  const explicitlySet = new Set<string>()
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      explicitlySet.add(key)
      if (value !== '') {
        const variable = variableMap.get(key)
        // Handle array values with formatting for direct substitution
        if (Array.isArray(value)) {
          const format = variable?.format || 'comma'
          // Store both the raw array and a formatted version
          context[key] = serializeArray(value as string[], format)
          context[`${key}_array`] = value // Raw array for iteration
        } else {
          context[key] = sanitizeValue(value)
        }
      } else {
        // Empty string is explicitly set - add it so conditionals work correctly
        context[key] = ''
      }
    }
  }

  // Then, fill in defaults for variables not in values
  for (const v of variables) {
    if (context[v.key] === undefined && v.default !== undefined) {
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

  // Find all simple variable references in template and preserve undefined ones as placeholders
  // Match {{varname}} but not {{#if}}, {{/if}}, {{else}}, etc.
  const varRefRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_-]*)\}\}/g
  let match
  while ((match = varRefRegex.exec(template)) !== null) {
    const varName = match[1]
    // Skip built-in Handlebars keywords
    if (['if', 'unless', 'each', 'with', 'else'].includes(varName)) continue
    // If not already in context, add the placeholder as the value
    if (context[varName] === undefined) {
      context[varName] = `{{${varName}}}`
    }
  }

  try {
    // noEscape prevents HTML escaping (we want raw output for prompts)
    const compiled = Handlebars.compile(template, { noEscape: true, strict: false })
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
