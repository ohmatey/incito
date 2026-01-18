import matter from 'gray-matter'
import type { PromptFile, Variable, ParseError, SelectOption, SerializationFormat, Note } from '../types/prompt'
import { VARIABLE_PATTERN, BLOCK_HELPER_PATTERN, HELPER_VARIABLE_PATTERN, isValidVariableKey, isValidTagName } from './constants'
import { AVAILABLE_LAUNCHERS } from './launchers'

const VALID_TYPES = ['text', 'textarea', 'select', 'number', 'slider', 'array', 'multi-select']
const VALID_FORMATS: SerializationFormat[] = ['newline', 'comma', 'numbered', 'bullet']

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
    const notes = validateNotes(data.notes)
    const defaultLaunchers = validateDefaultLaunchers(data.defaultLaunchers)

    // Use existing id or generate a new one
    const id = data.id && typeof data.id === 'string' ? data.id : crypto.randomUUID()

    return {
      id,
      fileName,
      path,
      name: data.name || fileName.replace('.md', ''),
      description: data.description || '',
      tags: tags.valid,
      variables: variables.valid,
      notes: notes.valid,
      defaultLaunchers: defaultLaunchers.valid,
      template: template.trim(),
      rawContent: content,
      isValid: errors.length === 0 && variables.errors.length === 0 && tags.errors.length === 0 && notes.errors.length === 0,
      errors: [...errors, ...variables.errors, ...tags.errors, ...notes.errors],
    }
  } catch (e) {
    console.error('Frontmatter parse error:', e)
    return {
      id: crypto.randomUUID(),
      fileName,
      path,
      name: fileName.replace('.md', ''),
      description: '',
      tags: [],
      variables: [],
      notes: [],
      defaultLaunchers: [],
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

function validateNotes(notes: unknown): {
  valid: Note[]
  errors: ParseError[]
} {
  const errors: ParseError[] = []

  if (notes === undefined || notes === null) {
    return { valid: [], errors: [] }
  }

  if (!Array.isArray(notes)) {
    errors.push({ field: 'notes', message: 'Notes must be an array' })
    return { valid: [], errors }
  }

  const valid: Note[] = []
  notes.forEach((note, i) => {
    if (typeof note !== 'object' || note === null) {
      errors.push({ field: `notes[${i}]`, message: 'Note must be an object' })
      return
    }

    const n = note as Record<string, unknown>

    if (!n.id || typeof n.id !== 'string') {
      errors.push({ field: `notes[${i}]`, message: 'Note must have an id' })
      return
    }

    if (!n.content || typeof n.content !== 'string') {
      errors.push({ field: `notes[${i}]`, message: 'Note must have content' })
      return
    }

    if (!n.createdAt || typeof n.createdAt !== 'string') {
      errors.push({ field: `notes[${i}]`, message: 'Note must have a createdAt timestamp' })
      return
    }

    valid.push({
      id: n.id,
      content: n.content,
      createdAt: n.createdAt,
    })
  })

  return { valid, errors }
}

function validateDefaultLaunchers(launchers: unknown): {
  valid: string[]
  errors: ParseError[]
} {
  if (launchers === undefined || launchers === null) {
    return { valid: [], errors: [] }
  }

  if (!Array.isArray(launchers)) {
    return { valid: [], errors: [{ field: 'defaultLaunchers', message: 'defaultLaunchers must be an array' }] }
  }

  const validLauncherIds = AVAILABLE_LAUNCHERS.map((l) => l.id)
  const valid: string[] = []

  launchers.forEach((launcher) => {
    if (typeof launcher === 'string' && validLauncherIds.includes(launcher)) {
      valid.push(launcher)
    }
    // Silently filter out invalid launcher IDs as per plan
  })

  return { valid, errors: [] }
}

function isValidSelectOption(opt: unknown): opt is SelectOption {
  if (typeof opt !== 'object' || opt === null) return false
  const o = opt as Record<string, unknown>
  return typeof o.label === 'string' && typeof o.value === 'string'
}

// Convert string options to SelectOption format
function normalizeOptions(options: unknown[]): SelectOption[] {
  return options.map(opt => {
    if (typeof opt === 'string') {
      return { label: opt, value: opt }
    }
    if (isValidSelectOption(opt)) {
      return opt
    }
    // Fallback - convert to string
    return { label: String(opt), value: String(opt) }
  })
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
    if (!VALID_TYPES.includes(variable.type as string)) {
      errors.push({ field: `variables[${i}]`, message: `Invalid type: ${variable.type}` })
      return
    }

    // Validate select and multi-select options
    if (variable.type === 'select' || variable.type === 'multi-select') {
      if (!variable.options || !Array.isArray(variable.options)) {
        errors.push({ field: `variables[${i}]`, message: `${variable.type} type requires options array` })
        return
      }
      if (variable.options.length === 0) {
        errors.push({ field: `variables[${i}]`, message: `${variable.type} type requires at least one option` })
        return
      }
      // Normalize options to SelectOption format (supports both string[] and SelectOption[])
      variable.options = normalizeOptions(variable.options)
    }

    // Validate slider
    if (variable.type === 'slider') {
      if (typeof variable.min !== 'number') {
        errors.push({ field: `variables[${i}]`, message: 'Slider type requires min (number)' })
        return
      }
      if (typeof variable.max !== 'number') {
        errors.push({ field: `variables[${i}]`, message: 'Slider type requires max (number)' })
        return
      }
      if (variable.min >= variable.max) {
        errors.push({ field: `variables[${i}]`, message: 'Slider min must be less than max' })
        return
      }
      if (variable.step !== undefined && (typeof variable.step !== 'number' || variable.step <= 0)) {
        errors.push({ field: `variables[${i}]`, message: 'Slider step must be a positive number' })
        return
      }
    }

    // Validate format for array and multi-select
    if ((variable.type === 'array' || variable.type === 'multi-select') && variable.format !== undefined) {
      if (!VALID_FORMATS.includes(variable.format as SerializationFormat)) {
        errors.push({ field: `variables[${i}]`, message: `Invalid format: ${variable.format}. Must be one of: ${VALID_FORMATS.join(', ')}` })
        return
      }
    }

    valid.push(variable as unknown as Variable)
  })

  return { valid, errors }
}

export function serializePrompt(prompt: PromptFile): string {
  const frontmatter: Record<string, unknown> = {
    id: prompt.id,
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

  if (prompt.notes && prompt.notes.length > 0) {
    frontmatter.notes = prompt.notes
  }

  if (prompt.defaultLaunchers && prompt.defaultLaunchers.length > 0) {
    frontmatter.defaultLaunchers = prompt.defaultLaunchers
  }

  return matter.stringify(prompt.template, frontmatter)
}

/**
 * Extract variable keys from template text by finding {{variable}} patterns
 * Also detects variables in Handlebars helpers like {{#if var}}, {{#each var}}, {{#if (eq var "value")}}
 * Returns unique variable keys found in the template
 * Only includes keys that pass validation
 */
export function extractVariablesFromTemplate(template: string): string[] {
  const keys = new Set<string>()

  // Helper to extract keys from a pattern
  const extractWithPattern = (pattern: RegExp) => {
    const regex = new RegExp(pattern.source, 'g')
    let match
    while ((match = regex.exec(template)) !== null) {
      const key = match[1]
      if (isValidVariableKey(key)) {
        keys.add(key)
      }
    }
  }

  // Match simple variables: {{variable}}
  extractWithPattern(VARIABLE_PATTERN)

  // Match block helpers: {{#if variable}}, {{#unless variable}}, {{#each variable}}, {{#with variable}}
  extractWithPattern(BLOCK_HELPER_PATTERN)

  // Match comparison helpers: {{#if (eq variable "value")}}
  extractWithPattern(HELPER_VARIABLE_PATTERN)

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
