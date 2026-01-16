import matter from 'gray-matter'
import type { PromptFile, Variable, ParseError } from '../types/prompt'
import { VARIABLE_PATTERN, isValidVariableKey, isValidTagName } from './constants'

export function parsePromptFile(
  content: string,
  fileName: string,
  path: string
): PromptFile {
  try {
    const { data, content: template } = matter(content)

    const errors: ParseError[] = []

    if (!data.name) {
      errors.push({ field: 'name', message: 'Missing required field: name' })
    }

    if (data.variables && !Array.isArray(data.variables)) {
      errors.push({ field: 'variables', message: 'Variables must be an array' })
    }

    const variables = validateVariables(data.variables || [])
    const tags = validateTags(data.tags)

    return {
      fileName,
      path,
      name: data.name || fileName.replace('.md', ''),
      description: data.description || '',
      tags: tags.valid,
      variables: variables.valid,
      template: template.trim(),
      rawContent: content,
      isValid: errors.length === 0 && variables.errors.length === 0 && tags.errors.length === 0,
      errors: [...errors, ...variables.errors, ...tags.errors],
    }
  } catch (e) {
    console.error('Frontmatter parse error:', e)
    return {
      fileName,
      path,
      name: fileName.replace('.md', ''),
      description: '',
      tags: [],
      variables: [],
      template: content,
      rawContent: content,
      isValid: false,
      errors: [{ field: 'frontmatter', message: `Failed to parse frontmatter: ${e instanceof Error ? e.message : String(e)}` }],
    }
  }
}

function validateTags(tags: unknown): {
  valid: string[]
  errors: ParseError[]
} {
  const errors: ParseError[] = []

  if (tags === undefined || tags === null) {
    return { valid: [], errors: [] }
  }

  if (!Array.isArray(tags)) {
    errors.push({ field: 'tags', message: 'Tags must be an array' })
    return { valid: [], errors }
  }

  const valid: string[] = []
  tags.forEach((tag, i) => {
    if (typeof tag === 'string') {
      const trimmed = tag.trim()
      if (isValidTagName(trimmed)) {
        valid.push(trimmed)
      } else {
        errors.push({ field: `tags[${i}]`, message: `Tag "${tag}" is invalid. Tags must be 1-30 characters` })
      }
    } else {
      errors.push({ field: `tags[${i}]`, message: 'Tag must be a string' })
    }
  })

  return { valid, errors }
}

function validateVariables(variables: unknown[]): {
  valid: Variable[]
  errors: ParseError[]
} {
  const valid: Variable[] = []
  const errors: ParseError[] = []

  variables.forEach((v, i) => {
    const variable = v as Record<string, unknown>

    if (!variable.key) {
      errors.push({ field: `variables[${i}]`, message: 'Variable missing key' })
      return
    }
    // Validate key format
    if (!isValidVariableKey(variable.key as string)) {
      errors.push({ field: `variables[${i}]`, message: `Invalid key format: ${variable.key}. Keys must be alphanumeric with hyphens/underscores, max 50 chars` })
      return
    }
    if (!variable.label) {
      errors.push({ field: `variables[${i}]`, message: 'Variable missing label' })
      return
    }
    if (!['text', 'textarea', 'select', 'number', 'checkbox'].includes(variable.type as string)) {
      errors.push({ field: `variables[${i}]`, message: `Invalid type: ${variable.type}` })
      return
    }
    if (variable.type === 'select' && (!variable.options || !Array.isArray(variable.options))) {
      errors.push({ field: `variables[${i}]`, message: 'Select type requires options array' })
      return
    }

    valid.push(variable as unknown as Variable)
  })

  return { valid, errors }
}

export function serializePrompt(prompt: PromptFile): string {
  const frontmatter: Record<string, unknown> = {
    name: prompt.name,
  }

  if (prompt.description) {
    frontmatter.description = prompt.description
  }

  if (prompt.tags && prompt.tags.length > 0) {
    frontmatter.tags = prompt.tags
  }

  if (prompt.variables.length > 0) {
    // Clean up undefined values from variables (YAML can't serialize undefined)
    frontmatter.variables = prompt.variables.map((v) => {
      const cleaned: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(v)) {
        if (value !== undefined) {
          cleaned[key] = value
        }
      }
      return cleaned
    })
  }

  return matter.stringify(prompt.template, frontmatter)
}

/**
 * Extract variable keys from template text by finding {{variable}} patterns
 * Returns unique variable keys found in the template
 * Only includes keys that pass validation
 */
export function extractVariablesFromTemplate(template: string): string[] {
  // Create a new regex instance to avoid issues with global flag state
  const regex = new RegExp(VARIABLE_PATTERN.source, 'g')
  const keys = new Set<string>()
  let match

  while ((match = regex.exec(template)) !== null) {
    const key = match[1]
    // Only add valid keys
    if (isValidVariableKey(key)) {
      keys.add(key)
    }
  }

  return Array.from(keys)
}

/**
 * Sync variables array with keys found in template
 * - Keeps existing variables that still exist in template
 * - Adds new variables with default settings
 * - Removes variables that no longer exist in template
 */
export function syncVariablesWithTemplate(
  existingVariables: Variable[],
  template: string
): Variable[] {
  const keysInTemplate = extractVariablesFromTemplate(template)
  const existingByKey = new Map(existingVariables.map(v => [v.key, v]))

  return keysInTemplate.map(key => {
    const existing = existingByKey.get(key)
    if (existing) {
      return existing
    }
    // Create new variable with defaults
    // Convert key to label: "competitor-analysis" → "Competitor Analysis", "Team_Members" → "Team Members"
    return {
      key,
      label: key
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' '),
      type: 'text' as const,
    }
  })
}
