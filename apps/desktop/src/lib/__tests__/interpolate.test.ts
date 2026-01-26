import { describe, it, expect } from 'vitest'
import { interpolate, getPreviewValues, getDefaultValues } from '../interpolate'
import type { Variable } from '@/types/prompt'

describe('interpolate', () => {
  const variables: Variable[] = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'age', label: 'Age', type: 'number', default: 25 },
    { key: 'city', label: 'City', type: 'text' },
  ]

  it('replaces variables with values', () => {
    const template = 'Hello {{name}}, you are {{age}} years old!'
    const values = { name: 'Alice', age: 30 }

    const result = interpolate(template, values, variables)

    expect(result).toBe('Hello Alice, you are 30 years old!')
  })

  it('uses default values when no value provided', () => {
    const template = 'Age: {{age}}'
    const values = {}

    const result = interpolate(template, values, variables)

    expect(result).toBe('Age: 25')
  })

  it('keeps placeholder when no value or default', () => {
    const template = 'City: {{city}}'
    const values = {}

    const result = interpolate(template, values, variables)

    expect(result).toBe('City: {{city}}')
  })

  it('handles hyphenated variable names', () => {
    const template = 'Hello {{first-name}}!'
    const values = { 'first-name': 'Bob' }

    const result = interpolate(template, values, [])

    expect(result).toBe('Hello Bob!')
  })

  it('handles underscored variable names', () => {
    const template = 'Email: {{user_email}}'
    const values = { user_email: 'test@example.com' }

    const result = interpolate(template, values, [])

    expect(result).toBe('Email: test@example.com')
  })

  describe('conditional blocks', () => {
    it('includes content when condition is truthy', () => {
      const template = '{{#if show}}Visible{{/if}}'
      const values = { show: true }

      const result = interpolate(template, values, [])

      expect(result).toBe('Visible')
    })

    it('excludes content when condition is falsy', () => {
      const template = '{{#if show}}Hidden{{/if}}'
      const values = { show: false }

      const result = interpolate(template, values, [])

      expect(result).toBe('')
    })

    it('excludes content when condition is empty string', () => {
      const template = '{{#if name}}Hello {{name}}{{/if}}'
      const values = { name: '' }

      const result = interpolate(template, values, [])

      expect(result).toBe('')
    })

    it('includes content when condition is non-empty string', () => {
      const template = '{{#if name}}Hello {{name}}{{/if}}'
      const values = { name: 'Alice' }

      const result = interpolate(template, values, [])

      expect(result).toBe('Hello Alice')
    })

    it('handles multiple conditional blocks', () => {
      const template = '{{#if a}}A{{/if}} {{#if b}}B{{/if}}'
      const values = { a: true, b: false }

      const result = interpolate(template, values, [])

      expect(result).toBe('A ')
    })

    it('handles nested variables in conditional', () => {
      const template = '{{#if show}}Name: {{name}}{{/if}}'
      const values = { show: true, name: 'Alice' }

      const result = interpolate(template, values, [])

      expect(result).toBe('Name: Alice')
    })
  })

  it('handles empty template', () => {
    const result = interpolate('', {}, [])
    expect(result).toBe('')
  })

  it('handles template with no variables', () => {
    const template = 'Just plain text'
    const result = interpolate(template, {}, [])
    expect(result).toBe('Just plain text')
  })
})

describe('getPreviewValues', () => {
  it('returns preview values when available', () => {
    const variables: Variable[] = [
      { key: 'name', label: 'Name', type: 'text', preview: 'John Doe' },
      { key: 'age', label: 'Age', type: 'number', preview: 30 },
    ]

    const result = getPreviewValues(variables)

    expect(result).toEqual({ name: 'John Doe', age: 30 })
  })

  it('falls back to default when no preview', () => {
    const variables: Variable[] = [
      { key: 'name', label: 'Name', type: 'text', default: 'Default Name' },
    ]

    const result = getPreviewValues(variables)

    expect(result).toEqual({ name: 'Default Name' })
  })

  it('prefers preview over default', () => {
    const variables: Variable[] = [
      { key: 'name', label: 'Name', type: 'text', preview: 'Preview', default: 'Default' },
    ]

    const result = getPreviewValues(variables)

    expect(result).toEqual({ name: 'Preview' })
  })

  it('returns empty object when no preview or default', () => {
    const variables: Variable[] = [
      { key: 'name', label: 'Name', type: 'text' },
    ]

    const result = getPreviewValues(variables)

    expect(result).toEqual({})
  })
})

describe('getDefaultValues', () => {
  it('returns default values', () => {
    const variables: Variable[] = [
      { key: 'name', label: 'Name', type: 'text', default: 'John' },
      { key: 'count', label: 'Count', type: 'number', default: 5 },
    ]

    const result = getDefaultValues(variables)

    expect(result).toEqual({ name: 'John', count: 5 })
  })

  it('returns empty object when no defaults', () => {
    const variables: Variable[] = [
      { key: 'name', label: 'Name', type: 'text' },
    ]

    const result = getDefaultValues(variables)

    expect(result).toEqual({})
  })

  it('handles array defaults', () => {
    const variables: Variable[] = [
      { key: 'tags', label: 'Tags', type: 'array', default: ['one', 'two'] },
    ]

    const result = getDefaultValues(variables)

    expect(result).toEqual({ tags: ['one', 'two'] })
  })
})

describe('interpolate array handling', () => {
  it('formats arrays with comma separator by default', () => {
    const variables: Variable[] = [
      { key: 'items', label: 'Items', type: 'array' },
    ]
    const template = 'Items: {{items}}'
    const values = { items: ['apple', 'banana', 'cherry'] }

    const result = interpolate(template, values, variables)

    expect(result).toBe('Items: apple, banana, cherry')
  })

  it('formats arrays with newline separator', () => {
    const variables: Variable[] = [
      { key: 'items', label: 'Items', type: 'array', format: 'newline' },
    ]
    const template = 'Items:\n{{items}}'
    const values = { items: ['apple', 'banana'] }

    const result = interpolate(template, values, variables)

    expect(result).toBe('Items:\napple\nbanana')
  })

  it('formats arrays with numbered format', () => {
    const variables: Variable[] = [
      { key: 'steps', label: 'Steps', type: 'array', format: 'numbered' },
    ]
    const template = 'Steps:\n{{steps}}'
    const values = { steps: ['First', 'Second', 'Third'] }

    const result = interpolate(template, values, variables)

    expect(result).toBe('Steps:\n1. First\n2. Second\n3. Third')
  })

  it('formats arrays with bullet format', () => {
    const variables: Variable[] = [
      { key: 'list', label: 'List', type: 'array', format: 'bullet' },
    ]
    const template = 'List:\n{{list}}'
    const values = { list: ['Item A', 'Item B'] }

    const result = interpolate(template, values, variables)

    expect(result).toBe('List:\n- Item A\n- Item B')
  })

  it('handles empty arrays', () => {
    const variables: Variable[] = [
      { key: 'items', label: 'Items', type: 'array' },
    ]
    const template = 'Items: {{items}}'
    const values = { items: [] }

    const result = interpolate(template, values, variables)

    expect(result).toBe('Items: ')
  })
})

describe('interpolate error handling', () => {
  it('returns original template on invalid Handlebars syntax', () => {
    const template = '{{#if unclosed}'
    const values = {}

    const result = interpolate(template, values, [])

    expect(result).toBe('{{#if unclosed}')
  })

  it('sanitizes values that contain Handlebars syntax', () => {
    const variables: Variable[] = [
      { key: 'input', label: 'Input', type: 'text' },
    ]
    const template = 'User said: {{input}}'
    const values = { input: 'Hello {{name}}' }

    const result = interpolate(template, values, variables)

    // The {{ should be escaped to prevent injection
    expect(result).toBe('User said: Hello \\{{name\\}}')
  })
})
