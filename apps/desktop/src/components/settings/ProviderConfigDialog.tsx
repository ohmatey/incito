import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Eye, EyeOff, Terminal, Search, Play, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { ProviderConfig, AIProvider } from '@/lib/store'
import { AI_MODELS } from '@/lib/store'
import { findClaudeCodePath, ensureClaudeCodeServer, checkClaudeCodeAuth, generateWithClaudeCode } from '@/lib/claude-code-client'

interface ProviderConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: ProviderConfig | null
  onSave: (config: Omit<ProviderConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  isEditing: boolean
}

const PROVIDER_OPTIONS: { value: AIProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google AI' },
  { value: 'claude-code', label: 'Claude Code' },
]

function getDefaultAlias(provider: AIProvider): string {
  switch (provider) {
    case 'openai': return 'OpenAI'
    case 'anthropic': return 'Anthropic'
    case 'google': return 'Google AI'
    case 'claude-code': return 'Claude Code'
    default: return 'AI Provider'
  }
}

function getDefaultModel(provider: AIProvider): string {
  return AI_MODELS[provider]?.[0]?.id ?? ''
}

export function ProviderConfigDialog({
  open,
  onOpenChange,
  config,
  onSave,
  isEditing,
}: ProviderConfigDialogProps) {
  const { t } = useTranslation(['settings', 'common'])

  const [alias, setAlias] = useState('')
  const [provider, setProvider] = useState<AIProvider | ''>('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [claudeCodePath, setClaudeCodePath] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isFindingPath, setIsFindingPath] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [pathCheckResult, setPathCheckResult] = useState<{ valid: boolean; version?: string } | null>(null)
  const [testResult, setTestResult] = useState<{ success: boolean; response?: string; error?: string } | null>(null)

  // Reset form when dialog opens/closes or config changes
  useEffect(() => {
    if (open && config) {
      setAlias(config.alias)
      setProvider(config.provider)
      setApiKey(config.apiKey ?? '')
      setModel(config.model)
      setClaudeCodePath(config.claudeCodeExecutablePath ?? '')
      setIsDefault(config.isDefault)
    } else if (open && !config) {
      // New config
      setAlias('')
      setProvider('')
      setApiKey('')
      setModel('')
      setClaudeCodePath('')
      setIsDefault(false)
    }
    setShowApiKey(false)
    setPathCheckResult(null)
    setTestResult(null)
  }, [open, config])

  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider)
    if (!alias || alias === getDefaultAlias(provider as AIProvider)) {
      setAlias(getDefaultAlias(newProvider))
    }
    setModel(getDefaultModel(newProvider))
    setApiKey('')
    setClaudeCodePath('')
    setPathCheckResult(null)
    setTestResult(null)
  }

  const handleFindClaudeCodePath = async () => {
    setIsFindingPath(true)
    setPathCheckResult(null)

    try {
      const result = await findClaudeCodePath()
      if (result?.found && result?.path) {
        setClaudeCodePath(result.path)
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
  }

  const handleTestClaudeCodeConnection = async () => {
    setIsTestingConnection(true)
    setTestResult(null)

    try {
      const serverStarted = await ensureClaudeCodeServer(claudeCodePath || null)
      if (!serverStarted) {
        throw new Error(t('settings:aiProvider.claudeCodeTest.serverFailed'))
      }

      const authStatus = await checkClaudeCodeAuth()
      if (!authStatus.authenticated) {
        throw new Error(t('settings:aiProvider.claudeCodeTest.notAuthenticated'))
      }

      const response = await generateWithClaudeCode('Tell me a one-liner joke about coding.', {
        model: (model as 'opus' | 'sonnet' | 'haiku') || 'sonnet'
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

  const handleSave = async () => {
    if (!provider || !alias.trim() || !model) return
    if (provider !== 'claude-code' && !apiKey.trim()) return

    setIsSaving(true)
    try {
      await onSave({
        alias: alias.trim(),
        provider,
        apiKey: provider === 'claude-code' ? null : apiKey.trim(),
        model,
        claudeCodeExecutablePath: provider === 'claude-code' ? (claudeCodePath || null) : null,
        isDefault,
      })
      onOpenChange(false)
    } catch {
      toast.error(t('settings:providers.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const canSave =
    provider &&
    alias.trim() &&
    model &&
    (provider === 'claude-code' || apiKey.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('settings:providers.editProvider') : t('settings:providers.addProvider')}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('settings:providers.editDescription')
              : t('settings:providers.addDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Alias */}
          <div className="space-y-2">
            <Label htmlFor="alias">{t('settings:providers.alias')}</Label>
            <Input
              id="alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder={t('settings:providers.aliasPlaceholder')}
            />
          </div>

          {/* Provider */}
          <div className="space-y-2">
            <Label htmlFor="provider">{t('settings:aiProvider.provider')}</Label>
            <Select
              value={provider}
              onValueChange={(value) => handleProviderChange(value as AIProvider)}
            >
              <SelectTrigger id="provider">
                <SelectValue placeholder={t('settings:aiProvider.selectProvider')} />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Claude Code CLI Auth Info */}
          {provider === 'claude-code' && (
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

              {/* Claude Code Executable Path */}
              <div className="space-y-2">
                <Label htmlFor="claude-code-path">
                  {t('settings:aiProvider.claudeCodePath.label')}
                </Label>
                <div className="relative">
                  <Input
                    id="claude-code-path"
                    value={claudeCodePath}
                    onChange={(e) => {
                      setClaudeCodePath(e.target.value)
                      setPathCheckResult(null)
                      setTestResult(null)
                    }}
                    placeholder={t('settings:aiProvider.claudeCodePath.placeholder')}
                    className={`font-mono text-sm pr-8 ${pathCheckResult ? (pathCheckResult.valid ? 'border-green-500' : 'border-red-500') : ''}`}
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
          {provider && provider !== 'claude-code' && (
            <div className="space-y-2">
              <Label htmlFor="api-key">{t('settings:aiProvider.apiKey')}</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t('settings:aiProvider.enterApiKey', { provider: PROVIDER_OPTIONS.find(p => p.value === provider)?.label })}
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
          {provider && (provider === 'claude-code' || apiKey) && (
            <div className="space-y-2">
              <Label htmlFor="model">{t('settings:aiProvider.model')}</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="model">
                  <SelectValue placeholder={t('settings:aiProvider.selectModel')} />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS[provider]?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Set as Default */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is-default">{t('settings:providers.setAsDefault')}</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('settings:providers.defaultDescription')}
              </p>
            </div>
            <Switch
              id="is-default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t('common:buttons.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common:buttons.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
