import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FolderOpen, Sun, Moon, Monitor, Eye, EyeOff, Check, Loader2, Sparkles, Pencil, Trash2, Copy, ExternalLink, Plug } from 'lucide-react'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { openUrl } from '@tauri-apps/plugin-opener'
import { platform } from '@tauri-apps/plugin-os'
import { useTheme } from '@/context/ThemeContext'
import { useLanguage } from '@/context/LanguageContext'
import { LANGUAGES, type Language } from '@/i18n/types'
import {
  getAISettings,
  saveAISettings,
  type AIProvider,
  type AISettings,
  AI_MODELS,
} from '@/lib/store'
import { toast } from 'sonner'

interface SettingsPageProps {
  folderPath: string
  onChangeFolder: () => void
}

type AIViewMode = 'empty' | 'editing' | 'viewing'

function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••'
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`
}

export function SettingsPage({ folderPath, onChangeFolder }: SettingsPageProps) {
  const { t } = useTranslation(['settings', 'common'])
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const [savedSettings, setSavedSettings] = useState<AISettings>({
    provider: null,
    apiKey: null,
    model: null,
  })
  const [editSettings, setEditSettings] = useState<AISettings>({
    provider: null,
    apiKey: null,
    model: null,
  })
  const [viewMode, setViewMode] = useState<AIViewMode>('empty')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [mcpCopied, setMcpCopied] = useState(false)
  const [currentPlatform, setCurrentPlatform] = useState<string>('macos')

  // Detect platform
  useEffect(() => {
    const p = platform()
    if (p === 'macos') setCurrentPlatform('macos')
    else if (p === 'windows') setCurrentPlatform('windows')
    else setCurrentPlatform('linux')
  }, [])

  // Load AI settings on mount
  useEffect(() => {
    async function loadSettings() {
      const result = await getAISettings()
      if (result.ok) {
        setSavedSettings(result.data)
        if (result.data.provider && result.data.apiKey) {
          setViewMode('viewing')
        } else {
          setViewMode('empty')
        }
      } else {
        toast.error(result.error)
      }
      setIsLoading(false)
    }
    loadSettings()
  }, [])

  function handleStartEditing() {
    setEditSettings({ ...savedSettings })
    setShowApiKey(false)
    setViewMode('editing')
  }

  function handleCancelEditing() {
    if (savedSettings.provider && savedSettings.apiKey) {
      setViewMode('viewing')
    } else {
      setViewMode('empty')
    }
  }

  function handleProviderChange(provider: AIProvider) {
    const defaultModel = AI_MODELS[provider][0]?.id || null
    setEditSettings((prev) => ({ ...prev, provider, model: defaultModel }))
  }

  async function handleSaveAISettings() {
    setIsSaving(true)
    try {
      const result = await saveAISettings(editSettings)
      if (result.ok) {
        setSavedSettings(editSettings)
        setViewMode('viewing')
        toast.success(t('settings:aiProvider.configured'))
      } else {
        toast.error(result.error)
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRemoveAISettings() {
    setIsSaving(true)
    try {
      const result = await saveAISettings({
        provider: null,
        apiKey: null,
        model: null,
      })
      if (result.ok) {
        setSavedSettings({ provider: null, apiKey: null, model: null })
        setEditSettings({ provider: null, apiKey: null, model: null })
        setViewMode('empty')
        toast.success(t('settings:aiProvider.removed'))
      } else {
        toast.error(result.error)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const canSave = editSettings.provider && editSettings.apiKey

  // MCP configuration based on platform
  const getMcpBinaryPath = () => {
    switch (currentPlatform) {
      case 'macos':
        return '/Applications/Incito.app/Contents/MacOS/incito-mcp'
      case 'windows':
        return 'C:\\Program Files\\Incito\\incito-mcp.exe'
      default:
        return '/usr/local/bin/incito-mcp'
    }
  }

  const getMcpConfigPath = () => {
    switch (currentPlatform) {
      case 'macos':
        return '~/Library/Application Support/Claude/claude_desktop_config.json'
      case 'windows':
        return '%APPDATA%\\Claude\\claude_desktop_config.json'
      default:
        return '~/.config/Claude/claude_desktop_config.json'
    }
  }

  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        incito: {
          command: getMcpBinaryPath(),
        },
      },
    },
    null,
    2
  )

  async function handleCopyMcpConfig() {
    await writeText(mcpConfig)
    setMcpCopied(true)
    toast.success(t('settings:mcp.copied'))
    setTimeout(() => setMcpCopied(false), 2000)
  }

  async function handleOpenMcpDocs() {
    await openUrl('https://modelcontextprotocol.io/introduction')
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex h-14 items-center border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('settings:title')}</h1>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="max-w-2xl space-y-6">
            {/* Appearance */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings:appearance.title')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings:appearance.description')}
              </p>
              <RadioGroup
                value={theme}
                onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
                className="grid grid-cols-3 gap-3"
              >
                <Label
                  htmlFor="theme-light"
                  className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer transition-all duration-150 hover:bg-gray-50 [&:has([data-state=checked])]:border-primary-500 [&:has([data-state=checked])]:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:[&:has([data-state=checked])]:bg-primary-900/20"
                >
                  <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                  <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings:appearance.light')}</span>
                </Label>
                <Label
                  htmlFor="theme-dark"
                  className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer transition-all duration-150 hover:bg-gray-50 [&:has([data-state=checked])]:border-primary-500 [&:has([data-state=checked])]:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:[&:has([data-state=checked])]:bg-primary-900/20"
                >
                  <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                  <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings:appearance.dark')}</span>
                </Label>
                <Label
                  htmlFor="theme-system"
                  className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer transition-all duration-150 hover:bg-gray-50 [&:has([data-state=checked])]:border-primary-500 [&:has([data-state=checked])]:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:[&:has([data-state=checked])]:bg-primary-900/20"
                >
                  <RadioGroupItem value="system" id="theme-system" className="sr-only" />
                  <Monitor className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings:appearance.system')}</span>
                </Label>
              </RadioGroup>
            </div>

            {/* Language */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings:language.title')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings:language.description')}
              </p>
              <RadioGroup
                value={language}
                onValueChange={(value) => setLanguage(value as Language)}
                className="grid grid-cols-2 gap-3"
              >
                {LANGUAGES.map((lang) => (
                  <Label
                    key={lang.code}
                    htmlFor={`lang-${lang.code}`}
                    className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer transition-all duration-150 hover:bg-gray-50 [&:has([data-state=checked])]:border-primary-500 [&:has([data-state=checked])]:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:[&:has([data-state=checked])]:bg-primary-900/20"
                  >
                    <RadioGroupItem value={lang.code} id={`lang-${lang.code}`} className="sr-only" />
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang.nativeName}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {/* AI Provider */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings:aiProvider.title')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings:aiProvider.description')}
              </p>

              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('settings:aiProvider.loading')}
                </div>
              ) : viewMode === 'empty' ? (
                /* Empty State */
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-600 dark:bg-gray-800/50">
                  <Sparkles className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {t('settings:aiProvider.emptyState')}
                  </p>
                  <Button
                    onClick={handleStartEditing}
                    variant="outline"
                    className="mt-3"
                  >
                    {t('settings:aiProvider.configure')}
                  </Button>
                </div>
              ) : viewMode === 'viewing' ? (
                /* Read View */
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {t('settings:aiProvider.provider')}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {savedSettings.provider ? t(`settings:aiProvider.providers.${savedSettings.provider}`) : '—'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleStartEditing}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveAISettings}
                          disabled={isSaving}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {t('settings:aiProvider.apiKey')}
                      </p>
                      <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                        {savedSettings.apiKey ? maskApiKey(savedSettings.apiKey) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {t('settings:aiProvider.model')}
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {savedSettings.provider && savedSettings.model
                          ? AI_MODELS[savedSettings.provider].find((m) => m.id === savedSettings.model)?.name || savedSettings.model
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit Form */
                <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  {/* Provider Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="ai-provider" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('settings:aiProvider.provider')}
                    </Label>
                    <Select
                      value={editSettings.provider || ''}
                      onValueChange={(value) => handleProviderChange(value as AIProvider)}
                    >
                      <SelectTrigger id="ai-provider" className="w-full">
                        <SelectValue placeholder={t('settings:aiProvider.selectProvider')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">{t('settings:aiProvider.providers.openai')}</SelectItem>
                        <SelectItem value="anthropic">{t('settings:aiProvider.providers.anthropic')}</SelectItem>
                        <SelectItem value="google">{t('settings:aiProvider.providers.google')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* API Key */}
                  {editSettings.provider && (
                    <div className="space-y-2">
                      <Label htmlFor="ai-api-key" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('settings:aiProvider.apiKey')}
                      </Label>
                      <div className="relative">
                        <Input
                          id="ai-api-key"
                          type={showApiKey ? 'text' : 'password'}
                          value={editSettings.apiKey || ''}
                          onChange={(e) =>
                            setEditSettings((prev) => ({ ...prev, apiKey: e.target.value }))
                          }
                          placeholder={t('settings:aiProvider.enterApiKey', { provider: t(`settings:aiProvider.providers.${editSettings.provider}`) })}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Model Selection */}
                  {editSettings.provider && editSettings.apiKey && (
                    <div className="space-y-2">
                      <Label htmlFor="ai-model" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('settings:aiProvider.model')}
                      </Label>
                      <Select
                        value={editSettings.model || ''}
                        onValueChange={(value) =>
                          setEditSettings((prev) => ({ ...prev, model: value }))
                        }
                      >
                        <SelectTrigger id="ai-model" className="w-full">
                          <SelectValue placeholder={t('settings:aiProvider.selectModel')} />
                        </SelectTrigger>
                        <SelectContent>
                          {AI_MODELS[editSettings.provider].map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Save/Cancel Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleSaveAISettings}
                      disabled={isSaving || !canSave}
                      className="gap-2"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {t('common:buttons.save')}
                    </Button>
                    <Button variant="outline" onClick={handleCancelEditing} disabled={isSaving}>
                      {t('common:buttons.cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Prompts Folder */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings:promptsFolder.title')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings:promptsFolder.description')}
              </p>
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                <code className="flex-1 text-sm text-gray-600 truncate font-mono dark:text-gray-400">
                  {folderPath}
                </code>
                <Button variant="secondary" onClick={onChangeFolder} className="gap-2 shrink-0">
                  <FolderOpen className="h-4 w-4" />
                  {t('common:buttons.changeFolder')}
                </Button>
              </div>
            </div>

            {/* MCP Integration */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings:mcp.title')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings:mcp.description')}
              </p>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Plug className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('settings:mcp.claudeDesktopConfig')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('settings:mcp.addTo')} <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">{getMcpConfigPath()}</code>
                  </p>
                  <div className="relative">
                    <pre className="bg-gray-50 dark:bg-gray-900 rounded-md p-3 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto border border-gray-200 dark:border-gray-700">
                      {mcpConfig}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyMcpConfig}
                      className="absolute top-2 right-2 h-8 w-8 p-0"
                    >
                      {mcpCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {t('settings:mcp.availableTools')} <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">list_prompts</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">get_prompt</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">use_prompt</code>
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleOpenMcpDocs}
                    className="h-auto p-0 text-xs gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t('settings:mcp.viewDocs')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
