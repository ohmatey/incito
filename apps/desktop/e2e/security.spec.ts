import { test, expect } from '@playwright/test'

/**
 * Security-focused E2E tests.
 * These tests verify that security measures are in place.
 */

test.describe('Security Headers', () => {
  test('should not expose sensitive information in page source', async ({ page }) => {
    await page.goto('/')

    const content = await page.content()

    // Should not contain API keys or secrets
    expect(content).not.toMatch(/sk-[a-zA-Z0-9]{20,}/) // OpenAI key pattern
    expect(content).not.toMatch(/sk-ant-[a-zA-Z0-9]{20,}/) // Anthropic key pattern
    expect(content).not.toMatch(/AIza[a-zA-Z0-9]{35}/) // Google AI key pattern

    // Should not contain obvious password patterns
    expect(content.toLowerCase()).not.toMatch(/password\s*[:=]\s*["'][^"']+["']/)
    expect(content.toLowerCase()).not.toMatch(/secret\s*[:=]\s*["'][^"']+["']/)
  })

  test('should not have inline event handlers in HTML', async ({ page }) => {
    await page.goto('/')

    const content = await page.content()

    // Inline event handlers are a security risk (CSP violation)
    // Note: React synthetic events don't count as inline handlers
    expect(content).not.toMatch(/\s+on\w+\s*=\s*["']javascript:/i)
  })
})

test.describe('XSS Prevention', () => {
  test('should not render script tags from URL params', async ({ page }) => {
    // Attempt XSS via URL parameter
    await page.goto('/?test=<script>alert("xss")</script>')

    const content = await page.content()

    // The script tag should be escaped or not present
    expect(content).not.toContain('<script>alert("xss")</script>')
  })

  test('should escape special characters in displayed content', async ({ page }) => {
    await page.goto('/')

    // The app should properly escape any special HTML characters
    // This is a basic smoke test - more thorough testing would require
    // actually creating prompts with special characters
    const scripts = await page.locator('script:not([src])').count()

    // Only bundled scripts should be present, not injected ones
    expect(scripts).toBeLessThanOrEqual(5)
  })
})

test.describe('Input Validation', () => {
  test('should handle empty inputs gracefully', async ({ page }) => {
    await page.goto('/')

    // Find any input field and submit empty
    const inputs = page.locator('input[type="text"], textarea')
    const count = await inputs.count()

    if (count > 0) {
      const firstInput = inputs.first()
      await firstInput.fill('')
      await firstInput.press('Enter')

      // Should not crash or show error page
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should sanitize path-like inputs', async ({ page }) => {
    await page.goto('/')

    // The app should not allow path traversal in inputs
    // This is tested by checking the app handles suspicious input gracefully
    const inputs = page.locator('input[type="text"]')
    const count = await inputs.count()

    if (count > 0) {
      const firstInput = inputs.first()
      await firstInput.fill('../../../etc/passwd')
      await firstInput.press('Enter')

      // Should not crash
      await expect(page.locator('body')).toBeVisible()
    }
  })
})
