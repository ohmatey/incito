# Testing Patterns - Incito Project

**Last Updated:** 2026-01-30

This document provides reusable testing patterns specific to the Incito project. Use these as templates for writing new tests.

---

## Mocking Tauri File System APIs

### Pattern: Mock readTextFile and writeTextFile

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readTextFile, writeTextFile, readDir, remove } from '@tauri-apps/plugin-fs'
import { loadPrompts, savePrompt } from '@/lib/prompts'

// Mock the Tauri fs plugin
vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  readDir: vi.fn(),
  remove: vi.fn(),
}))

describe('prompts.ts file operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load prompts from directory', async () => {
    // Arrange: Mock file system responses
    vi.mocked(readDir).mockResolvedValue([
      { name: 'prompt1.md', isDirectory: false, isFile: true },
      { name: 'prompt2.md', isDirectory: false, isFile: true },
    ])

    vi.mocked(readTextFile)
      .mockResolvedValueOnce('---\nname: Prompt 1\n---\nTemplate 1')
      .mockResolvedValueOnce('---\nname: Prompt 2\n---\nTemplate 2')

    // Act
    const prompts = await loadPrompts('/test/folder')

    // Assert
    expect(prompts).toHaveLength(2)
    expect(prompts[0].name).toBe('Prompt 1')
    expect(readDir).toHaveBeenCalledWith('/test/folder')
    expect(readTextFile).toHaveBeenCalledTimes(2)
  })

  it('should handle file read errors', async () => {
    // Arrange: Mock read error
    vi.mocked(readTextFile).mockRejectedValue(new Error('EACCES: permission denied'))

    // Act & Assert
    await expect(readTextFile('/test/file.md')).rejects.toThrow('permission denied')
  })
})
```

---

## Mocking SQLite Database Operations

### Pattern: Mock Database for Unit Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from '@tauri-apps/plugin-sql'
import { createTag, getTagById } from '@/lib/store'

// Mock the database plugin
vi.mock('@tauri-apps/plugin-sql', () => {
  const mockExecute = vi.fn()
  const mockSelect = vi.fn()

  return {
    default: {
      load: vi.fn(() => Promise.resolve({
        execute: mockExecute,
        select: mockSelect,
      })),
    },
  }
})

describe('store.ts database operations', () => {
  let mockDb: any

  beforeEach(async () => {
    vi.clearAllMocks()
    mockDb = await Database.load('sqlite:test.db')
  })

  it('should create tag in database', async () => {
    // Arrange
    vi.mocked(mockDb.execute).mockResolvedValue(undefined)

    // Act
    await createTag('test-tag', '#ff0000')

    // Assert
    expect(mockDb.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tags'),
      expect.arrayContaining(['test-tag'])
    )
  })

  it('should handle unique constraint violation', async () => {
    // Arrange: Simulate constraint error
    vi.mocked(mockDb.execute).mockRejectedValue({
      message: 'UNIQUE constraint failed: tags.name',
    })

    // Act & Assert
    await expect(createTag('duplicate', '#ff0000')).rejects.toThrow('UNIQUE constraint')
  })
})
```

### Pattern: Use In-Memory Database for Integration Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import Database from '@tauri-apps/plugin-sql'

describe('store.ts integration tests', () => {
  let db: Database

  beforeEach(async () => {
    // Use in-memory database for tests
    db = await Database.load('sqlite::memory:')

    // Create schema
    await db.execute(`
      CREATE TABLE tags (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        color TEXT DEFAULT '#6b7280'
      )
    `)
  })

  it('should create and retrieve tag', async () => {
    // Create tag
    await db.execute(
      'INSERT INTO tags (id, name, color) VALUES ($1, $2, $3)',
      ['test-id', 'test-tag', '#ff0000']
    )

    // Retrieve tag
    const result = await db.select<{ name: string; color: string }[]>(
      'SELECT name, color FROM tags WHERE id = $1',
      ['test-id']
    )

    expect(result[0].name).toBe('test-tag')
    expect(result[0].color).toBe('#ff0000')
  })
})
```

---

## Testing React Hooks

### Pattern: Test Hook with State Changes

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePromptManager } from '@/lib/hooks/usePromptManager'

// Mock dependencies
vi.mock('@/lib/prompts', () => ({
  loadPrompts: vi.fn(),
  createPrompt: vi.fn(),
  savePrompt: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('usePromptManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load prompts and update state', async () => {
    // Arrange
    const mockPrompts = [
      { id: '1', name: 'Prompt 1', /* ... */ },
      { id: '2', name: 'Prompt 2', /* ... */ },
    ]
    vi.mocked(loadPrompts).mockResolvedValue(mockPrompts)

    // Act
    const { result } = renderHook(() => usePromptManager())

    await act(async () => {
      await result.current.loadPromptsFromFolder('/test/folder')
    })

    // Assert
    expect(result.current.prompts).toEqual(mockPrompts)
    expect(loadPrompts).toHaveBeenCalledWith('/test/folder')
  })

  it('should handle create prompt error', async () => {
    // Arrange
    vi.mocked(createPrompt).mockRejectedValue(new Error('Disk full'))

    // Act
    const { result } = renderHook(() => usePromptManager())

    let returnValue: any
    await act(async () => {
      returnValue = await result.current.createNewPrompt('/test/folder')
    })

    // Assert
    expect(returnValue).toBeNull()
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('failed'))
  })
})
```

---

## Testing Components with React Testing Library

### Pattern: Test User Interaction

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VariableInput } from '@/components/VariableInput'
import type { Variable } from '@/types/prompt'

describe('VariableInput', () => {
  const mockVariable: Variable = {
    key: 'name',
    label: 'Name',
    type: 'text',
    required: true,
  }

  it('should render text input with label', () => {
    // Arrange & Act
    render(<VariableInput variable={mockVariable} value="" onChange={vi.fn()} />)

    // Assert
    const input = screen.getByLabelText('Name')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'text')
  })

  it('should call onChange when user types', async () => {
    // Arrange
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(<VariableInput variable={mockVariable} value="" onChange={handleChange} />)

    // Act
    const input = screen.getByLabelText('Name')
    await user.type(input, 'John Doe')

    // Assert
    expect(handleChange).toHaveBeenCalledTimes(8) // One call per character
    expect(handleChange).toHaveBeenLastCalledWith('John Doe')
  })

  it('should show required indicator', () => {
    // Arrange & Act
    render(<VariableInput variable={mockVariable} value="" onChange={vi.fn()} />)

    // Assert
    const input = screen.getByLabelText('Name')
    expect(input).toHaveAttribute('required')
    expect(screen.getByText(/required/i)).toBeInTheDocument()
  })

  it('should render select dropdown for select type', () => {
    // Arrange
    const selectVariable: Variable = {
      key: 'country',
      label: 'Country',
      type: 'select',
      options: [
        { label: 'USA', value: 'us' },
        { label: 'UK', value: 'uk' },
      ],
    }

    // Act
    render(<VariableInput variable={selectVariable} value="" onChange={vi.fn()} />)

    // Assert
    const select = screen.getByRole('combobox', { name: /country/i })
    expect(select).toBeInTheDocument()
  })
})
```

### Pattern: Test Accessibility

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { VariableInput } from '@/components/VariableInput'

expect.extend(toHaveNoViolations)

describe('VariableInput accessibility', () => {
  it('should have no accessibility violations', async () => {
    // Arrange & Act
    const { container } = render(
      <VariableInput
        variable={{ key: 'name', label: 'Name', type: 'text' }}
        value=""
        onChange={vi.fn()}
      />
    )

    // Assert
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper ARIA attributes', () => {
    // Arrange & Act
    render(
      <VariableInput
        variable={{ key: 'name', label: 'Name', type: 'text', required: true }}
        value=""
        onChange={vi.fn()}
      />
    )

    // Assert
    const input = screen.getByLabelText('Name')
    expect(input).toHaveAttribute('aria-required', 'true')
    expect(input).toHaveAccessibleName('Name')
  })

  it('should support keyboard navigation', async () => {
    // Arrange
    const user = userEvent.setup()
    render(
      <form>
        <VariableInput
          variable={{ key: 'name', label: 'Name', type: 'text' }}
          value=""
          onChange={vi.fn()}
        />
        <VariableInput
          variable={{ key: 'email', label: 'Email', type: 'text' }}
          value=""
          onChange={vi.fn()}
        />
      </form>
    )

    // Act: Tab to next field
    await user.tab()
    expect(screen.getByLabelText('Name')).toHaveFocus()

    await user.tab()
    expect(screen.getByLabelText('Email')).toHaveFocus()
  })
})
```

---

## Testing Error Scenarios

### Pattern: Test Error Handling with Result Type

```typescript
import { describe, it, expect, vi } from 'vitest'
import type { Result } from '@/lib/store'

describe('savePrompt error handling', () => {
  it('should return error result for disk full', async () => {
    // Arrange
    vi.mocked(writeTextFile).mockRejectedValue(new Error('ENOSPC: no space left on device'))

    // Act
    const result: Result<void> = await savePrompt(mockPrompt)

    // Assert
    expect(result).toEqual({
      ok: false,
      error: 'Disk full. Free up space and try again.',
    })
  })

  it('should return error result for permission denied', async () => {
    // Arrange
    vi.mocked(writeTextFile).mockRejectedValue(new Error('EACCES: permission denied'))

    // Act
    const result: Result<void> = await savePrompt(mockPrompt)

    // Assert
    expect(result).toEqual({
      ok: false,
      error: 'Permission denied. Check file permissions.',
    })
  })

  it('should return success result for successful save', async () => {
    // Arrange
    vi.mocked(writeTextFile).mockResolvedValue(undefined)

    // Act
    const result: Result<void> = await savePrompt(mockPrompt)

    // Assert
    expect(result).toEqual({ ok: true, data: undefined })
  })
})
```

### Pattern: Test Error Boundaries

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Component that throws an error
function ThrowError() {
  throw new Error('Test error')
}

describe('ErrorBoundary', () => {
  it('should catch and display error', () => {
    // Arrange: Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Act
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    // Assert
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByText(/test error/i)).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('should allow recovery with reset button', () => {
    // Arrange
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let shouldThrow = true

    function MaybeThrowError() {
      if (shouldThrow) throw new Error('Test error')
      return <div>Success</div>
    }

    const { rerender } = render(
      <ErrorBoundary>
        <MaybeThrowError />
      </ErrorBoundary>
    )

    // Error caught
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()

    // Act: Fix the error and reset
    shouldThrow = false
    const resetButton = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(resetButton)

    // Assert: Component recovered
    expect(screen.getByText('Success')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
```

---

## Testing Async Operations

### Pattern: Test with waitFor

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PromptList } from '@/components/PromptList'

describe('PromptList async loading', () => {
  it('should show loading state then prompts', async () => {
    // Arrange
    const mockLoadPrompts = vi.fn().mockResolvedValue([
      { id: '1', name: 'Prompt 1' },
      { id: '2', name: 'Prompt 2' },
    ])

    // Act
    render(<PromptList loadPrompts={mockLoadPrompts} />)

    // Assert: Loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    // Assert: Prompts loaded
    await waitFor(() => {
      expect(screen.getByText('Prompt 1')).toBeInTheDocument()
    })
    expect(screen.getByText('Prompt 2')).toBeInTheDocument()
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })
})
```

---

## Security Testing Patterns

### Pattern: Test Path Traversal Prevention

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createPrompt } from '@/lib/prompts'

describe('createPrompt security', () => {
  it('should reject path traversal attempts', async () => {
    // Arrange: Malicious filename
    const folderPath = '/safe/folder'
    const maliciousContent = {
      name: '../../../etc/passwd',
    }

    // Act & Assert
    await expect(
      createPrompt(folderPath, [], [], maliciousContent)
    ).rejects.toThrow('Path traversal detected')
  })

  it('should reject absolute paths', async () => {
    // Arrange: Absolute path
    const folderPath = '/safe/folder'
    const maliciousContent = {
      name: '/etc/passwd',
    }

    // Act & Assert
    await expect(
      createPrompt(folderPath, [], [], maliciousContent)
    ).rejects.toThrow('Path traversal detected')
  })

  it('should allow safe relative paths', async () => {
    // Arrange: Safe filename
    const folderPath = '/safe/folder'
    const safeContent = {
      name: 'my-prompt',
    }

    vi.mocked(writeTextFile).mockResolvedValue(undefined)
    vi.mocked(readTextFile).mockResolvedValue('---\nname: my-prompt\n---')

    // Act
    const result = await createPrompt(folderPath, [], [], safeContent)

    // Assert
    expect(result.fileName).toBe('my-prompt.md')
    expect(result.path).toContain('/safe/folder/')
  })
})
```

### Pattern: Test SQL Injection Prevention

```typescript
import { describe, it, expect } from 'vitest'
import Database from '@tauri-apps/plugin-sql'
import { createTag } from '@/lib/store'

describe('createTag SQL injection prevention', () => {
  it('should handle malicious tag names safely', async () => {
    // Arrange: SQL injection attempt
    const maliciousName = "'; DROP TABLE tags; --"
    const db = await Database.load('sqlite::memory:')

    await db.execute(`
      CREATE TABLE tags (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        color TEXT
      )
    `)

    // Act: Should not drop table
    await createTag(maliciousName, '#ff0000')

    // Assert: Table still exists, data inserted safely
    const tags = await db.select('SELECT * FROM tags')
    expect(tags).toHaveLength(1)
    expect(tags[0].name).toBe("'; DROP TABLE tags; --")
  })
})
```

---

## Performance Testing Patterns

### Pattern: Test with Large Datasets

```typescript
import { describe, it, expect } from 'vitest'
import { loadPrompts } from '@/lib/prompts'

describe('loadPrompts performance', () => {
  it('should load 1000 prompts in under 2 seconds', async () => {
    // Arrange: Mock 1000 files
    const files = Array.from({ length: 1000 }, (_, i) => ({
      name: `prompt-${i}.md`,
      isDirectory: false,
      isFile: true,
    }))

    vi.mocked(readDir).mockResolvedValue(files)
    vi.mocked(readTextFile).mockImplementation((path) =>
      Promise.resolve(`---\nname: ${path}\n---\nTemplate`)
    )

    // Act
    const startTime = performance.now()
    const prompts = await loadPrompts('/test/folder')
    const duration = performance.now() - startTime

    // Assert
    expect(prompts).toHaveLength(1000)
    expect(duration).toBeLessThan(2000) // 2 seconds
  })
})
```

### Pattern: Benchmark with Vitest

```typescript
import { describe, bench } from 'vitest'
import { interpolate } from '@/lib/interpolate'

describe('interpolate performance', () => {
  const template = 'Hello {{name}}, you are {{age}} years old'
  const values = { name: 'John', age: 30 }
  const variables = [
    { key: 'name', label: 'Name', type: 'text' as const },
    { key: 'age', label: 'Age', type: 'number' as const },
  ]

  bench('interpolate simple template', () => {
    interpolate(template, values, variables)
  })

  bench('interpolate large template', () => {
    const largeTemplate = template.repeat(100)
    interpolate(largeTemplate, values, variables)
  })
})
```

---

## Test Data Factories

### Pattern: Reusable Test Data Generators

```typescript
// test/factories.ts
import type { PromptFile, Variable } from '@/types/prompt'

export function createMockPrompt(overrides?: Partial<PromptFile>): PromptFile {
  return {
    id: crypto.randomUUID(),
    fileName: 'test.md',
    path: '/test/test.md',
    name: 'Test Prompt',
    description: 'Test description',
    tags: [],
    variables: [],
    notes: [],
    template: 'Test template',
    rawContent: '---\nname: Test Prompt\n---\nTest template',
    isValid: true,
    errors: [],
    ...overrides,
  }
}

export function createMockVariable(overrides?: Partial<Variable>): Variable {
  return {
    key: 'test_var',
    label: 'Test Variable',
    type: 'text',
    ...overrides,
  }
}

// Usage in tests
import { createMockPrompt, createMockVariable } from '@/test/factories'

const prompt = createMockPrompt({ name: 'Custom Name', tags: ['urgent'] })
const variable = createMockVariable({ type: 'select', options: ['A', 'B'] })
```

---

## Snapshot Testing

### Pattern: Component Snapshot

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { VariableInput } from '@/components/VariableInput'

describe('VariableInput snapshots', () => {
  it('should match snapshot for text input', () => {
    // Arrange & Act
    const { container } = render(
      <VariableInput
        variable={{ key: 'name', label: 'Name', type: 'text' }}
        value=""
        onChange={vi.fn()}
      />
    )

    // Assert
    expect(container).toMatchSnapshot()
  })

  it('should match snapshot for select input', () => {
    // Arrange & Act
    const { container } = render(
      <VariableInput
        variable={{
          key: 'country',
          label: 'Country',
          type: 'select',
          options: [
            { label: 'USA', value: 'us' },
            { label: 'UK', value: 'uk' },
          ],
        }}
        value=""
        onChange={vi.fn()}
      />
    )

    // Assert
    expect(container).toMatchSnapshot()
  })
})
```

**Note:** Use snapshots sparingly. Prefer explicit assertions for better test clarity.

---

## Common Pitfalls to Avoid

### 1. Not Cleaning Up Mocks

❌ **Bad:**
```typescript
it('test 1', () => {
  vi.mocked(fn).mockResolvedValue('value1')
})

it('test 2', () => {
  // fn still returns 'value1' from previous test!
})
```

✅ **Good:**
```typescript
beforeEach(() => {
  vi.clearAllMocks()
})

it('test 1', () => {
  vi.mocked(fn).mockResolvedValue('value1')
})

it('test 2', () => {
  vi.mocked(fn).mockResolvedValue('value2')
  // fn correctly returns 'value2'
})
```

### 2. Testing Implementation Details

❌ **Bad:**
```typescript
// Testing internal state
expect(component.state.count).toBe(1)
```

✅ **Good:**
```typescript
// Testing user-facing behavior
expect(screen.getByText('Count: 1')).toBeInTheDocument()
```

### 3. Flaky Tests with Timers

❌ **Bad:**
```typescript
it('should debounce', async () => {
  fireEvent.change(input, { target: { value: 'test' } })
  await new Promise(resolve => setTimeout(resolve, 600)) // Flaky!
  expect(fn).toHaveBeenCalled()
})
```

✅ **Good:**
```typescript
it('should debounce', async () => {
  vi.useFakeTimers()
  fireEvent.change(input, { target: { value: 'test' } })
  vi.advanceTimersByTime(600)
  expect(fn).toHaveBeenCalled()
  vi.useRealTimers()
})
```

### 4. Not Handling Promises

❌ **Bad:**
```typescript
it('should load data', () => {
  // Missing await - test finishes before promise resolves!
  loadData()
  expect(data).toBeDefined()
})
```

✅ **Good:**
```typescript
it('should load data', async () => {
  await loadData()
  expect(data).toBeDefined()
})
```

---

## Summary

These patterns cover the most common testing scenarios in the Incito project:

1. **File System Testing:** Mock Tauri fs APIs
2. **Database Testing:** Mock or use in-memory SQLite
3. **Hook Testing:** Use renderHook from React Testing Library
4. **Component Testing:** Test user interactions and accessibility
5. **Error Testing:** Test all error paths with specific scenarios
6. **Security Testing:** Test path traversal and SQL injection
7. **Performance Testing:** Benchmark critical operations
8. **Test Data:** Use factories for reusable test data

Always prefer explicit, readable tests over clever or terse tests. Future developers (including yourself) will thank you!
