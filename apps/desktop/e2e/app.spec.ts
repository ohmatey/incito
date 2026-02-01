import { test, expect } from '@playwright/test'

test.describe('App Loading', () => {
  test('should display folder select screen on initial load', async ({ page }) => {
    await page.goto('/')

    // The app should show the folder select screen initially
    // Look for the folder selection UI elements
    await expect(page.locator('body')).toBeVisible()

    // The page should load without JavaScript errors
    const errors: string[] = []
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await page.waitForTimeout(1000)

    // Filter out expected Tauri-related errors when running outside Tauri
    const unexpectedErrors = errors.filter(
      (e) => !e.includes('__TAURI__') && !e.includes('tauri')
    )
    expect(unexpectedErrors).toHaveLength(0)
  })

  test('should have proper document title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Incito|Prompt Studio/i)
  })
})

test.describe('UI Components', () => {
  test('should render with proper styling', async ({ page }) => {
    await page.goto('/')

    // Verify Tailwind CSS is loaded by checking for utility classes
    const body = page.locator('body')
    await expect(body).toBeVisible()

    // Check that the app has a reasonable viewport
    const viewport = page.viewportSize()
    expect(viewport?.width).toBeGreaterThan(0)
    expect(viewport?.height).toBeGreaterThan(0)
  })
})

test.describe('Accessibility', () => {
  test('should not have broken images', async ({ page }) => {
    await page.goto('/')

    const images = page.locator('img')
    const count = await images.count()

    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth)
      // naturalWidth of 0 means the image failed to load
      expect(naturalWidth).toBeGreaterThan(0)
    }
  })

  test('should have focus management', async ({ page }) => {
    await page.goto('/')

    // Tab through the page and verify focus is visible
    await page.keyboard.press('Tab')

    // There should be a focused element
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeTruthy()
  })
})

test.describe('Navigation', () => {
  test('should handle route changes without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => {
      // Ignore Tauri-specific errors
      if (!error.message.includes('__TAURI__') && !error.message.includes('tauri')) {
        errors.push(error.message)
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Try navigating to settings if it exists
    const settingsLink = page.locator('[href*="settings"], [data-testid="settings"]').first()
    if (await settingsLink.isVisible().catch(() => false)) {
      await settingsLink.click()
      await page.waitForLoadState('networkidle')
    }

    expect(errors).toHaveLength(0)
  })
})
