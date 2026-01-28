import { useState, useEffect, useCallback } from 'react'
import { getTranslationSettings } from '@/lib/store'
import { translatePromptText, type TranslationResultData } from '@/lib/mastra-client'
import { detectLanguage, containsNonTargetLanguage } from '@/lib/language-detect'
import type { TranslationSettings, LanguageCode } from '@/types/prompt'

export interface UsePromptTranslationOptions {
  text: string
  enabled?: boolean
}

export interface UsePromptTranslationResult {
  // Settings
  translationSettings: TranslationSettings | null
  isLoadingSettings: boolean

  // Detection
  detectedLanguage: LanguageCode | null
  needsTranslation: boolean

  // Translation state
  isTranslating: boolean
  translationResult: TranslationResultData | null
  translationError: string | null

  // Actions
  translate: (options?: { skipCache?: boolean }) => Promise<TranslationResultData | null>
  clearTranslation: () => void
}

export function usePromptTranslation(options: UsePromptTranslationOptions): UsePromptTranslationResult {
  const { text, enabled = true } = options

  // Settings state
  const [translationSettings, setTranslationSettings] = useState<TranslationSettings | null>(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)

  // Detection state
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageCode | null>(null)
  const [needsTranslation, setNeedsTranslation] = useState(false)

  // Translation state
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationResult, setTranslationResult] = useState<TranslationResultData | null>(null)
  const [translationError, setTranslationError] = useState<string | null>(null)

  // Load translation settings on mount
  useEffect(() => {
    async function loadSettings() {
      const result = await getTranslationSettings()
      if (result.ok) {
        setTranslationSettings(result.data)
      }
      setIsLoadingSettings(false)
    }
    loadSettings()
  }, [])

  // Detect language when text changes
  useEffect(() => {
    if (!text || !translationSettings) {
      setDetectedLanguage(null)
      setNeedsTranslation(false)
      return
    }

    // Only detect if translation is enabled
    if (!translationSettings.enabled || !enabled) {
      setDetectedLanguage(null)
      setNeedsTranslation(false)
      return
    }

    const targetLang = translationSettings.targetLanguage

    if (translationSettings.autoDetect) {
      // Auto-detect language
      const detected = detectLanguage(text)
      if (detected) {
        setDetectedLanguage(detected.code)
        setNeedsTranslation(detected.code !== targetLang)
      } else {
        // No specific language detected (likely target language)
        setDetectedLanguage(null)
        setNeedsTranslation(false)
      }
    } else {
      // Use configured source languages to determine if translation needed
      const needsIt = containsNonTargetLanguage(text, targetLang)
      setNeedsTranslation(needsIt)

      if (needsIt) {
        const detected = detectLanguage(text)
        setDetectedLanguage(detected?.code ?? null)
      } else {
        setDetectedLanguage(null)
      }
    }
  }, [text, translationSettings, enabled])

  // Clear translation when text changes significantly
  useEffect(() => {
    setTranslationResult(null)
    setTranslationError(null)
  }, [text])

  const translate = useCallback(
    async (translateOptions?: { skipCache?: boolean }): Promise<TranslationResultData | null> => {
      if (!text || !translationSettings || !detectedLanguage) {
        return null
      }

      setIsTranslating(true)
      setTranslationError(null)

      try {
        const result = await translatePromptText({
          text,
          sourceLanguage: detectedLanguage,
          targetLanguage: translationSettings.targetLanguage,
          context: 'coding',
          skipCache: translateOptions?.skipCache,
        })

        if (result.ok) {
          setTranslationResult(result.data)
          return result.data
        } else {
          setTranslationError(result.error)
          return null
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Translation failed'
        setTranslationError(errorMessage)
        return null
      } finally {
        setIsTranslating(false)
      }
    },
    [text, translationSettings, detectedLanguage]
  )

  const clearTranslation = useCallback(() => {
    setTranslationResult(null)
    setTranslationError(null)
  }, [])

  return {
    translationSettings,
    isLoadingSettings,
    detectedLanguage,
    needsTranslation,
    isTranslating,
    translationResult,
    translationError,
    translate,
    clearTranslation,
  }
}

// Helper hook for just checking if translation is needed (lighter weight)
export function useNeedsTranslation(text: string): {
  needsTranslation: boolean
  detectedLanguage: LanguageCode | null
  targetLanguage: LanguageCode | null
  isLoading: boolean
} {
  const [translationSettings, setTranslationSettings] = useState<TranslationSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageCode | null>(null)
  const [needsTranslation, setNeedsTranslation] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      const result = await getTranslationSettings()
      if (result.ok) {
        setTranslationSettings(result.data)
      }
      setIsLoading(false)
    }
    loadSettings()
  }, [])

  useEffect(() => {
    if (!text || !translationSettings || !translationSettings.enabled) {
      setDetectedLanguage(null)
      setNeedsTranslation(false)
      return
    }

    const detected = detectLanguage(text)
    if (detected && detected.code !== translationSettings.targetLanguage) {
      setDetectedLanguage(detected.code)
      setNeedsTranslation(true)
    } else {
      setDetectedLanguage(null)
      setNeedsTranslation(false)
    }
  }, [text, translationSettings])

  return {
    needsTranslation,
    detectedLanguage,
    targetLanguage: translationSettings?.targetLanguage ?? null,
    isLoading,
  }
}
