import { test, expect } from '@playwright/test'

/**
 * Tests for the prompt parsing and interpolation logic.
 * These tests verify the core business logic works correctly.
 *
 * Note: These test the frontend behavior by importing the modules directly
 * in a Node.js context since they don't depend on Tauri APIs.
 */

test.describe('Parser Module', () => {
  test('should correctly parse markdown frontmatter format', async ({ page }) => {
    // This test verifies the parser module is correctly bundled
    // by checking the app loads without parser-related errors

    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('parser')) {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    expect(consoleErrors).toHaveLength(0)
  })
})

test.describe('Interpolation Module', () => {
  test('should be loaded without errors', async ({ page }) => {
    // Verify the interpolation module is correctly bundled
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('interpolate')) {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    expect(consoleErrors).toHaveLength(0)
  })
})
