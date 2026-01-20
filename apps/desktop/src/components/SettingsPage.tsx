import { useState, useEffect } from 'react'
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

const PROVIDER_NAMES: Record<AIProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••'
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`
}

export function SettingsPage({ folderPath, onChangeFolder }: SettingsPageProps) {
  const { theme, setTheme } = useTheme()
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
        toast.success('AI provider configured')
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
        toast.success('AI provider removed')
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
    toast.success('MCP configuration copied')
    setTimeout(() => setMcpCopied(false), 2000)
  }

  async function handleOpenMcpDocs() {
    await openUrl('https://modelcontextprotocol.io/introduction')
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex h-14 items-center border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Settings</h1>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="max-w-2xl space-y-6">
            {/* Appearance */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Appearance</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose your preferred color theme.
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
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Light</span>
                </Label>
                <Label
                  htmlFor="theme-dark"
                  className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer transition-all duration-150 hover:bg-gray-50 [&:has([data-state=checked])]:border-primary-500 [&:has([data-state=checked])]:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:[&:has([data-state=checked])]:bg-primary-900/20"
                >
                  <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                  <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark</span>
                </Label>
                <Label
                  htmlFor="theme-system"
                  className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 cursor-pointer transition-all duration-150 hover:bg-gray-50 [&:has([data-state=checked])]:border-primary-500 [&:has([data-state=checked])]:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:[&:has([data-state=checked])]:bg-primary-900/20"
                >
                  <RadioGroupItem value="system" id="theme-system" className="sr-only" />
                  <Monitor className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">System</span>
                </Label>
              </RadioGroup>
            </div>

            {/* AI Provider */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">AI Provider</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Connect an AI service to power prompt generation and suggestions.
              </p>

              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading settings...
                </div>
              ) : viewMode === 'empty' ? (
                /* Empty State */
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-600 dark:bg-gray-800/50">
                  <Sparkles className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    No AI provider configured
                  </p>
                  <Button
                    onClick={handleStartEditing}
                    variant="outline"
                    className="mt-3"
                  >
                    Configure AI Provider
                  </Button>
                </div>
              ) : viewMode === 'viewing' ? (
                /* Read View */
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Provider
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {savedSettings.provider ? PROVIDER_NAMES[savedSettings.provider] : '—'}
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
                        API Key
                      </p>
                      <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                        {savedSettings.apiKey ? maskApiKey(savedSettings.apiKey) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Model
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
                      Provider
                    </Label>
                    <Select
                      value={editSettings.provider || ''}
                      onValueChange={(value) => handleProviderChange(value as AIProvider)}
                    >
                      <SelectTrigger id="ai-provider" className="w-full">
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* API Key */}
                  {editSettings.provider && (
                    <div className="space-y-2">
                      <Label htmlFor="ai-api-key" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        API Key
                      </Label>
                      <div className="relative">
                        <Input
                          id="ai-api-key"
                          type={showApiKey ? 'text' : 'password'}
                          value={editSettings.apiKey || ''}
                          onChange={(e) =>
                            setEditSettings((prev) => ({ ...prev, apiKey: e.target.value }))
                          }
                          placeholder={`Enter your ${PROVIDER_NAMES[editSettings.provider]} API key`}
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
                        Model
                      </Label>
                      <Select
                        value={editSettings.model || ''}
                        onValueChange={(value) =>
                          setEditSettings((prev) => ({ ...prev, model: value }))
                        }
                      >
                        <SelectTrigger id="ai-model" className="w-full">
                          <SelectValue placeholder="Select a model" />
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
                      Save
                    </Button>
                    <Button variant="outline" onClick={handleCancelEditing} disabled={isSaving}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Prompts Folder */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Prompts Folder</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The folder where your prompt templates are stored.
              </p>
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                <code className="flex-1 text-sm text-gray-600 truncate font-mono dark:text-gray-400">
                  {folderPath}
                </code>
                <Button variant="secondary" onClick={onChangeFolder} className="gap-2 shrink-0">
                  <FolderOpen className="h-4 w-4" />
                  Change Folder
                </Button>
              </div>
            </div>

            {/* MCP Integration */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">MCP Integration</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Connect your prompt library to AI assistants like Claude Desktop, Cursor, and Claude Code via the Model Context Protocol (MCP).
              </p>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Plug className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Claude Desktop Configuration
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Add to <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">{getMcpConfigPath()}</code>
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
                    Available tools: <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">list_prompts</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">get_prompt</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">use_prompt</code>
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleOpenMcpDocs}
                    className="h-auto p-0 text-xs gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Documentation
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
