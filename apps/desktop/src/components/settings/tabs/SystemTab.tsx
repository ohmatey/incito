import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { FlaskConical, Download, Loader2, RefreshCw, Check, Copy, ExternalLink, Plug } from 'lucide-react'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { openUrl } from '@tauri-apps/plugin-opener'
import { platform } from '@tauri-apps/plugin-os'
import { getVersion } from '@tauri-apps/api/app'
import { useUpdate } from '@/context/UpdateContext'
import { toast } from 'sonner'
import type { FeatureFlags } from '@/lib/store'

interface SystemTabProps {
  featureFlags: FeatureFlags
  onUpdateFeatureFlags: (flags: Partial<FeatureFlags>) => Promise<void>
}

export function SystemTab({ featureFlags, onUpdateFeatureFlags }: SystemTabProps) {
  const { t } = useTranslation(['settings', 'common'])
  const { isChecking: isCheckingUpdate, checkForUpdates, updateAvailable } = useUpdate()
  const [appVersion, setAppVersion] = useState<string>('')
  const [mcpCopied, setMcpCopied] = useState(false)
  const [currentPlatform, setCurrentPlatform] = useState<string>('macos')

  useEffect(() => {
    const p = platform()
    if (p === 'macos') setCurrentPlatform('macos')
    else if (p === 'windows') setCurrentPlatform('windows')
    else setCurrentPlatform('linux')
  }, [])

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion(''))
  }, [])

  async function handleFeatureFlagChange(key: keyof FeatureFlags, value: boolean) {
    await onUpdateFeatureFlags({ [key]: value })
  }

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
    <div className="space-y-6">
      {/* Experimental Features */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('settings:experimental.title')}
          </h3>
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
              <Label
                htmlFor="graders-toggle"
                className={`text-sm font-medium ${!featureFlags.runsEnabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}
              >
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
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="playbooks-toggle"
                className={`text-sm font-medium ${!featureFlags.runsEnabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}
              >
                {t('settings:experimental.playbooks')}
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('settings:experimental.playbooksDescription')}
              </p>
            </div>
            <Switch
              id="playbooks-toggle"
              checked={featureFlags.playbooksEnabled}
              disabled={!featureFlags.runsEnabled}
              onCheckedChange={(checked) => handleFeatureFlagChange('playbooksEnabled', checked)}
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
                {appVersion || '\u2014'}
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

      {/* MCP Integration - only show when MCP feature is enabled */}
      {featureFlags.mcpServerEnabled && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('settings:mcp.title')}
          </h3>
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
                {t('settings:mcp.addTo')}{' '}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
                  {getMcpConfigPath()}
                </code>
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
                {t('settings:mcp.availableTools')}{' '}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">list_prompts</code>,{' '}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">get_prompt</code>,{' '}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">use_prompt</code>
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
  )
}
