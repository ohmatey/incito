import { describe, it, expect } from 'vitest'
import { parsePromptFile, extractVariablesFromTemplate, syncVariablesWithTemplate, serializePrompt } from '../parser'

describe('parsePromptFile', () => {
  it('parses valid frontmatter with variables', () => {
    const content = `---
name: "Test Prompt"
description: "A test description"
tags:
  - tag1
  - tag2
variables:
  - key: topic
    label: "Topic"
    type: text
    required: true
---

Hello {{topic}}!`

    const result = parsePromptFile(content, 'test.md', '/path/test.md')

    expect(result.isValid).toBe(true)
    expect(result.name).toBe('Test Prompt')
    expect(result.description).toBe('A test description')
    expect(result.tags).toEqual(['tag1', 'tag2'])
    expect(result.variables).toHaveLength(1)
    expect(result.variables[0].key).toBe('topic')
    expect(result.template).toBe('Hello {{topic}}!')
  })

  it('handles missing name by using filename', () => {
    const content = `---
description: "No name here"
---

Template content`

    const result = parsePromptFile(content, 'my-prompt.md', '/path/my-prompt.md')

    expect(result.name).toBe('my-prompt')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContainEqual({ field: 'name', message: 'Missing required field: name' })
  })

  it('validates variable types', () => {
    const content = `---
name: "Test"
variables:
  - key: test
    label: "Test"
    type: invalid
---

Template`

    const result = parsePromptFile(content, 'test.md', '/path/test.md')

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.message.includes('Invalid type'))).toBe(true)
  })

  it('validates variable key format', () => {
    const content = `---
name: "Test"
variables:
  - key: "this-key-is-way-too-long-and-should-fail-validation-because-it-exceeds-fifty-characters"
    label: "Test"
    type: text
---

Template`

    const result = parsePromptFile(content, 'test.md', '/path/test.md')

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.message.includes('Invalid key format'))).toBe(true)
  })

  it('validates tag names', () => {
    const content = `---
name: "Test"
tags:
  - "this is a very long tag name that exceeds the maximum allowed length of thirty characters"
---

Template`

    const result = parsePromptFile(content, 'test.md', '/path/test.md')

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.message.includes('invalid'))).toBe(true)
  })

  it('handles malformed frontmatter', () => {
    const content = `---
name: [this is invalid yaml
---

Template`

    const result = parsePromptFile(content, 'test.md', '/path/test.md')

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field === 'frontmatter')).toBe(true)
  })

  it('handles empty content', () => {
    const content = ''

    const result = parsePromptFile(content, 'test.md', '/path/test.md')

    expect(result.name).toBe('test')
    expect(result.template).toBe('')
  })
})

describe('extractVariablesFromTemplate', () => {
  it('extracts simple variables', () => {
    const template = 'Hello {{name}}, welcome to {{place}}!'
    const result = extractVariablesFromTemplate(template)

    expect(result).toContain('name')
    expect(result).toContain('place')
    expect(result).toHaveLength(2)
  })

  it('handles hyphens in variable names', () => {
    const template = 'The {{first-name}} and {{last-name}}'
    const result = extractVariablesFromTemplate(template)

    expect(result).toContain('first-name')
    expect(result).toContain('last-name')
  })

  it('handles underscores in variable names', () => {
    const template = 'Value: {{my_variable}}'
    const result = extractVariablesFromTemplate(template)

    expect(result).toContain('my_variable')
  })

  it('deduplicates repeated variables', () => {
    const template = '{{name}} said hello to {{name}}'
    const result = extractVariablesFromTemplate(template)

    expect(result).toEqual(['name'])
  })

  it('returns empty array for no variables', () => {
    const template = 'No variables here!'
    const result = extractVariablesFromTemplate(template)

    expect(result).toEqual([])
  })

  it('ignores invalid variable patterns', () => {
    const template = 'Not a variable: {{ space }}, {single}, {{123start}}'
    const result = extractVariablesFromTemplate(template)

    // 123start starts with number, should not match [\w-]+ which starts with letter/underscore
    expect(result).not.toContain(' space ')
    expect(result).not.toContain('single')
  })
})

describe('syncVariablesWithTemplate', () => {
  it('keeps existing variables that are in template', () => {
    const existing = [
      { key: 'name', label: 'Name', type: 'text' as const, required: true },
    ]
    const template = 'Hello {{name}}'

    const result = syncVariablesWithTemplate(existing, template)

    expect(result).toHaveLength(1)
    expect(result[0].required).toBe(true)
  })

  it('adds new variables found in template', () => {
    const existing = [
      { key: 'name', label: 'Name', type: 'text' as const },
    ]
    const template = 'Hello {{name}}, from {{city}}'

    const result = syncVariablesWithTemplate(existing, template)

    expect(result).toHaveLength(2)
    expect(result.find(v => v.key === 'city')).toBeDefined()
  })

  it('removes variables not in template', () => {
    const existing = [
      { key: 'name', label: 'Name', type: 'text' as const },
      { key: 'removed', label: 'Removed', type: 'text' as const },
    ]
    const template = 'Hello {{name}}'

    const result = syncVariablesWithTemplate(existing, template)

    expect(result).toHaveLength(1)
    expect(result.find(v => v.key === 'removed')).toBeUndefined()
  })

  it('generates label from key with hyphens', () => {
    const existing: { key: string; label: string; type: 'text' }[] = []
    const template = '{{first-name}}'

    const result = syncVariablesWithTemplate(existing, template)

    expect(result[0].label).toBe('First Name')
  })

  it('generates label from key with underscores', () => {
    const existing: { key: string; label: string; type: 'text' }[] = []
    const template = '{{user_email}}'

    const result = syncVariablesWithTemplate(existing, template)

    expect(result[0].label).toBe('User Email')
  })
})

describe('serializePrompt', () => {
  it('serializes prompt to valid frontmatter', () => {
    const prompt = {
      id: 'test-id-1',
      fileName: 'test.md',
      path: '/path/test.md',
      name: 'Test Prompt',
      description: 'A description',
      tags: ['tag1'],
      variables: [{ key: 'name', label: 'Name', type: 'text' as const }],
      notes: [],
      template: 'Hello {{name}}',
      rawContent: '',
      isValid: true,
      errors: [],
    }

    const result = serializePrompt(prompt)

    expect(result).toContain('name: Test Prompt')
    expect(result).toContain('description: A description')
    expect(result).toContain('Hello {{name}}')
  })

  it('omits empty description', () => {
    const prompt = {
      id: 'test-id-2',
      fileName: 'test.md',
      path: '/path/test.md',
      name: 'Test',
      description: '',
      tags: [],
      variables: [],
      notes: [],
      template: 'Content',
      rawContent: '',
      isValid: true,
      errors: [],
    }

    const result = serializePrompt(prompt)

    expect(result).not.toContain('description:')
  })

  it('omits empty tags array', () => {
    const prompt = {
      id: 'test-id-3',
      fileName: 'test.md',
      path: '/path/test.md',
      name: 'Test',
      description: '',
      tags: [],
      variables: [],
      notes: [],
      template: 'Content',
      rawContent: '',
      isValid: true,
      errors: [],
    }

    const result = serializePrompt(prompt)

    expect(result).not.toContain('tags:')
  })
})
