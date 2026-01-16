import { useState, useCallback, useMemo } from 'react'
import type { PromptFile } from '@/types/prompt'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { interpolate } from '@/lib/interpolate'
import { VARIABLE_PATTERN } from '@/lib/constants'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { openUrl } from '@tauri-apps/plugin-opener'
import { toast } from 'sonner'
import { Copy, Check, ChevronDown, ExternalLink } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

interface PromptEditorProps {
  prompt: PromptFile | null
  values: Record<string, unknown>
  isEditMode: boolean
  localTemplate: string
  onLocalTemplateChange: (template: string) => void
  activeVariableKey: string | null
  onActiveVariableChange: (key: string | null) => void
}

export function PromptEditor({
  prompt,
  values,
  isEditMode,
  localTemplate,
  onLocalTemplateChange,
  activeVariableKey,
  onActiveVariableChange,
}: PromptEditorProps) {
  const [copied, setCopied] = useState(false)

  const getInterpolatedContent = useCallback(() => {
    if (!prompt) return ''
    // Use localTemplate when editing, otherwise use saved template
    const template = isEditMode ? localTemplate : prompt.template
    return interpolate(template, values, prompt.variables)
  }, [prompt, values, isEditMode, localTemplate])

  // Render template with highlighted variable values
  const renderHighlightedContent = useMemo(() => {
    if (!prompt) return null

    const template = prompt.template
    // Create a new regex instance to avoid issues with global flag state
    const variablePattern = new RegExp(VARIABLE_PATTERN.source, 'g')
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match

    while ((match = variablePattern.exec(template)) !== null) {
      // Add text before the variable
      if (match.index > lastIndex) {
        parts.push(template.slice(lastIndex, match.index))
      }

      const varKey = match[1]
      const variable = prompt.variables.find((v) => v.key === varKey)
      const value = values[varKey]
      const displayValue = value !== undefined && value !== ''
        ? String(value)
        : variable?.default !== undefined
          ? String(variable.default)
          : `{{${varKey}}}`

      const hasValue = value !== undefined && value !== ''
      const hasDefault = !hasValue && variable?.default !== undefined
      const isActive = activeVariableKey === varKey

      // Add highlighted variable value
      parts.push(
        <Tooltip key={`${varKey}-${match.index}`}>
          <TooltipTrigger asChild>
            <span
              className={`cursor-pointer rounded px-1 py-0.5 transition-all duration-150 font-mono text-sm ${
                isActive
                  ? 'bg-primary-200 text-primary-800 ring-2 ring-primary-400 shadow-sm dark:bg-primary-800/50 dark:text-primary-300 dark:ring-primary-500'
                  : hasValue
                    ? 'bg-primary-100 text-primary-700 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50'
                    : hasDefault
                      ? 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                      : 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
              }`}
              onClick={() => {
                const input = document.getElementById(`var-${varKey}`)
                if (input) {
                  input.focus()
                  input.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
              }}
              onMouseEnter={() => onActiveVariableChange(varKey)}
              onMouseLeave={() => onActiveVariableChange(null)}
            >
              {displayValue}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-mono text-xs">{variable?.label || varKey}</p>
          </TooltipContent>
        </Tooltip>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text after last variable
    if (lastIndex < template.length) {
      parts.push(template.slice(lastIndex))
    }

    return parts
  }, [prompt, values, activeVariableKey, onActiveVariableChange])

  const canCopy = useCallback(() => {
    if (!prompt) return false
    const requiredVars = prompt.variables.filter((v) => v.required)
    return requiredVars.every((v) => {
      const value = values[v.key]
      return value !== undefined && value !== ''
    })
  }, [prompt, values])

  async function handleCopy() {
    const content = getInterpolatedContent()
    await writeText(content)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  // AI app configurations
  const aiApps = [
    {
      name: 'Claude',
      icon: '✨',
      getUrl: (prompt: string) => `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
      supportsDeepLink: true,
    },
    {
      name: 'ChatGPT',
      icon: '💬',
      getUrl: (prompt: string) => `https://chat.openai.com/?q=${encodeURIComponent(prompt)}`,
      supportsDeepLink: true,
    },
    {
      name: 'Perplexity',
      icon: '🔍',
      getUrl: (prompt: string) => `https://www.perplexity.ai/search/?q=${encodeURIComponent(prompt)}`,
      supportsDeepLink: true,
    },
    {
      name: 'Gemini',
      icon: '🌟',
      getUrl: () => 'https://gemini.google.com/app',
      supportsDeepLink: false, // Gemini doesn't support URL query params natively
    },
  ]

  async function handleOpenInApp(app: typeof aiApps[0]) {
    const content = getInterpolatedContent()

    try {
      if (!app.supportsDeepLink) {
        // For apps without deep link support, copy first then open
        await writeText(content)
        await openUrl(app.getUrl(content))
        toast.success(`Copied & opened ${app.name}`, {
          description: 'Paste your prompt to continue',
        })
      } else {
        await openUrl(app.getUrl(content))
        toast.success(`Opened in ${app.name}`)
      }
    } catch (error) {
      console.error(`Failed to open ${app.name}:`, error)
      toast.error(`Failed to open ${app.name}`)
    }
  }

  if (!prompt) {
    return (
      <div className="flex h-full w-[400px] flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-gray-500 dark:text-gray-400">Select a prompt to view</p>
        </div>
      </div>
    )
  }

  if (!prompt.isValid) {
    return (
      <div className="flex h-full w-[400px] flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Prompt
          </h2>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <h3 className="font-medium text-red-600 dark:text-red-400">Parse Errors</h3>
            <ul className="mt-2 space-y-1 text-sm text-red-600 dark:text-red-400">
              {prompt.errors.map((error, i) => (
                <li key={i}>
                  <span className="font-mono text-xs">{error.field}</span>: {error.message}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4">
            <h3 className="mb-2 font-medium text-gray-700 dark:text-gray-300">Raw Content</h3>
            <pre className="overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 shadow-inner dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-200">
              {prompt.rawContent}
            </pre>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-[400px] flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Prompt
        </h2>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {isEditMode ? (
          /* Edit mode - textarea */
          <Textarea
            value={localTemplate}
            onChange={(e) => onLocalTemplateChange(e.target.value)}
            className="min-h-full w-full resize-none rounded-none border-0 bg-transparent p-4 font-mono text-sm focus-visible:ring-0"
            placeholder="Write your prompt template here. Use {{variable}} to add variables."
          />
        ) : (
          /* Preview mode - highlighted content */
          <TooltipProvider delayDuration={200}>
            <pre className="whitespace-pre-wrap p-4 font-mono text-sm text-gray-800 dark:text-gray-200">
              {renderHighlightedContent}
            </pre>
          </TooltipProvider>
        )}
      </div>

      {/* Floating copy section at bottom */}
      <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCopy}
            disabled={!canCopy()}
            className="flex-1 gap-2"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copy
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={!canCopy()}
                size="icon"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs text-gray-500">Open in...</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {aiApps.map((app) => (
                <DropdownMenuItem
                  key={app.name}
                  onClick={() => handleOpenInApp(app)}
                  className="cursor-pointer gap-2"
                >
                  <span>{app.icon}</span>
                  <span>{app.name}</span>
                  <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
