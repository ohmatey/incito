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
import { FolderOpen, Sun, Moon, Monitor, Eye, EyeOff, Check, Loader2 } from 'lucide-react'
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

export function SettingsPage({ folderPath, onChangeFolder }: SettingsPageProps) {
  const { theme, setTheme } = useTheme()
  const [aiSettings, setAiSettings] = useState<AISettings>({
    provider: null,
    apiKey: null,
    model: null,
  })
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load AI settings on mount
  useEffect(() => {
    async function loadSettings() {
      const result = await getAISettings()
      if (result.ok) {
        setAiSettings(result.data)
      } else {
        toast.error(result.error)
      }
      setIsLoading(false)
    }
    loadSettings()
  }, [])

  async function handleProviderChange(provider: AIProvider) {
    // Get default model for the new provider
    const defaultModel = AI_MODELS[provider][0]?.id || null
    setAiSettings((prev) => ({ ...prev, provider, model: defaultModel }))
  }

  async function handleSaveAISettings() {
    setIsSaving(true)
    try {
      const result = await saveAISettings(aiSettings)
      if (result.ok) {
        toast.success('AI settings saved')
      } else {
        toast.error(result.error)
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleClearAISettings() {
    setIsSaving(true)
    try {
      const result = await saveAISettings({
        provider: null,
        apiKey: null,
        model: null,
      })
      if (result.ok) {
        setAiSettings({ provider: null, apiKey: null, model: null })
        toast.success('AI settings cleared')
      } else {
        toast.error(result.error)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = aiSettings.provider !== null || aiSettings.apiKey !== null

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
                Configure an AI provider to generate prompt templates with AI assistance.
              </p>

              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading settings...
                </div>
              ) : (
                <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  {/* Provider Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="ai-provider" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Provider
                    </Label>
                    <Select
                      value={aiSettings.provider || ''}
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
                  {aiSettings.provider && (
                    <div className="space-y-2">
                      <Label htmlFor="ai-api-key" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        API Key
                      </Label>
                      <div className="relative">
                        <Input
                          id="ai-api-key"
                          type={showApiKey ? 'text' : 'password'}
                          value={aiSettings.apiKey || ''}
                          onChange={(e) =>
                            setAiSettings((prev) => ({ ...prev, apiKey: e.target.value }))
                          }
                          placeholder={`Enter your ${aiSettings.provider === 'openai' ? 'OpenAI' : aiSettings.provider === 'anthropic' ? 'Anthropic' : 'Google'} API key`}
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
                  {aiSettings.provider && aiSettings.apiKey && (
                    <div className="space-y-2">
                      <Label htmlFor="ai-model" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Model
                      </Label>
                      <Select
                        value={aiSettings.model || ''}
                        onValueChange={(value) =>
                          setAiSettings((prev) => ({ ...prev, model: value }))
                        }
                      >
                        <SelectTrigger id="ai-model" className="w-full">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {AI_MODELS[aiSettings.provider].map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Save/Clear Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleSaveAISettings}
                      disabled={isSaving || !aiSettings.provider || !aiSettings.apiKey}
                      className="gap-2"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Save
                    </Button>
                    {hasChanges && (
                      <Button variant="outline" onClick={handleClearAISettings} disabled={isSaving}>
                        Clear
                      </Button>
                    )}
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
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
