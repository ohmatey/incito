import matter from 'gray-matter'
import yaml from 'js-yaml'
import type { AgentFile, AgentParseError, AgentIcon, AgentSettings, AgentTool } from '../types/agent'
import { isValidTagName } from './constants'

const VALID_ICONS: AgentIcon[] = [
  'bot', 'brain', 'sparkles', 'wand', 'search', 'pencil', 'code',
  'file-text', 'message-circle', 'zap', 'lightbulb', 'target', 'clipboard', 'book', 'globe',
]

export function parseAgentFile(
  content: string,
  fileName: string,
  path: string
): AgentFile {
  try {
    const { data, content: documentation } = matter(content)

    const errors: AgentParseError[] = []

    // Required field: name
    if (!data.name) {
      errors.push({ field: 'name', message: 'Missing required field: name' })
    }

    // Required field: systemPrompt
    if (!data.systemPrompt) {
      errors.push({ field: 'systemPrompt', message: 'Missing required field: systemPrompt' })
    }

    // Validate optional fields
    const tags = validateTags(data.tags)
    const icon = validateIcon(data.icon)
    const settings = validateSettings(data.settings)
    const tools = validateTools(data.tools)

    // Use existing id or generate a new one
    const id = data.id && typeof data.id === 'string' ? data.id : crypto.randomUUID()

    return {
      id,
      fileName,
      path,
      name: data.name || fileName.replace('.agent.md', ''),
      description: data.description || '',
      tags: tags.valid,
      icon: icon.valid,
      systemPrompt: data.systemPrompt || '',
      settings: settings.valid,
      tools: tools.valid,
      documentation: documentation.trim() || undefined,
      rawContent: content,
      isValid: errors.length === 0 && tags.errors.length === 0 && tools.errors.length === 0,
      errors: [...errors, ...tags.errors, ...tools.errors],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }
  } catch (e) {
    console.error('Agent frontmatter parse error:', e)
    return {
      id: crypto.randomUUID(),
      fileName,
      path,
      name: fileName.replace('.agent.md', ''),
      description: '',
      tags: [],
      icon: 'bot',
      systemPrompt: '',
      settings: {},
      tools: [],
      rawContent: content,
      isValid: false,
      errors: [{ field: 'frontmatter', message: `Failed to parse frontmatter: ${e instanceof Error ? e.message : String(e)}` }],
    }
  }
}

function validateTags(tags: unknown): {
  valid: string[]
  errors: AgentParseError[]
} {
  const errors: AgentParseError[] = []

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

function validateIcon(icon: unknown): {
  valid: AgentIcon
  errors: AgentParseError[]
} {
  if (icon === undefined || icon === null) {
    return { valid: 'bot', errors: [] }
  }

  if (typeof icon !== 'string') {
    return { valid: 'bot', errors: [{ field: 'icon', message: 'Icon must be a string' }] }
  }

  if (VALID_ICONS.includes(icon as AgentIcon)) {
    return { valid: icon as AgentIcon, errors: [] }
  }

  return { valid: 'bot', errors: [{ field: 'icon', message: `Invalid icon: ${icon}. Valid options: ${VALID_ICONS.join(', ')}` }] }
}

function validateSettings(settings: unknown): {
  valid: AgentSettings
  errors: AgentParseError[]
} {
  if (settings === undefined || settings === null) {
    return { valid: {}, errors: [] }
  }

  if (typeof settings !== 'object') {
    return { valid: {}, errors: [{ field: 'settings', message: 'Settings must be an object' }] }
  }

  const s = settings as Record<string, unknown>
  const valid: AgentSettings = {}
  const errors: AgentParseError[] = []

  if (s.model !== undefined) {
    if (typeof s.model === 'string') {
      valid.model = s.model
    } else {
      errors.push({ field: 'settings.model', message: 'Model must be a string' })
    }
  }

  if (s.temperature !== undefined) {
    if (typeof s.temperature === 'number' && s.temperature >= 0 && s.temperature <= 2) {
      valid.temperature = s.temperature
    } else {
      errors.push({ field: 'settings.temperature', message: 'Temperature must be a number between 0 and 2' })
    }
  }

  if (s.maxTokens !== undefined) {
    if (typeof s.maxTokens === 'number' && s.maxTokens > 0) {
      valid.maxTokens = s.maxTokens
    } else {
      errors.push({ field: 'settings.maxTokens', message: 'maxTokens must be a positive number' })
    }
  }

  if (s.language !== undefined) {
    if (typeof s.language === 'string') {
      valid.language = s.language
    } else {
      errors.push({ field: 'settings.language', message: 'Language must be a string' })
    }
  }

  return { valid, errors }
}

function validateTools(tools: unknown): {
  valid: AgentTool[]
  errors: AgentParseError[]
} {
  const errors: AgentParseError[] = []

  if (tools === undefined || tools === null) {
    return { valid: [], errors: [] }
  }

  if (!Array.isArray(tools)) {
    errors.push({ field: 'tools', message: 'Tools must be an array' })
    return { valid: [], errors }
  }

  const valid: AgentTool[] = []
  tools.forEach((tool, i) => {
    if (typeof tool !== 'object' || tool === null) {
      errors.push({ field: `tools[${i}]`, message: 'Tool must be an object' })
      return
    }

    const t = tool as Record<string, unknown>

    if (!t.id || typeof t.id !== 'string') {
      errors.push({ field: `tools[${i}]`, message: 'Tool must have an id (string)' })
      return
    }

    if (!t.name || typeof t.name !== 'string') {
      errors.push({ field: `tools[${i}]`, message: 'Tool must have a name (string)' })
      return
    }

    valid.push({
      id: t.id,
      name: t.name,
      enabled: t.enabled !== false, // Default to true
      description: typeof t.description === 'string' ? t.description : undefined,
    })
  })

  return { valid, errors }
}

export function serializeAgent(agent: AgentFile): string {
  const frontmatter: Record<string, unknown> = {
    id: agent.id,
    name: agent.name,
  }

  if (agent.description) {
    frontmatter.description = agent.description
  }

  if (agent.tags && agent.tags.length > 0) {
    frontmatter.tags = agent.tags
  }

  if (agent.icon && agent.icon !== 'bot') {
    frontmatter.icon = agent.icon
  }

  if (agent.systemPrompt) {
    frontmatter.systemPrompt = agent.systemPrompt
  }

  // Only add settings if they have values
  if (agent.settings && Object.keys(agent.settings).length > 0) {
    const cleanedSettings: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(agent.settings)) {
      if (value !== undefined) {
        cleanedSettings[key] = value
      }
    }
    if (Object.keys(cleanedSettings).length > 0) {
      frontmatter.settings = cleanedSettings
    }
  }

  if (agent.tools && agent.tools.length > 0) {
    frontmatter.tools = agent.tools.map((tool) => {
      const cleaned: Record<string, unknown> = {
        id: tool.id,
        name: tool.name,
      }
      if (!tool.enabled) {
        cleaned.enabled = false
      }
      if (tool.description) {
        cleaned.description = tool.description
      }
      return cleaned
    })
  }

  if (agent.createdAt) {
    frontmatter.createdAt = agent.createdAt
  }

  if (agent.updatedAt) {
    frontmatter.updatedAt = agent.updatedAt
  }

  // Manually construct the output
  const yamlStr = yaml.dump(frontmatter, { lineWidth: -1 }).trim()
  const documentation = agent.documentation
    ? (agent.documentation.endsWith('\n') ? agent.documentation : agent.documentation + '\n')
    : ''

  return `---\n${yamlStr}\n---\n${documentation}`
}
