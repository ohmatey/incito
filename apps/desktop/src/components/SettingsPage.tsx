import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FolderOpen, Sun, Moon, Monitor, Eye, EyeOff, Check, Loader2, Sparkles, Pencil, Trash2, Copy, ExternalLink, Plug, Languages, FlaskConical, BarChart3, Terminal, RefreshCw, Download, Search, CheckCircle2, XCircle, Play } from 'lucide-react'
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
  type FeatureFlags,
  AI_MODELS,
} from '@/lib/store'
import { toast } from 'sonner'
import { TranslationSettings } from '@/components/translation/TranslationSettings'
import { findClaudeCodePath, ensureClaudeCodeServer, checkClaudeCodeAuth, generateWithClaudeCode } from '@/lib/claude-code-client'
import { usePostHog } from '@/context/PostHogContext'
import { useUpdate } from '@/context/UpdateContext'
import { getVersion } from '@tauri-apps/api/app'

interface SettingsPageProps {
  folderPath: string
  onChangeFolder: () => void
  featureFlags: FeatureFlags
  onUpdateFeatureFlags: (flags: Partial<FeatureFlags>) => Promise<void>
}

type AIViewMode = 'empty' | 'editing' | 'viewing'

function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••'
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`
}

export function SettingsPage({ folderPath, onChangeFolder, featureFlags, onUpdateFeatureFlags }: SettingsPageProps) {
  const { t } = useTranslation(['settings', 'common', 'translation'])
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const { isEnabled: analyticsEnabled, enableAnalytics, disableAnalytics, isLoading: analyticsLoading } = usePostHog()
  const { isChecking: isCheckingUpdate, checkForUpdates, updateAvailable } = useUpdate()
  const [appVersion, setAppVersion] = useState<string>('')
  const [savedSettings, setSavedSettings] = useState<AISettings>({
    provider: null,
    apiKey: null,
    model: null,
    claudeCodeExecutablePath: null,
  })
  const [editSettings, setEditSettings] = useState<AISettings>({
    provider: null,
    apiKey: null,
    model: null,
    claudeCodeExecutablePath: null,
  })
  const [viewMode, setViewMode] = useState<AIViewMode>('empty')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [mcpCopied, setMcpCopied] = useState(false)
  const [currentPlatform, setCurrentPlatform] = useState<string>('macos')
  const [isFindingPath, setIsFindingPath] = useState(false)
  const [pathCheckResult, setPathCheckResult] = useState<{ valid: boolean; version?: string } | null>(null)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; response?: string; error?: string } | null>(null)

  // Detect platform
  useEffect(() => {
    const p = platform()
    if (p === 'macos') setCurrentPlatform('macos')
    else if (p === 'windows') setCurrentPlatform('windows')
    else setCurrentPlatform('linux')
  }, [])

  // Load app version
  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion(''))
  }, [])

  // Load AI settings on mount
  useEffect(() => {
    async function loadSettings() {
      const aiResult = await getAISettings()

      if (aiResult.ok) {
        setSavedSettings(aiResult.data)
        // Claude Code uses CLI auth, no API key needed
        if (aiResult.data.provider === 'claude-code') {
          setViewMode('viewing')
        } else if (aiResult.data.provider && aiResult.data.apiKey) {
          setViewMode('viewing')
        } else {
          setViewMode('empty')
        }
      } else {
        toast.error(aiResult.error)
      }

      setIsLoading(false)
    }
    loadSettings()
  }, [])

  async function handleFeatureFlagChange(key: keyof FeatureFlags, value: boolean) {
    await onUpdateFeatureFlags({ [key]: value })
  }

  function handleStartEditing() {
    setEditSettings({ ...savedSettings })
    setShowApiKey(false)
    setTestResult(null)
    setViewMode('editing')
  }

  function handleCancelEditing() {
    setTestResult(null)
    setPathCheckResult(null)
    if (savedSettings.provider && (savedSettings.apiKey || savedSettings.provider === 'claude-code')) {
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
        claudeCodeExecutablePath: null,
      })
      if (result.ok) {
        setSavedSettings({ provider: null, apiKey: null, model: null, claudeCodeExecutablePath: null })
        setEditSettings({ provider: null, apiKey: null, model: null, claudeCodeExecutablePath: null })
        setViewMode('empty')
        toast.success(t('settings:aiProvider.removed'))
      } else {
        toast.error(result.error)
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Claude Code uses CLI authentication, no API key needed
  const canSave = editSettings.provider && (editSettings.provider === 'claude-code' || editSettings.apiKey)

  function handleFindClaudeCodePath() {
    setIsFindingPath(true)
    setPathCheckResult(null)

    setTimeout(async () => {
      try {
        const result = await findClaudeCodePath()
        if (result?.found && result?.path) {
          setEditSettings((prev) => ({ ...prev, claudeCodeExecutablePath: result.path ?? null }))
          setPathCheckResult({ valid: true, version: result.version })
          toast.success(t('settings:aiProvider.claudeCodePath.found', { path: result.path }))
        } else {
          toast.error(result?.error || t('settings:aiProvider.claudeCodePath.notFound'))
        }
      } catch {
        toast.error(t('settings:aiProvider.claudeCodePath.findError'))
      } finally {
        setIsFindingPath(false)
      }
    }, 0)
  }

  async function handleTestClaudeCodeConnection() {
    setIsTestingConnection(true)
    setTestResult(null)

    try {
      // Get the executable path from either edit or saved settings
      const execPath = viewMode === 'viewing'
        ? savedSettings.claudeCodeExecutablePath
        : editSettings.claudeCodeExecutablePath

      // Start server, check auth, run test prompt
      const serverStarted = await ensureClaudeCodeServer(execPath)
      if (!serverStarted) {
        throw new Error(t('settings:aiProvider.claudeCodeTest.serverFailed'))
      }

      const authStatus = await checkClaudeCodeAuth()
      if (!authStatus.authenticated) {
        throw new Error(t('settings:aiProvider.claudeCodeTest.notAuthenticated'))
      }

      const response = await generateWithClaudeCode('Tell me a one-liner joke about coding.', {
        model: (savedSettings.model as 'opus' | 'sonnet' | 'haiku') || 'sonnet'
      })
      setTestResult({ success: true, response: response.text })
      toast.success(t('settings:aiProvider.claudeCodeTest.success'))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('settings:aiProvider.claudeCodeTest.failed')
      setTestResult({ success: false, error: errorMessage })
      toast.error(errorMessage)
    } finally {
      setIsTestingConnection(false)
    }
  }

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

            {/* Experimental Features */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings:experimental.title')}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings:experimental.description')}
              </p>
              <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="agents-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('settings:experimental.agents')}
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('settings:experimental.agentsDescription')}
                    </p>
                  </div>
                  <Switch
                    id="agents-toggle"
                    checked={featureFlags.agentsEnabled}
                    onCheckedChange={(checked) => handleFeatureFlagChange('agentsEnabled', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="resources-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('settings:experimental.resources')}
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('settings:experimental.resourcesDescription')}
                    </p>
                  </div>
                  <Switch
                    id="resources-toggle"
                    checked={featureFlags.resourcesEnabled}
                    onCheckedChange={(checked) => handleFeatureFlagChange('resourcesEnabled', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="translations-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('settings:experimental.translations')}
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('settings:experimental.translationsDescription')}
                    </p>
                  </div>
                  <Switch
                    id="translations-toggle"
                    checked={featureFlags.translationsEnabled}
                    onCheckedChange={(checked) => handleFeatureFlagChange('translationsEnabled', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="mcp-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('settings:experimental.mcpServer')}
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('settings:experimental.mcpServerDescription')}
                    </p>
                  </div>
                  <Switch
                    id="mcp-toggle"
                    checked={featureFlags.mcpServerEnabled}
                    onCheckedChange={(checked) => handleFeatureFlagChange('mcpServerEnabled', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="runs-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('settings:experimental.runs')}
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('settings:experimental.runsDescription')}
                    </p>
                  </div>
                  <Switch
                    id="runs-toggle"
                    checked={featureFlags.runsEnabled}
                    onCheckedChange={(checked) => handleFeatureFlagChange('runsEnabled', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Anonymous Analytics */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('settings:analytics.title')}
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings:analytics.description')}
              </p>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="analytics-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('settings:analytics.enable')}
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('settings:analytics.privacy')}
                    </p>
                  </div>
                  <Switch
                    id="analytics-toggle"
                    checked={analyticsEnabled}
                    disabled={analyticsLoading}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        enableAnalytics()
                      } else {
                        disableAnalytics()
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* App Updates */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('settings:updates.title')}
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings:updates.description')}
              </p>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('settings:updates.currentVersion')}
                    </p>
                    <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {appVersion || '—'}
                    </p>
                    {!updateAvailable && !isCheckingUpdate && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {t('settings:updates.upToDate')}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkForUpdates}
                    disabled={isCheckingUpdate}
                    className="gap-2"
                  >
                    {isCheckingUpdate ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {isCheckingUpdate ? t('settings:updates.checking') : t('settings:updates.checkForUpdates')}
                  </Button>
                </div>
              </div>
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
                        {savedSettings.provider === 'claude-code' ? t('settings:aiProvider.authentication') : t('settings:aiProvider.apiKey')}
                      </p>
                      <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                        {savedSettings.provider === 'claude-code'
                          ? t('settings:aiProvider.cliAuthentication')
                          : (savedSettings.apiKey ? maskApiKey(savedSettings.apiKey) : '—')}
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
                    {savedSettings.provider === 'claude-code' && savedSettings.claudeCodeExecutablePath && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {t('settings:aiProvider.claudeCodePath.label')}
                        </p>
                        <p className="text-sm font-mono text-gray-900 dark:text-gray-100 truncate">
                          {savedSettings.claudeCodeExecutablePath}
                        </p>
                      </div>
                    )}
                    {savedSettings.provider === 'claude-code' && (
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleTestClaudeCodeConnection}
                          disabled={isTestingConnection}
                          className="gap-2"
                        >
                          {isTestingConnection ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          {t('settings:aiProvider.claudeCodeTest.button')}
                        </Button>
                        {testResult && (
                          <div className={`mt-3 rounded-md p-3 text-sm ${testResult.success ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'}`}>
                            {testResult.success ? testResult.response : testResult.error}
                          </div>
                        )}
                      </div>
                    )}
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
                        <SelectItem value="claude-code">{t('settings:aiProvider.providers.claude-code')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Claude Code CLI Auth Info */}
                  {editSettings.provider === 'claude-code' && (
                    <>
                      <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 dark:border-primary-800 dark:bg-primary-900/20">
                        <div className="flex items-start gap-2">
                          <Terminal className="h-4 w-4 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
                              {t('settings:aiProvider.claudeCodeAuth.title')}
                            </p>
                            <p className="text-xs text-primary-600 dark:text-primary-400">
                              {t('settings:aiProvider.claudeCodeAuth.description')}
                            </p>
                            <code className="block mt-2 text-xs bg-primary-100 dark:bg-primary-900/40 px-2 py-1 rounded font-mono text-primary-700 dark:text-primary-300">
                              claude login
                            </code>
                          </div>
                        </div>
                      </div>

                      {/* Claude Code Executable Path (Optional) */}
                      <div className="space-y-2">
                        <Label htmlFor="claude-code-path" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t('settings:aiProvider.claudeCodePath.label')}
                        </Label>
                        <div className="relative">
                          <Input
                            id="claude-code-path"
                            type="text"
                            value={editSettings.claudeCodeExecutablePath || ''}
                            onChange={(e) => {
                              setEditSettings((prev) => ({ ...prev, claudeCodeExecutablePath: e.target.value || null }))
                              setPathCheckResult(null)
                              setTestResult(null)
                            }}
                            placeholder={t('settings:aiProvider.claudeCodePath.placeholder')}
                            className={`font-mono text-sm pr-8 ${pathCheckResult ? (pathCheckResult.valid ? 'border-green-500 focus-visible:ring-green-500' : 'border-red-500 focus-visible:ring-red-500') : ''}`}
                          />
                          {pathCheckResult && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              {pathCheckResult.valid ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleFindClaudeCodePath}
                            disabled={isFindingPath}
                            className="gap-2"
                          >
                            {isFindingPath ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4" />
                            )}
                            {t('settings:aiProvider.claudeCodePath.findButton')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleTestClaudeCodeConnection}
                            disabled={isTestingConnection}
                            className="gap-2"
                          >
                            {isTestingConnection ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                            {t('settings:aiProvider.claudeCodeTest.button')}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t('settings:aiProvider.claudeCodePath.hint')}
                        </p>
                        {pathCheckResult?.valid && pathCheckResult.version && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            {t('settings:aiProvider.claudeCodePath.versionDetected', { version: pathCheckResult.version })}
                          </p>
                        )}
                        {testResult && (
                          <div className={`mt-3 rounded-md p-3 text-sm ${testResult.success ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'}`}>
                            {testResult.success ? testResult.response : testResult.error}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* API Key - only for providers that need it */}
                  {editSettings.provider && editSettings.provider !== 'claude-code' && (
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
                  {editSettings.provider && (editSettings.provider === 'claude-code' || editSettings.apiKey) && (
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

            {/* Translation - only show when translations feature is enabled */}
            {featureFlags.translationsEnabled && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('translation:settings.title')}</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('translation:settings.description')}
                </p>
                <TranslationSettings />
              </div>
            )}

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

            {/* MCP Integration - only show when MCP feature is enabled */}
            {featureFlags.mcpServerEnabled && (
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
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
