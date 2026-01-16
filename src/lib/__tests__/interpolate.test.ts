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

  it('handles boolean defaults', () => {
    const variables: Variable[] = [
      { key: 'enabled', label: 'Enabled', type: 'checkbox', default: true },
    ]

    const result = getDefaultValues(variables)

    expect(result).toEqual({ enabled: true })
  })
})
