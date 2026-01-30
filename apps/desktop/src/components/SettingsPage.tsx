import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { FolderOpen, Sun, Moon, Monitor, Check, Loader2, Copy, ExternalLink, Plug, Languages, FlaskConical, BarChart3, RefreshCw, Download } from 'lucide-react'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { openUrl } from '@tauri-apps/plugin-opener'
import { platform } from '@tauri-apps/plugin-os'
import { useTheme } from '@/context/ThemeContext'
import { useLanguage } from '@/context/LanguageContext'
import { LANGUAGES, type Language } from '@/i18n/types'
import { type FeatureFlags } from '@/lib/store'
import { toast } from 'sonner'
import { TranslationSettings } from '@/components/translation/TranslationSettings'
import { MultiProviderSettings } from '@/components/settings/MultiProviderSettings'
import { usePostHog } from '@/context/PostHogContext'
import { useUpdate } from '@/context/UpdateContext'
import { getVersion } from '@tauri-apps/api/app'

interface SettingsPageProps {
  folderPath: string
  onChangeFolder: () => void
  featureFlags: FeatureFlags
  onUpdateFeatureFlags: (flags: Partial<FeatureFlags>) => Promise<void>
}

export function SettingsPage({ folderPath, onChangeFolder, featureFlags, onUpdateFeatureFlags }: SettingsPageProps) {
  const { t } = useTranslation(['settings', 'common', 'translation'])
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const { isEnabled: analyticsEnabled, enableAnalytics, disableAnalytics, isLoading: analyticsLoading } = usePostHog()
  const { isChecking: isCheckingUpdate, checkForUpdates, updateAvailable } = useUpdate()
  const [appVersion, setAppVersion] = useState<string>('')
  const [mcpCopied, setMcpCopied] = useState(false)
  const [currentPlatform, setCurrentPlatform] = useState<string>('macos')

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

  async function handleFeatureFlagChange(key: keyof FeatureFlags, value: boolean) {
    await onUpdateFeatureFlags({ [key]: value })
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
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="graders-toggle" className={`text-sm font-medium ${!featureFlags.runsEnabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                      {t('settings:experimental.graders')}
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('settings:experimental.gradersDescription')}
                    </p>
                  </div>
                  <Switch
                    id="graders-toggle"
                    checked={featureFlags.gradersEnabled}
                    disabled={!featureFlags.runsEnabled}
                    onCheckedChange={(checked) => handleFeatureFlagChange('gradersEnabled', checked)}
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

            {/* AI Providers */}
            <MultiProviderSettings />

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
