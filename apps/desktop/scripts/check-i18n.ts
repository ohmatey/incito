#!/usr/bin/env npx tsx

/**
 * i18n Coverage Verification Script
 *
 * This script verifies translation coverage by:
 * 1. Finding all translation keys used in code (t('namespace:key') patterns)
 * 2. Loading all locale files and building key inventories
 * 3. Checking for missing keys (used in code but not in locales)
 * 4. Checking for unused keys (in locales but not in code)
 * 5. Checking locale consistency (keys in en/ must exist in th/)
 *
 * Exit codes:
 * - 0: All checks pass
 * - 1: Missing keys found (hard fail)
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const SRC_DIR = path.resolve(__dirname, '../src')
const LOCALES_DIR = path.resolve(__dirname, '../src/i18n/locales')
const LOCALES = ['en', 'th'] as const
const PRIMARY_LOCALE = 'en'
const NAMESPACES = ['common', 'settings', 'prompts', 'toasts', 'tags', 'search'] as const

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
}

interface KeyUsage {
  key: string
  file: string
  line: number
}

interface ValidationResult {
  usedKeys: KeyUsage[]
  localeKeys: Map<string, Set<string>> // locale -> set of keys
  missingKeys: KeyUsage[] // keys used in code but not in locale
  unusedKeys: string[] // keys in locale but not in code
  missingTranslations: Map<string, string[]> // locale -> missing keys
}

/**
 * Recursively find all .ts and .tsx files in a directory
 */
function findSourceFiles(dir: string): string[] {
  const files: string[] = []

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        // Skip node_modules, ui components (shadcn), test files, and i18n directory
        if (
          entry.name !== 'node_modules' &&
          entry.name !== 'ui' &&
          entry.name !== '__tests__' &&
          entry.name !== 'i18n'
        ) {
          walk(fullPath)
        }
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        // Skip test files and type definition files
        if (!entry.name.endsWith('.test.ts') && !entry.name.endsWith('.d.ts')) {
          files.push(fullPath)
        }
      }
    }
  }

  walk(dir)
  return files
}

/**
 * Extract translation keys from source files
 * Matches patterns like:
 * - t('namespace:key')
 * - t("namespace:key")
 * - t('key') when in a namespace context
 * - t('key', { ... })
 * - ctx.t('namespace:key')
 */
function extractTranslationKeys(files: string[]): KeyUsage[] {
  const usages: KeyUsage[] = []

  // Pattern to match t('...') or t("...") function calls
  // Handles both simple keys and namespace:key format
  const pattern = /\bt\s*\(\s*['"`]([^'"`]+)['"`]/g

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    const lines = content.split('\n')

    // Detect default namespace from useTranslation hook
    const useTranslationMatch = content.match(/useTranslation\s*\(\s*\[?\s*['"`]([^'"`]+)['"`]/)
    const defaultNamespace = useTranslationMatch ? useTranslationMatch[1] : 'common'

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum]
      let match

      // Reset regex lastIndex for each line
      pattern.lastIndex = 0

      while ((match = pattern.exec(line)) !== null) {
        let key = match[1]

        // If key doesn't have a namespace prefix, add the default namespace
        if (!key.includes(':')) {
          key = `${defaultNamespace}:${key}`
        }

        usages.push({
          key,
          file: path.relative(SRC_DIR, file),
          line: lineNum + 1,
        })
      }
    }
  }

  return usages
}

/**
 * Flatten nested JSON object into dot-notation keys
 */
function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey))
    } else {
      keys.push(fullKey)
    }
  }

  return keys
}

/**
 * Load all locale files and build key inventories
 */
function loadLocaleKeys(): Map<string, Set<string>> {
  const localeKeys = new Map<string, Set<string>>()

  for (const locale of LOCALES) {
    const keys = new Set<string>()
    const localeDir = path.join(LOCALES_DIR, locale)

    if (!fs.existsSync(localeDir)) {
      console.error(`${colors.red}Error: Locale directory not found: ${localeDir}${colors.reset}`)
      continue
    }

    for (const namespace of NAMESPACES) {
      const filePath = path.join(localeDir, `${namespace}.json`)

      if (!fs.existsSync(filePath)) {
        console.warn(
          `${colors.yellow}Warning: Locale file not found: ${filePath}${colors.reset}`
        )
        continue
      }

      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const json = JSON.parse(content)
        const flatKeys = flattenKeys(json)

        for (const key of flatKeys) {
          keys.add(`${namespace}:${key}`)
        }
      } catch (error) {
        console.error(
          `${colors.red}Error parsing ${filePath}: ${error}${colors.reset}`
        )
      }
    }

    localeKeys.set(locale, keys)
  }

  return localeKeys
}

/**
 * Find missing keys (used in code but not in locale)
 */
function findMissingKeys(usedKeys: KeyUsage[], localeKeys: Set<string>): KeyUsage[] {
  const missing: KeyUsage[] = []

  for (const usage of usedKeys) {
    if (!localeKeys.has(usage.key)) {
      missing.push(usage)
    }
  }

  return missing
}

/**
 * Find unused keys (in locale but not in code)
 */
function findUnusedKeys(usedKeys: KeyUsage[], localeKeys: Set<string>): string[] {
  const usedKeySet = new Set(usedKeys.map((u) => u.key))
  const unused: string[] = []

  for (const key of localeKeys) {
    if (!usedKeySet.has(key)) {
      unused.push(key)
    }
  }

  return unused.sort()
}

/**
 * Find keys missing in secondary locales
 */
function findMissingTranslations(
  localeKeys: Map<string, Set<string>>
): Map<string, string[]> {
  const primaryKeys = localeKeys.get(PRIMARY_LOCALE)
  if (!primaryKeys) {
    return new Map()
  }

  const missingTranslations = new Map<string, string[]>()

  for (const locale of LOCALES) {
    if (locale === PRIMARY_LOCALE) continue

    const keys = localeKeys.get(locale)
    if (!keys) continue

    const missing: string[] = []

    for (const key of primaryKeys) {
      if (!keys.has(key)) {
        missing.push(key)
      }
    }

    if (missing.length > 0) {
      missingTranslations.set(locale, missing.sort())
    }
  }

  return missingTranslations
}

/**
 * Main validation function
 */
function validate(): ValidationResult {
  // Find and extract keys from source files
  const sourceFiles = findSourceFiles(SRC_DIR)
  const usedKeys = extractTranslationKeys(sourceFiles)

  // Load locale keys
  const localeKeys = loadLocaleKeys()
  const primaryLocaleKeys = localeKeys.get(PRIMARY_LOCALE) || new Set()

  // Find issues
  const missingKeys = findMissingKeys(usedKeys, primaryLocaleKeys)
  const unusedKeys = findUnusedKeys(usedKeys, primaryLocaleKeys)
  const missingTranslations = findMissingTranslations(localeKeys)

  return {
    usedKeys,
    localeKeys,
    missingKeys,
    unusedKeys,
    missingTranslations,
  }
}

/**
 * Print validation results
 */
function printResults(result: ValidationResult): boolean {
  console.log('\nChecking i18n coverage...\n')

  // Deduplicate used keys for counting
  const uniqueUsedKeys = new Set(result.usedKeys.map((u) => u.key))
  const primaryLocaleKeys = result.localeKeys.get(PRIMARY_LOCALE) || new Set()

  console.log(
    `${colors.green}✓${colors.reset} Found ${colors.blue}${uniqueUsedKeys.size}${colors.reset} translation keys in code`
  )

  for (const [locale, keys] of result.localeKeys) {
    console.log(
      `${colors.green}✓${colors.reset} Found ${colors.blue}${keys.size}${colors.reset} keys in ${locale}/ locale files`
    )
  }

  let hasErrors = false
  let warningCount = 0

  // Report missing keys (errors)
  if (result.missingKeys.length > 0) {
    hasErrors = true
    console.log(`\n${colors.red}Errors:${colors.reset}`)

    // Deduplicate by key, showing first occurrence
    const seenKeys = new Map<string, KeyUsage>()
    for (const usage of result.missingKeys) {
      if (!seenKeys.has(usage.key)) {
        seenKeys.set(usage.key, usage)
      }
    }

    for (const [key, usage] of seenKeys) {
      console.log(
        `${colors.red}✗${colors.reset} Missing key in locale: ${colors.yellow}${key}${colors.reset} (used in ${colors.gray}${usage.file}:${usage.line}${colors.reset})`
      )
    }
  }

  // Report missing translations (errors)
  for (const [locale, missing] of result.missingTranslations) {
    if (missing.length > 0) {
      hasErrors = true
      console.log(
        `\n${colors.red}Missing translations in ${locale}/:${colors.reset}`
      )
      for (const key of missing) {
        console.log(`${colors.red}✗${colors.reset} ${colors.yellow}${key}${colors.reset}`)
      }
    }
  }

  // Report unused keys (warnings)
  if (result.unusedKeys.length > 0) {
    warningCount = result.unusedKeys.length
    console.log(`\n${colors.yellow}Warnings:${colors.reset}`)

    for (const key of result.unusedKeys) {
      console.log(
        `${colors.yellow}⚠${colors.reset} Unused key: ${colors.gray}${key}${colors.reset} (not found in any source file)`
      )
    }
  }

  // Summary
  const errorCount =
    result.missingKeys.length +
    Array.from(result.missingTranslations.values()).reduce((sum, arr) => sum + arr.length, 0)

  console.log(
    `\n${colors.blue}Summary:${colors.reset} ${
      errorCount > 0
        ? `${colors.red}${errorCount} error(s)${colors.reset}`
        : `${colors.green}0 errors${colors.reset}`
    }, ${
      warningCount > 0
        ? `${colors.yellow}${warningCount} warning(s)${colors.reset}`
        : `${colors.green}0 warnings${colors.reset}`
    }\n`
  )

  return !hasErrors
}

// Run validation
const result = validate()
const success = printResults(result)

process.exit(success ? 0 : 1)
