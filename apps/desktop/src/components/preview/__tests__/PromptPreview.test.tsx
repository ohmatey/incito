import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { PromptFile, Variable } from '@/types/prompt'
import { PromptPreview, getDisplayValue, tokenizeTemplate } from '../PromptPreview'

// react-i18next isn't initialized in the unit test env — return the key verbatim.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const variables: Variable[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'tone', label: 'Tone', type: 'text', default: 'friendly' },
  { key: 'city', label: 'City', type: 'text' },
]

function makePrompt(template: string, overrides: Partial<PromptFile> = {}): PromptFile {
  return {
    id: 'p1',
    fileName: 'p1.md',
    path: '/p1.md',
    name: 'Test',
    description: '',
    tags: [],
    variables,
    notes: [],
    template,
    rawContent: '',
    isValid: true,
    errors: [],
    ...overrides,
  }
}

describe('tokenizeTemplate', () => {
  it('splits text, variables, and blocks', () => {
    const tokens = tokenizeTemplate('Hi {{name}}{{#if city}} from {{city}}{{/if}}')
    expect(tokens.map(t => t.type)).toEqual([
      'text', 'variable', 'block_start', 'text', 'variable', 'block_end',
    ])
  })
})

describe('getDisplayValue', () => {
  it('prefers a set value', () => {
    expect(getDisplayValue('name', { name: 'Alice' }, variables)).toEqual({
      value: 'Alice', hasValue: true, hasDefault: false,
    })
  })

  it('falls back to default', () => {
    expect(getDisplayValue('tone', {}, variables)).toEqual({
      value: 'friendly', hasValue: false, hasDefault: true,
    })
  })

  it('keeps the placeholder when no value or default', () => {
    expect(getDisplayValue('city', {}, variables)).toEqual({
      value: '{{city}}', hasValue: false, hasDefault: false,
    })
  })
})

describe('PromptPreview', () => {
  it('renders interpolated values and default fallbacks', () => {
    render(
      <PromptPreview
        prompt={makePrompt('Hello {{name}}, be {{tone}}.')}
        values={{ name: 'Alice' }}
        activeVariableKey={null}
        onActiveVariableChange={() => {}}
      />
    )
    // Set value shows, default fills in
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('friendly')).toBeInTheDocument()
  })

  it('shows the empty-state message for a null prompt', () => {
    render(
      <PromptPreview
        prompt={null}
        values={{}}
        activeVariableKey={null}
        onActiveVariableChange={() => {}}
      />
    )
    expect(screen.getByText('prompts:previewTab.selectPrompt')).toBeInTheDocument()
  })

  it('shows an error message for an invalid prompt', () => {
    render(
      <PromptPreview
        prompt={makePrompt('x', { isValid: false })}
        values={{}}
        activeVariableKey={null}
        onActiveVariableChange={() => {}}
      />
    )
    expect(screen.getByText('prompts:previewTab.hasErrors')).toBeInTheDocument()
  })
})
