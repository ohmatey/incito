# Test Strategy - Incito Project

**Last Updated:** 2026-01-30
**Status:** Initial Strategy
**Current Coverage:** < 5%
**Target Coverage:** 70% within 6 months

---

## TLDR

- **Current State:** Only 2 test files (parser, interpolate) with 48 passing tests
- **Gap:** 173+ TypeScript files untested, critical business logic at risk
- **Priority:** Security tests, file system tests, database tests, then component tests
- **Goal:** 50% coverage in 2 months, 70% in 6 months
- **Blockers:** Build currently failing (React 19 type errors), must fix immediately

---

## Testing Philosophy & Goals

### Core Principles

1. **Test Business Logic First, UI Second**
   - File operations (prompts.ts) are critical - data loss is unacceptable
   - Database operations (store.ts) protect data integrity
   - UI bugs are annoying, data bugs are catastrophic

2. **Test at the Right Level**
   - Unit tests: Pure functions, utilities, parsers
   - Integration tests: File system, database, API calls
   - Component tests: User interactions, form behavior
   - E2E tests: Critical user journeys only

3. **Test Error Paths, Not Just Happy Paths**
   - Disk full, permission denied, network errors
   - Malformed input, edge cases, boundary conditions
   - Concurrent access, race conditions

4. **Security is Non-Negotiable**
   - Path traversal attacks tested and prevented
   - SQL injection attempts blocked
   - API keys secured, never exposed

5. **Fast Feedback Loops**
   - Unit tests run in < 1 second
   - Integration tests run in < 10 seconds
   - E2E tests run in < 2 minutes
   - CI runs all tests on every PR

### Quality Objectives

**Phase 1 (Week 1-4): Foundation**
- Fix build failures
- Add CI/CD test automation
- Security tests for path traversal and SQL injection
- Integration tests for prompts.ts and store.ts
- **Target:** 25% coverage, all critical paths tested

**Phase 2 (Week 5-8): Core Business Logic**
- React hooks tests (usePromptManager, useTagManager, etc.)
- AI integration tests (mastra-client, claude-code-client)
- Utility function tests (language-detect, model-pricing, etc.)
- **Target:** 50% coverage

**Phase 3 (Month 3-4): User Experience**
- Component tests for critical UI (VariableInput, PromptListItem)
- E2E tests for critical user journeys
- Accessibility tests
- **Target:** 60% coverage

**Phase 4 (Month 5-6): Comprehensive**
- Remaining component tests
- Performance tests
- Visual regression tests for landing page
- **Target:** 70% coverage

### Success Criteria

**Coverage Targets:**
- Unit tests: 70%+ coverage
- Integration tests: 60%+ coverage
- E2E tests: 100% of critical paths
- Overall: 70%+ code coverage

**Quality Gates:**
- All tests pass before merge (enforced by CI)
- No decrease in coverage on PRs (enforced by codecov)
- Security tests pass (path traversal, SQL injection)
- E2E tests pass for critical user journeys
- Build succeeds on all platforms (macOS, Windows, Linux)

**Non-Functional Requirements:**
- Unit tests run in < 1s per file
- Full test suite runs in < 2 minutes
- E2E test suite runs in < 5 minutes
- Flaky tests < 1% failure rate

---

## Current Test Coverage Overview

### Tested (48 tests, 2 files)

**`parser.ts` (21 tests)** ✅
- Frontmatter parsing with gray-matter
- Variable validation (types, keys, formats)
- Tag validation (names, lengths)
- Error handling for malformed YAML
- Variable extraction from templates
- Variable syncing with template changes

**`interpolate.ts` (27 tests)** ✅
- Variable substitution (simple, hyphenated, underscored)
- Conditional blocks ({{#if}}, truthy/falsy)
- Array formatting (comma, newline, numbered, bullet)
- Default values and preview values
- Handlebars error handling
- Value sanitization (XSS prevention)

### Untested Critical Paths (173+ files)

**File Operations (prompts.ts)** ❌ CRITICAL
- loadPrompts, savePrompt, createPrompt, deletePrompt
- Path traversal security
- Concurrent access handling
- Error scenarios (disk full, permission denied)

**Database Operations (store.ts)** ❌ CRITICAL
- All CRUD operations for tags, settings, prompts, runs
- Transaction handling and rollback
- Constraint violations
- Schema migrations

**React Hooks (6 files)** ❌ HIGH
- usePromptManager, useTagManager, useAgentManager
- useFormHistory, usePromptEditState
- State management, error handling, optimistic updates

**AI Integration (3 files)** ❌ MEDIUM
- mastra-client, claude-code-client, grader-executor
- API error handling, response parsing, fallback behavior

**UI Components (90+ files)** ❌ LOW
- VariableInput, PromptListItem, ErrorBoundary, etc.
- User interactions, form validation, accessibility

### Landing Page (0% coverage)

**`apps/landing/` (Next.js 14)** ❌ LOW
- Static marketing site, lower risk
- E2E tests recommended for critical paths (nav, CTAs)

---

## Testing Standards & Conventions

### File Organization

```
apps/desktop/src/
├── lib/
│   ├── prompts.ts
│   ├── __tests__/
│   │   ├── prompts.test.ts          # Integration tests
│   │   ├── parser.test.ts           # Unit tests
│   │   └── security.test.ts         # Security tests
│   ├── hooks/
│   │   ├── usePromptManager.ts
│   │   └── __tests__/
│   │       └── usePromptManager.test.ts
├── components/
│   ├── VariableInput.tsx
│   └── __tests__/
│       └── VariableInput.test.tsx
└── e2e/
    ├── create-prompt.spec.ts
    └── edit-and-copy.spec.ts
```

**Naming Conventions:**
- Test files: `{module}.test.ts` or `{module}.spec.ts`
- E2E tests: `{feature}.spec.ts`
- Test suites: `describe('{Module/Feature}', () => {})`
- Test cases: `it('should {expected behavior}', () => {})`

### Test Structure (AAA Pattern)

```typescript
describe('savePrompt', () => {
  it('should save prompt and create version when content changes', async () => {
    // Arrange: Set up test data and mocks
    const prompt: PromptFile = {
      id: 'test-id',
      path: '/path/to/test.md',
      name: 'Test Prompt',
      // ... other fields
    }
    const mockReadTextFile = vi.fn().mockResolvedValue('old content')
    const mockWriteTextFile = vi.fn().mockResolvedValue(undefined)

    // Act: Execute the function under test
    await savePrompt(prompt)

    // Assert: Verify expected behavior
    expect(mockWriteTextFile).toHaveBeenCalledWith(
      '/path/to/test.md',
      expect.stringContaining('Test Prompt')
    )
    expect(mockCreateVersion).toHaveBeenCalled()
  })
})
```

### Mocking Strategy

**Tauri APIs (File System, Dialog, Clipboard):**
```typescript
// Mock Tauri plugins
vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  readDir: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}))
```

**Database (SQLite):**
```typescript
// Mock database for unit tests
vi.mock('@tauri-apps/plugin-sql', () => ({
  Database: {
    load: vi.fn(() => ({
      execute: vi.fn(),
      select: vi.fn(),
    })),
  },
}))

// Use in-memory SQLite for integration tests
import Database from '@tauri-apps/plugin-sql'
const db = await Database.load('sqlite::memory:')
```

**AI APIs (Mastra, Claude Code):**
```typescript
// Mock AI responses
vi.mock('@/lib/mastra-client', () => ({
  generatePrompt: vi.fn().mockResolvedValue({
    name: 'Generated Prompt',
    description: 'AI-generated description',
    template: 'Template content',
    variables: [],
  }),
}))
```

### Data Management

**Test Fixtures:**
```typescript
// Create reusable test data
export const mockPromptFile: PromptFile = {
  id: 'test-id-1',
  fileName: 'test.md',
  path: '/test/test.md',
  name: 'Test Prompt',
  description: 'Test description',
  tags: ['tag1'],
  variables: [
    { key: 'name', label: 'Name', type: 'text' },
  ],
  notes: [],
  template: 'Hello {{name}}',
  rawContent: '---\nname: Test Prompt\n---\nHello {{name}}',
  isValid: true,
  errors: [],
}
```

**Test Data Factories:**
```typescript
// Generate test data programmatically
function createMockPrompt(overrides?: Partial<PromptFile>): PromptFile {
  return {
    id: crypto.randomUUID(),
    fileName: 'test.md',
    // ... defaults
    ...overrides,
  }
}

// Usage
const prompt1 = createMockPrompt({ name: 'Prompt 1' })
const prompt2 = createMockPrompt({ name: 'Prompt 2', tags: ['urgent'] })
```

**Cleanup:**
```typescript
// Clean up after tests
afterEach(() => {
  vi.clearAllMocks()
})

afterAll(() => {
  vi.restoreAllMocks()
})
```

### Error Testing

**Test both success and failure paths:**
```typescript
describe('savePrompt error handling', () => {
  it('should handle disk full error gracefully', async () => {
    mockWriteTextFile.mockRejectedValue(new Error('ENOSPC: no space left'))

    const result = await savePrompt(prompt)

    expect(result).toEqual({
      ok: false,
      error: 'Disk full. Free up space and try again.',
    })
  })

  it('should handle permission denied error', async () => {
    mockWriteTextFile.mockRejectedValue(new Error('EACCES: permission denied'))

    const result = await savePrompt(prompt)

    expect(result).toEqual({
      ok: false,
      error: 'Permission denied. Check file permissions.',
    })
  })
})
```

### Accessibility Testing

**For UI components:**
```typescript
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

describe('VariableInput accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<VariableInput variable={mockVariable} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper ARIA labels', () => {
    render(<VariableInput variable={mockVariable} />)
    const input = screen.getByLabelText('Name')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-required', 'true')
  })
})
```

---

## Test Categories & Ownership

### Unit Tests (Target: 70% coverage)

**Owner:** qa-engineer (lead), tech-lead (contributor)

**Scope:** Pure functions, utilities, parsers

**Files to Test:**
- ✅ `lib/parser.ts` (21 tests complete)
- ✅ `lib/interpolate.ts` (27 tests complete)
- ❌ `lib/language-detect.ts` (needs tests)
- ❌ `lib/model-pricing.ts` (needs tests)
- ❌ `lib/launchers.ts` (needs tests)
- ❌ `lib/agent-parser.ts` (needs tests)
- ❌ `lib/utils.ts` (needs tests)
- ❌ `lib/constants.ts` (validation functions need tests)

**Priority:** Medium (utilities are well-contained, easier to test)

**Timeline:** Week 3-4

### Integration Tests (Target: 60% coverage)

**Owner:** qa-engineer

**Scope:** File system, database, API interactions

**Files to Test:**
- ❌ `lib/prompts.ts` (CRITICAL - needs 15+ tests)
- ❌ `lib/store.ts` (CRITICAL - needs 30+ tests)
- ❌ `lib/agents.ts` (needs tests)
- ❌ `lib/resources.ts` (needs tests)
- ❌ `lib/run-history.ts` (needs tests)
- ❌ `lib/mastra-client.ts` (needs tests with mocked API)
- ❌ `lib/claude-code-client.ts` (needs tests with mocked API)
- ❌ `lib/grader-executor.ts` (needs tests)

**Priority:** CRITICAL (file and database operations are highest risk)

**Timeline:** Week 1-2 (prompts.ts, store.ts), Week 5-6 (others)

### Hook Tests (Target: 70% coverage)

**Owner:** qa-engineer

**Scope:** React hooks with state management

**Files to Test:**
- ❌ `lib/hooks/usePromptManager.ts` (HIGH priority - orchestrates all prompts)
- ❌ `lib/hooks/useTagManager.ts` (MEDIUM priority)
- ❌ `lib/hooks/useAgentManager.ts` (MEDIUM priority)
- ❌ `lib/hooks/useFormHistory.ts` (LOW priority - undo/redo)
- ❌ `lib/hooks/usePromptEditState.ts` (MEDIUM priority - debounce logic)

**Testing Approach:**
- Use `@testing-library/react` renderHook utility
- Mock Tauri APIs
- Test state transitions, error handling, optimistic updates

**Priority:** HIGH (hooks orchestrate business logic)

**Timeline:** Week 3-4

### Component Tests (Target: 50% coverage)

**Owner:** qa-engineer

**Scope:** UI components with user interactions

**Priority Components (20 out of 90+):**
1. ❌ `VariableInput.tsx` (CRITICAL - complex form generation)
2. ❌ `PromptListItem.tsx` (HIGH - context menu, keyboard shortcuts)
3. ❌ `ErrorBoundary.tsx` (HIGH - error recovery)
4. ❌ `RightPanel.tsx` (MEDIUM - state management)
5. ❌ `PromptList.tsx` (MEDIUM - filtering, sorting)
6. ❌ `TagSelector.tsx` (MEDIUM - multi-select)
7. ❌ `VariableConfig.tsx` (MEDIUM - variable editor)
8. ❌ `ImageVariableInput.tsx` (MEDIUM - file upload)
9. ❌ `ChatInput.tsx` (LOW - agent chat input)
10. ❌ `SettingsPage.tsx` (LOW - settings UI)

**Testing Approach:**
- Use React Testing Library (not Enzyme)
- Test user interactions (click, type, keyboard)
- Test accessibility (ARIA labels, keyboard navigation)
- Test error states and edge cases

**Priority:** MEDIUM (UI bugs less critical than data bugs)

**Timeline:** Week 6-10

### E2E Tests (Target: 100% of critical paths)

**Owner:** qa-engineer

**Scope:** Critical user journeys, end-to-end

**Critical Paths to Test:**
1. ❌ Create new prompt → Edit template → Add variables → Copy result
2. ❌ Duplicate prompt → Edit name → Save → Verify file created
3. ❌ Open prompt → Add tag → Filter by tag → Verify shown
4. ❌ Create variant → Edit → Compare with parent → Save
5. ❌ Run prompt with AI → View result → Save to history
6. ❌ Import prompt from AI generation → Edit → Save
7. ❌ Settings → Configure provider → Test connection → Save

**Testing Approach:**
- Use Playwright for E2E tests
- Test on macOS (primary platform), then Windows and Linux
- Use data-testid attributes for reliable selectors
- Test with real file system (temporary test directory)

**Priority:** HIGH (validates entire user workflows)

**Timeline:** Week 7-8

### Security Tests (Target: 100% of attack vectors)

**Owner:** qa-engineer, security-engineer (if available)

**Scope:** Security vulnerabilities and attack prevention

**Attack Vectors to Test:**
1. ❌ Path traversal in createPrompt (e.g., `../../../etc/passwd`)
2. ❌ Path traversal in savePrompt (CRITICAL - not currently checked)
3. ❌ Path traversal in deletePrompt (CRITICAL - not currently checked)
4. ❌ SQL injection in tag names
5. ❌ SQL injection in prompt paths
6. ❌ XSS in markdown preview
7. ❌ API key exposure in database dump
8. ❌ Symlink attacks to escape prompts folder

**Testing Approach:**
- Dedicated security test suite
- Test with malicious inputs
- Verify security checks block attacks
- Verify error messages don't leak sensitive info

**Priority:** CRITICAL (security vulnerabilities unacceptable)

**Timeline:** Week 1 (path traversal, SQL injection), Week 5 (XSS, key exposure)

### Performance Tests (Target: Key scenarios under SLA)

**Owner:** tech-lead (lead), qa-engineer (contributor)

**Scope:** Performance benchmarks and stress tests

**Scenarios to Test:**
1. ❌ Load 1000+ prompts (should load in < 2 seconds)
2. ❌ Search 1000+ prompts (should filter in < 500ms)
3. ❌ Save prompt with 100+ variables (should save in < 1 second)
4. ❌ Interpolate template with 100+ variables (should complete in < 100ms)
5. ❌ Database query with 10,000+ runs (should complete in < 1 second)
6. ❌ Memory usage with long-running session (should not leak)

**Testing Approach:**
- Use Vitest benchmark utilities
- Generate large test datasets
- Profile memory usage
- Set performance SLAs and track trends

**Priority:** LOW (optimize after correctness established)

**Timeline:** Week 10-12

---

## Testing Tools & Frameworks

### Primary Test Framework

**Vitest** (already configured ✅)
- Fast, modern test runner built on Vite
- Compatible with Jest API
- Native ESM support
- TypeScript support out of the box
- Config: `apps/desktop/vitest.config.ts`

**Key Features:**
- `vi.mock()` for mocking modules
- `vi.fn()` for mock functions
- `vi.spyOn()` for spying on methods
- `describe()`, `it()`, `expect()` familiar API

### Component Testing

**React Testing Library** (installed ✅)
- Test components from user perspective
- Encourages accessible selectors
- No implementation details testing

**Usage:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react'

test('user can type in input', () => {
  render(<VariableInput variable={mockVariable} />)
  const input = screen.getByLabelText('Name')
  fireEvent.change(input, { target: { value: 'John' } })
  expect(input).toHaveValue('John')
})
```

### E2E Testing

**Playwright** (to be installed)
- Cross-browser testing (Chromium, Firefox, WebKit)
- Desktop app testing support
- Video recording, screenshots on failure
- Network interception

**Installation:**
```bash
cd apps/desktop
pnpm add -D @playwright/test
npx playwright install
```

**Config:** Create `apps/desktop/playwright.config.ts`

### Mocking

**Vitest Mocks** (built-in)
- Mock Tauri APIs (fs, dialog, clipboard)
- Mock database operations
- Mock AI API calls

**MSW (Mock Service Worker)** (to be installed for API mocking)
- Mock HTTP requests in tests
- Useful for AI API integration tests

### Accessibility Testing

**jest-axe** (to be installed)
- Automated accessibility testing
- Detects ARIA violations, color contrast issues

**Installation:**
```bash
pnpm add -D jest-axe
```

**Usage:**
```typescript
import { axe, toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

const { container } = render(<Component />)
const results = await axe(container)
expect(results).toHaveNoViolations()
```

### Coverage Reporting

**Vitest Coverage** (built-in via c8/istanbul)
- Line, branch, function, statement coverage
- HTML reports for local viewing
- JSON reports for CI integration

**Usage:**
```bash
pnpm test --coverage
```

**Config in vitest.config.ts:**
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },
  },
})
```

### CI/CD Integration

**Codecov or Coveralls** (to be set up)
- Coverage trending over time
- PR comments with coverage diffs
- Enforce coverage thresholds

**GitHub Actions** (to be configured)
- Run tests on every PR
- Block merge if tests fail
- Publish coverage reports

---

## CI/CD Integration

### GitHub Actions Workflows

**Test Workflow** (to be created: `.github/workflows/test.yml`)

```yaml
name: Test

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test-desktop:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install

      - name: Run tests
        run: pnpm --filter @incito/desktop test:run

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/desktop/coverage/lcov.info

  test-landing:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm --filter @incito/landing build
```

**E2E Test Workflow** (to be created later)

```yaml
name: E2E Tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: macos-latest  # Closest to prod environment
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm build:desktop

      - name: Run E2E tests
        run: pnpm --filter @incito/desktop test:e2e

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: apps/desktop/playwright-report/
```

**Quality Gate in Release Workflow**

Update `.github/workflows/release.yml`:
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm test:run  # Block release if tests fail

  release:
    needs: test  # Depends on test passing
    # ... existing release steps
```

### Pre-commit Hooks

**Husky + lint-staged** (to be installed)

**Installation:**
```bash
pnpm add -D husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

**package.json:**
```json
{
  "lint-staged": {
    "apps/desktop/src/**/*.{ts,tsx}": [
      "eslint --fix",
      "vitest related --run --reporter=verbose"
    ]
  }
}
```

**Benefits:**
- Tests run before commit (catch bugs early)
- Only test changed files (fast feedback)
- Enforce code quality standards

### Coverage Enforcement

**Branch Protection Rules:**
- Require passing tests before merge
- Require minimum coverage (50% → 70% over time)
- Require PR reviews

**Codecov Configuration** (`.codecov.yml`):
```yaml
coverage:
  status:
    project:
      default:
        target: 70%
        threshold: 1%  # Allow 1% decrease
    patch:
      default:
        target: 70%  # New code must be 70% covered

comment:
  behavior: default
  require_changes: false
```

---

## QA Roadmap

### Week 1-2: Foundation (CRITICAL)

**Goals:**
- Fix build failure (React 19 type issue)
- Set up CI/CD test automation
- Write security tests
- Write integration tests for prompts.ts

**Deliverables:**
- [ ] Build passing on all platforms
- [ ] `.github/workflows/test.yml` created and passing
- [ ] `lib/__tests__/security.test.ts` created (8+ tests)
- [ ] `lib/__tests__/prompts.test.ts` created (15+ tests)
- [ ] Documentation: Security testing guide

**Estimated Effort:** 40 hours
**Owner:** qa-engineer (lead), tech-lead (build fix)

### Week 3-4: Core Business Logic

**Goals:**
- Test database operations (store.ts)
- Test React hooks (usePromptManager, useTagManager)
- Test utility functions

**Deliverables:**
- [ ] `lib/__tests__/store.test.ts` created (30+ tests)
- [ ] `lib/hooks/__tests__/usePromptManager.test.ts` created (10+ tests)
- [ ] `lib/hooks/__tests__/useTagManager.test.ts` created (8+ tests)
- [ ] `lib/__tests__/language-detect.test.ts` created
- [ ] `lib/__tests__/model-pricing.test.ts` created
- [ ] Coverage: 25%

**Estimated Effort:** 40 hours
**Owner:** qa-engineer

### Week 5-6: AI Integration & Remaining Business Logic

**Goals:**
- Test AI integration (mastra-client, claude-code-client)
- Test remaining hooks and utilities
- Test agent management

**Deliverables:**
- [ ] `lib/__tests__/mastra-client.test.ts` created (10+ tests)
- [ ] `lib/__tests__/claude-code-client.test.ts` created (8+ tests)
- [ ] `lib/__tests__/agents.test.ts` created
- [ ] `lib/__tests__/resources.test.ts` created
- [ ] `lib/__tests__/grader-executor.test.ts` created
- [ ] Coverage: 40%

**Estimated Effort:** 32 hours
**Owner:** qa-engineer

### Week 7-8: E2E Tests

**Goals:**
- Set up Playwright
- Write E2E tests for critical user journeys
- Add E2E tests to CI

**Deliverables:**
- [ ] Playwright installed and configured
- [ ] 7 critical path E2E tests created
- [ ] `.github/workflows/e2e.yml` created
- [ ] Documentation: E2E testing guide

**Estimated Effort:** 24 hours
**Owner:** qa-engineer

### Week 9-10: Component Tests (Phase 1)

**Goals:**
- Test critical UI components
- Set up accessibility testing
- Test form components

**Deliverables:**
- [ ] 10 component test files created
- [ ] jest-axe integrated for accessibility
- [ ] Coverage: 50%

**Estimated Effort:** 32 hours
**Owner:** qa-engineer

### Week 11-12: Performance & Security Hardening

**Goals:**
- Performance tests for key scenarios
- Security audit and hardening
- Fix error handling gaps

**Deliverables:**
- [ ] Performance test suite created
- [ ] Security audit complete
- [ ] Path traversal gaps fixed in savePrompt/deletePrompt
- [ ] API key encryption implemented
- [ ] Documentation: Performance SLAs

**Estimated Effort:** 24 hours
**Owner:** tech-lead (lead), qa-engineer (tests)

### Month 4-6: Comprehensive Coverage

**Goals:**
- Test remaining components (80+ files)
- Improve coverage to 70%+
- Landing page E2E tests
- Visual regression tests

**Deliverables:**
- [ ] 80+ component test files created
- [ ] Landing page E2E tests
- [ ] Visual regression tests with Percy/Chromatic
- [ ] Coverage: 70%+
- [ ] Test infrastructure improvements (factories, utilities)

**Estimated Effort:** 60 hours
**Owner:** qa-engineer

---

## Metrics & Tracking

### Coverage Metrics (Updated Weekly)

| Metric | Current | Week 4 | Week 8 | Month 6 |
|--------|---------|--------|--------|---------|
| Overall Coverage | < 5% | 25% | 50% | 70% |
| Unit Test Coverage | 10% | 70% | 75% | 80% |
| Integration Test Coverage | 0% | 30% | 60% | 70% |
| Component Test Coverage | 0% | 0% | 30% | 60% |
| E2E Critical Paths | 0% | 0% | 100% | 100% |

### Test Count (Updated Weekly)

| Type | Current | Week 4 | Week 8 | Month 6 |
|------|---------|--------|--------|---------|
| Unit Tests | 48 | 150 | 250 | 400 |
| Integration Tests | 0 | 60 | 120 | 180 |
| Hook Tests | 0 | 30 | 50 | 70 |
| Component Tests | 0 | 0 | 80 | 200 |
| E2E Tests | 0 | 0 | 7 | 15 |
| Security Tests | 0 | 8 | 12 | 15 |
| **Total** | **48** | **248** | **519** | **880** |

### Quality Metrics (Target)

- **Test Pass Rate:** > 99% (< 1% flaky tests)
- **CI Test Duration:** < 2 minutes (unit + integration)
- **E2E Test Duration:** < 5 minutes
- **Coverage Decrease Block:** No PR decreases coverage
- **Bug Escape Rate:** < 5% (bugs found in prod vs. caught in testing)

### Bug Tracking (By Severity)

| Severity | Target | Action |
|----------|--------|--------|
| CRITICAL | 0 | Block release, fix immediately |
| HIGH | < 3 | Fix before next release |
| MEDIUM | < 10 | Schedule for near-term sprint |
| LOW | < 20 | Backlog, prioritize by impact |

---

## Tools & Resources

### Testing Tools

- **Vitest:** https://vitest.dev/
- **React Testing Library:** https://testing-library.com/react
- **Playwright:** https://playwright.dev/
- **jest-axe:** https://github.com/nickcolley/jest-axe
- **MSW:** https://mswjs.io/
- **Codecov:** https://codecov.io/

### Best Practices

- **Testing Library Guiding Principles:** https://testing-library.com/docs/guiding-principles/
- **Vitest Best Practices:** https://vitest.dev/guide/
- **Testing React Hooks:** https://react-hooks-testing-library.com/

### Internal Documentation

- [Testing Patterns Reference](./reference/testing-patterns.md)
- [Mocking Strategies](./reference/mocking-strategies.md)
- [Test Data Management](./reference/test-data-management.md)
- [CI/CD Testing](./reference/ci-cd-testing.md)

---

## Contact & Support

**QA Lead:** qa-engineer
**Tech Lead:** tech-lead
**Project Manager:** project-manager

For questions about testing strategy, contact qa-engineer via team chat or project channels.

---

**Last Review:** 2026-01-30
**Next Review:** 2026-02-06 (weekly cadence during initial ramp-up)
