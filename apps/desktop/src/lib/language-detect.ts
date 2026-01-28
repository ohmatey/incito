/**
 * Language detection utility based on Unicode character ranges
 * Detects source language for translation feature
 */

import type { LanguageCode } from '../types/prompt'

export interface DetectedLanguage {
  code: LanguageCode
  name: string
  nativeName: string
  flag: string
  confidence: number
}

// Language definitions with Unicode ranges and metadata
interface LanguageDefinition {
  code: LanguageCode
  name: string
  nativeName: string
  flag: string
  // Regex pattern to match characters of this language
  pattern: RegExp
  // Whether to count characters (CJK) or words (alphabetic)
  countMethod: 'char' | 'word'
}

const LANGUAGE_DEFINITIONS: LanguageDefinition[] = [
  {
    code: 'th',
    name: 'Thai',
    nativeName: 'ไทย',
    flag: '🇹🇭',
    pattern: /[\u0E00-\u0E7F]/g,
    countMethod: 'char'
  }
]

// Supported languages for UI (v0.10.0: English and Thai only)
export const SUPPORTED_LANGUAGES: Array<{
  code: LanguageCode
  name: string
  nativeName: string
  flag: string
}> = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' }
]

/**
 * Get language info by code
 */
export function getLanguageInfo(code: LanguageCode): {
  code: LanguageCode
  name: string
  nativeName: string
  flag: string
} | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code)
}

/**
 * Strip code blocks and Handlebars syntax before language detection
 * This prevents false positives from technical content
 */
function prepareTextForDetection(text: string): string {
  // Remove code blocks
  let cleaned = text.replace(/```[\s\S]*?```/g, '')
  // Remove inline code
  cleaned = cleaned.replace(/`[^`]+`/g, '')
  // Remove Handlebars variables
  cleaned = cleaned.replace(/\{\{[^}]+\}\}/g, '')
  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '')
  // Remove common technical terms that are English everywhere
  cleaned = cleaned.replace(/\b(API|HTTP|JSON|XML|SQL|CSS|HTML|URL|URI)\b/gi, '')

  return cleaned.trim()
}

/**
 * Detect the primary language of a text
 * Returns null if text is primarily English or undetermined
 */
export function detectLanguage(text: string): DetectedLanguage | null {
  const cleanedText = prepareTextForDetection(text)

  if (!cleanedText || cleanedText.length < 10) {
    return null
  }

  const totalChars = cleanedText.replace(/\s/g, '').length
  if (totalChars === 0) return null

  const scores: Array<{
    lang: LanguageDefinition
    score: number
    matches: number
  }> = []

  for (const lang of LANGUAGE_DEFINITIONS) {
    const matches = cleanedText.match(lang.pattern)
    const matchCount = matches?.length ?? 0

    if (matchCount === 0) continue

    // Calculate score based on match density
    let score: number
    if (lang.countMethod === 'char') {
      // For character-based languages, calculate percentage of text
      score = matchCount / totalChars
    } else {
      // For word-based detection, use match count weighted
      const words = cleanedText.split(/\s+/).length
      score = matchCount / Math.max(words, 1)
    }

    scores.push({ lang, score, matches: matchCount })
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)

  // No matches found - likely English
  if (scores.length === 0) {
    return null
  }

  const best = scores[0]

  // Threshold: need at least 10% presence for character-based languages
  // or significant word matches for word-based
  const minThreshold = best.lang.countMethod === 'char' ? 0.1 : 0.15

  if (best.score < minThreshold) {
    return null
  }

  const detectedCode = best.lang.code

  // Calculate confidence based on score
  let confidence: number
  if (best.score >= 0.5) {
    confidence = 0.95
  } else if (best.score >= 0.3) {
    confidence = 0.8
  } else if (best.score >= 0.15) {
    confidence = 0.6
  } else {
    confidence = 0.4
  }

  const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === detectedCode)!

  return {
    code: detectedCode,
    name: langInfo.name,
    nativeName: langInfo.nativeName,
    flag: langInfo.flag,
    confidence
  }
}

/**
 * Quick check if text contains characters outside the target language
 * Useful for determining if translation is needed
 */
export function containsNonTargetLanguage(
  text: string,
  targetLang: LanguageCode
): boolean {
  if (targetLang === 'en') {
    // For English target, check for any non-Latin script
    const detected = detectLanguage(text)
    return detected !== null
  }

  // For other target languages, detect and compare
  const detected = detectLanguage(text)
  if (!detected) {
    // No specific language detected - assume it's in target language
    return false
  }

  return detected.code !== targetLang
}

/**
 * Check if text is primarily in the specified language
 */
export function isLanguage(text: string, langCode: LanguageCode): boolean {
  if (langCode === 'en') {
    return detectLanguage(text) === null
  }

  const detected = detectLanguage(text)
  return detected?.code === langCode
}

/**
 * Get a short label for display (e.g., "TH", "EN")
 */
export function getLanguageShortCode(code: LanguageCode): string {
  return code.toUpperCase()
}
