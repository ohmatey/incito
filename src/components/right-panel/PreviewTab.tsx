import { useMemo } from 'react'
import type { PromptFile } from '@/types/prompt'
import { ScrollArea } from '@/components/ui/scroll-area'
import { VARIABLE_PATTERN } from '@/lib/constants'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PreviewTabProps {
  prompt: PromptFile | null
  values: Record<string, unknown>
  activeVariableKey: string | null
  onActiveVariableChange: (key: string | null) => void
}

export function PreviewTab({
  prompt,
  values,
  activeVariableKey,
  onActiveVariableChange,
}: PreviewTabProps) {
  // Render template with highlighted variable values
  const renderHighlightedContent = useMemo(() => {
    if (!prompt) return null

    const template = prompt.template
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

  if (!prompt) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Select a prompt to preview</p>
      </div>
    )
  }

  if (!prompt.isValid) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-red-500 dark:text-red-400">Cannot preview - template has errors</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <TooltipProvider delayDuration={200}>
        <pre className="whitespace-pre-wrap p-4 font-mono text-sm text-gray-800 dark:text-gray-200">
          {renderHighlightedContent}
        </pre>
      </TooltipProvider>
    </ScrollArea>
  )
}
