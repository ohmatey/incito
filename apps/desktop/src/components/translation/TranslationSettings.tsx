import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Plus, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  getTranslationSettings,
  saveTranslationSettings,
  getTranslationCacheStats,
  clearTranslationCache,
} from '@/lib/store'
import { SUPPORTED_LANGUAGES, getLanguageInfo } from '@/lib/language-detect'
import type { TranslationSettings as TranslationSettingsType, LanguageCode } from '@/types/prompt'

export function TranslationSettings() {
  const { t } = useTranslation(['translation', 'common'])
  const [settings, setSettings] = useState<TranslationSettingsType>({
    enabled: false,
    sourceLanguages: [],
    targetLanguage: 'en',
    autoDetect: true,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [cacheStats, setCacheStats] = useState<{ count: number; oldestEntry: string | null }>({
    count: 0,
    oldestEntry: null,
  })
  const [isClearingCache, setIsClearingCache] = useState(false)

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      const result = await getTranslationSettings()
      if (result.ok) {
        setSettings(result.data)
      } else {
        toast.error(result.error)
      }

      const statsResult = await getTranslationCacheStats()
      if (statsResult.ok) {
        setCacheStats(statsResult.data)
      }

      setIsLoading(false)
    }
    loadSettings()
  }, [])

  async function handleSettingChange<K extends keyof TranslationSettingsType>(
    key: K,
    value: TranslationSettingsType[K]
  ) {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)

    setIsSaving(true)
    const result = await saveTranslationSettings({ [key]: value })
    setIsSaving(false)

    if (!result.ok) {
      toast.error(result.error)
      // Revert on error
      setSettings(settings)
    }
  }

  function handleAddSourceLanguage(langCode: LanguageCode) {
    if (settings.sourceLanguages.includes(langCode)) return
    if (langCode === settings.targetLanguage) {
      toast.error('Cannot add target language as source language')
      return
    }
    handleSettingChange('sourceLanguages', [...settings.sourceLanguages, langCode])
  }

  function handleRemoveSourceLanguage(langCode: LanguageCode) {
    handleSettingChange(
      'sourceLanguages',
      settings.sourceLanguages.filter((l) => l !== langCode)
    )
  }

  async function handleClearCache() {
    setIsClearingCache(true)
    const result = await clearTranslationCache()
    setIsClearingCache(false)

    if (result.ok) {
      setCacheStats({ count: 0, oldestEntry: null })
      toast.success(t('translation:settings.cacheClearedToast', { count: result.data }))
    } else {
      toast.error(result.error)
    }
  }

  // Get available source languages (excluding target language)
  const availableSourceLanguages = SUPPORTED_LANGUAGES.filter(
    (lang) =>
      lang.code !== settings.targetLanguage &&
      !settings.sourceLanguages.includes(lang.code)
  )

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Enable Translation Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="space-y-0.5">
          <Label htmlFor="translation-enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('translation:settings.enable')}
          </Label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('translation:settings.enableDescription')}
          </p>
        </div>
        <Switch
          id="translation-enabled"
          checked={settings.enabled}
          onCheckedChange={(checked: boolean) => handleSettingChange('enabled', checked)}
          disabled={isSaving}
        />
      </div>

      {/* Source Languages */}
      <div className={`rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 space-y-3 ${!settings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div>
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('translation:settings.sourceLanguages')}
          </Label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('translation:settings.sourceLanguagesDescription')}
          </p>
        </div>

        {/* Selected source languages */}
        <div className="flex flex-wrap gap-2">
          {settings.sourceLanguages.map((langCode) => {
            const lang = getLanguageInfo(langCode)
            if (!lang) return null
            return (
              <div
                key={langCode}
                className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm dark:bg-gray-700"
              >
                <span>{lang.flag}</span>
                <span className="text-gray-700 dark:text-gray-300">{lang.nativeName}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSourceLanguage(langCode)}
                  disabled={!settings.enabled}
                  className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:cursor-not-allowed"
                  title={t('translation:settings.removeLanguage', { language: lang.name })}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}

          {/* Add language dropdown */}
          {availableSourceLanguages.length > 0 && (
            <Select onValueChange={(value) => handleAddSourceLanguage(value as LanguageCode)} disabled={!settings.enabled}>
              <SelectTrigger className="h-8 w-auto gap-1.5 border-dashed" disabled={!settings.enabled}>
                <Plus className="h-3.5 w-3.5" />
                <SelectValue placeholder={t('translation:settings.addLanguage')} />
              </SelectTrigger>
              <SelectContent>
                {availableSourceLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.nativeName}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Target Language */}
      <div className={`rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 space-y-3 ${!settings.enabled ? 'opacity-50' : ''}`}>
        <div>
          <Label htmlFor="target-language" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('translation:settings.targetLanguage')}
          </Label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('translation:settings.targetLanguageDescription')}
          </p>
        </div>

        <Select
          value={settings.targetLanguage}
          onValueChange={(value) => handleSettingChange('targetLanguage', value as LanguageCode)}
          disabled={!settings.enabled}
        >
          <SelectTrigger id="target-language" className="w-full max-w-xs" disabled={!settings.enabled}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.filter(
              (lang) => !settings.sourceLanguages.includes(lang.code)
            ).map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                <span className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Auto-detect Toggle */}
      <div className={`flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 ${!settings.enabled ? 'opacity-50' : ''}`}>
        <div className="space-y-0.5">
          <Label htmlFor="translation-auto-detect" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('translation:settings.autoDetect')}
          </Label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('translation:settings.autoDetectDescription')}
          </p>
        </div>
        <Switch
          id="translation-auto-detect"
          checked={settings.autoDetect}
          onCheckedChange={(checked: boolean) => handleSettingChange('autoDetect', checked)}
          disabled={isSaving || !settings.enabled}
        />
      </div>

      {/* Cache Management */}
      <div className={`rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 space-y-3 ${!settings.enabled ? 'opacity-50' : ''}`}>
        <div>
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('translation:settings.cache')}
          </Label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('translation:settings.cacheDescription')}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>{t('translation:settings.cacheEntries', { count: cacheStats.count })}</p>
            {cacheStats.oldestEntry && (
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {t('translation:settings.cacheOldest', {
                  date: new Date(cacheStats.oldestEntry).toLocaleDateString(),
                })}
              </p>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCache}
            disabled={isClearingCache || cacheStats.count === 0 || !settings.enabled}
            className="gap-1.5"
          >
            {isClearingCache ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {t('translation:settings.clearCache')}
          </Button>
        </div>
      </div>
    </div>
  )
}
