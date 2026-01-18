export const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#6b7280', // gray
]

/**
 * Regex pattern for matching template variables: {{variable_name}}
 * Allows alphanumeric characters, underscores, and hyphens
 */
export const VARIABLE_PATTERN = /\{\{([\w-]+)\}\}/g

/**
 * Regex pattern for conditional blocks: {{#if key}}...{{/if}}
 * @deprecated Use Handlebars directly instead
 */
export const CONDITIONAL_PATTERN = /\{\{#if ([\w-]+)\}\}([\s\S]*?)\{\{\/if\}\}/g

/**
 * Regex pattern for Handlebars block helpers: {{#if key}}, {{#unless key}}, {{#each key}}, {{#with key}}
 */
export const BLOCK_HELPER_PATTERN = /\{\{#(?:if|unless|each|with)\s+([\w-]+)\}\}/g

/**
 * Regex pattern for Handlebars comparison helpers: {{#if (eq key "value")}}, {{#if (gt key 5)}}
 * Captures the variable name in helpers like eq, ne, gt, gte, lt, lte, contains, and, or
 */
export const HELPER_VARIABLE_PATTERN = /\{\{#(?:if|unless)\s+\((?:eq|ne|gt|gte|lt|lte|contains|and|or|not)\s+([\w-]+)/g

/**
 * Validation pattern for variable keys
 * Alphanumeric, underscores, hyphens, max 50 chars
 */
export const VARIABLE_KEY_PATTERN = /^[\w-]{1,50}$/

/**
 * Maximum length for tag names
 */
export const MAX_TAG_NAME_LENGTH = 30

/**
 * Maximum template size in bytes (100KB)
 */
export const MAX_TEMPLATE_SIZE = 100 * 1024

/**
 * Validates a variable key format
 */
export function isValidVariableKey(key: string): boolean {
  return VARIABLE_KEY_PATTERN.test(key)
}

/**
 * Validates a tag name
 */
export function isValidTagName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length > 0 && trimmed.length <= MAX_TAG_NAME_LENGTH
}

/**
 * Validates template size
 */
export function isValidTemplateSize(template: string): boolean {
  return new Blob([template]).size <= MAX_TEMPLATE_SIZE
}
