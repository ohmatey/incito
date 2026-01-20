import { useMemo } from 'react'
import type { PromptFile, Variable } from '@/types/prompt'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Plus } from 'lucide-react'
import { getVariantFamily } from '@/lib/prompts'

interface PreviewTabProps {
  prompt: PromptFile | null
  allPrompts: PromptFile[]
  values: Record<string, unknown>
  activeVariableKey: string | null
  onActiveVariableChange: (key: string | null) => void
  onSelectVariant?: (prompt: PromptFile) => void
  onNewVariant?: () => void
}

// Token types for template parsing
type Token =
  | { type: 'text'; content: string }
  | { type: 'variable'; key: string }
  | { type: 'block_start'; helper: string; key: string; inverted?: boolean; comparison?: { op: string; value: string } }
  | { type: 'block_else' }
  | { type: 'block_end' }

// Parse template into tokens
function tokenizeTemplate(template: string): Token[] {
  const tokens: Token[] = []
  // Match: {{#helper key}}, {{else}}, {{/helper}}, {{variable}}, {{#if (helper var ...)}}}
  const regex = /\{\{(#(?:if|unless|each|with)\s+(?:\([^)]+\)|[\w-]+)|else|\/(?:if|unless|each|with)|[\w-]+)\}\}/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(template)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', content: template.slice(lastIndex, match.index) })
    }

    const content = match[1]

    if (content === 'else') {
      tokens.push({ type: 'block_else' })
    } else if (content.startsWith('/')) {
      tokens.push({ type: 'block_end' })
    } else if (content.startsWith('#')) {
      // Parse block helper: #if key or #if (eq key "value")
      // First try to match comparison helper: #if (op key "value")
      const comparisonMatch = content.match(/^#(if|unless)\s+\((eq|ne|gt|gte|lt|lte)\s+([\w-]+)\s+["']([^"']+)["']\)/)
      if (comparisonMatch) {
        tokens.push({
          type: 'block_start',
          helper: comparisonMatch[1],
          key: comparisonMatch[3],
          inverted: comparisonMatch[1] === 'unless',
          comparison: { op: comparisonMatch[2], value: comparisonMatch[4] },
        })
      } else {
        // Simple block helper: #if key
        const blockMatch = content.match(/^#(if|unless|each|with)\s+([\w-]+)/)
        if (blockMatch) {
          tokens.push({
            type: 'block_start',
            helper: blockMatch[1],
            key: blockMatch[2],
            inverted: blockMatch[1] === 'unless',
          })
        }
      }
    } else {
      // Simple variable
      tokens.push({ type: 'variable', key: content })
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < template.length) {
    tokens.push({ type: 'text', content: template.slice(lastIndex) })
  }

  return tokens
}

// Check if a value is truthy for Handlebars
function isTruthy(value: unknown): boolean {
  if (value === undefined || value === null || value === false || value === '') return false
  if (Array.isArray(value)) return value.length > 0
  return true
}

// Get display value for a variable
function getDisplayValue(
  key: string,
  values: Record<string, unknown>,
  variables: Variable[]
): { value: string; hasValue: boolean; hasDefault: boolean } {
  const variable = variables.find(v => v.key === key)
  const rawValue = values[key]

  if (rawValue !== undefined && rawValue !== '' && (!Array.isArray(rawValue) || rawValue.length > 0)) {
    return { value: String(rawValue), hasValue: true, hasDefault: false }
  }
  if (variable?.default !== undefined) {
    return { value: String(variable.default), hasValue: false, hasDefault: true }
  }
  return { value: `{{${key}}}`, hasValue: false, hasDefault: false }
}

interface RenderContext {
  values: Record<string, unknown>
  variables: Variable[]
  activeVariableKey: string | null
  onActiveVariableChange: (key: string | null) => void
  keyCounter: { current: number }
}

// Recursively render tokens
function renderTokens(
  tokens: Token[],
  ctx: RenderContext,
  startIndex: number = 0
): { elements: React.ReactNode[]; endIndex: number } {
  const elements: React.ReactNode[] = []
  let i = startIndex

  while (i < tokens.length) {
    const token = tokens[i]

    if (token.type === 'text') {
      elements.push(token.content)
      i++
    } else if (token.type === 'variable') {
      const { value, hasValue, hasDefault } = getDisplayValue(token.key, ctx.values, ctx.variables)
      const variable = ctx.variables.find(v => v.key === token.key)
      const isActive = ctx.activeVariableKey === token.key
      const key = ctx.keyCounter.current++

      elements.push(
        <Tooltip key={key}>
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
                const input = document.getElementById(`var-${token.key}`)
                if (input) {
                  input.focus()
                  input.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
              }}
              onMouseEnter={() => ctx.onActiveVariableChange(token.key)}
              onMouseLeave={() => ctx.onActiveVariableChange(null)}
            >
              {value}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-mono text-xs">{variable?.label || token.key}</p>
          </TooltipContent>
        </Tooltip>
      )
      i++
    } else if (token.type === 'block_start') {
      // Find the matching end and optional else
      const rawValue = ctx.values[token.key]

      // Evaluate condition - handle comparison helpers
      let conditionResult: boolean
      if (token.comparison) {
        const { op, value } = token.comparison
        const strValue = String(rawValue ?? '')
        switch (op) {
          case 'eq': conditionResult = strValue === value; break
          case 'ne': conditionResult = strValue !== value; break
          case 'gt': conditionResult = Number(rawValue) > Number(value); break
          case 'gte': conditionResult = Number(rawValue) >= Number(value); break
          case 'lt': conditionResult = Number(rawValue) < Number(value); break
          case 'lte': conditionResult = Number(rawValue) <= Number(value); break
          default: conditionResult = isTruthy(rawValue)
        }
      } else {
        conditionResult = isTruthy(rawValue)
      }
      const isConditionTrue = token.inverted ? !conditionResult : conditionResult
      const variable = ctx.variables.find(v => v.key === token.key)
      const isActive = ctx.activeVariableKey === token.key
      const blockKey = ctx.keyCounter.current++

      // Collect content until block_end, handling else
      i++
      const mainContent = renderTokens(tokens, ctx, i)
      i = mainContent.endIndex

      let elseContent: { elements: React.ReactNode[]; endIndex: number } | null = null
      if (tokens[i]?.type === 'block_else') {
        i++
        elseContent = renderTokens(tokens, ctx, i)
        i = elseContent.endIndex
      }

      // Skip the block_end token
      if (tokens[i]?.type === 'block_end') {
        i++
      }

      // Render the block with visual indicator
      const activeContent = isConditionTrue ? mainContent.elements : (elseContent?.elements || [])
      const hasContent = activeContent.length > 0 &&
        !(activeContent.length === 1 && typeof activeContent[0] === 'string' && !activeContent[0].trim())

      elements.push(
        <Tooltip key={blockKey}>
          <TooltipTrigger asChild>
            <span
              className={`relative cursor-pointer transition-all duration-150 ${
                isActive
                  ? 'ring-2 ring-primary-400 rounded'
                  : ''
              }`}
              onClick={() => {
                const input = document.getElementById(`var-${token.key}`)
                if (input) {
                  input.focus()
                  input.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
              }}
              onMouseEnter={() => ctx.onActiveVariableChange(token.key)}
              onMouseLeave={() => ctx.onActiveVariableChange(null)}
            >
              {hasContent && (
                <span
                  className={`border-l-2 pl-1 ${
                    isConditionTrue
                      ? 'border-green-400 dark:border-green-500'
                      : 'border-orange-300 dark:border-orange-500'
                  }`}
                >
                  {activeContent}
                </span>
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-mono text-xs">
              {token.comparison
                ? `${token.helper} ${token.comparison.op}(${variable?.label || token.key}, "${token.comparison.value}"): ${isConditionTrue ? 'showing' : 'hidden'}`
                : `${token.helper} ${variable?.label || token.key}: ${isConditionTrue ? 'showing' : 'hidden'}`
              }
            </p>
          </TooltipContent>
        </Tooltip>
      )
    } else if (token.type === 'block_else' || token.type === 'block_end') {
      // These signal end of current block content
      break
    }
  }

  return { elements, endIndex: i }
}

export function PreviewTab({
  prompt,
  allPrompts,
  values,
  activeVariableKey,
  onActiveVariableChange,
  onSelectVariant,
  onNewVariant,
}: PreviewTabProps) {

  // Get variant family for this prompt
  const variantFamily = useMemo(() => {
    if (!prompt) return []
    return getVariantFamily(prompt, allPrompts)
  }, [prompt, allPrompts])

  const hasVariants = variantFamily.length > 1

  // Get display label for a prompt in the variant family
  const getVariantLabel = (p: PromptFile, index: number) => {
    if (index === 0 && !p.variantOf) {
      return 'Original'
    }
    const match = p.name.match(/\(([^)]+)\)$/)
    if (match) return match[1]
    const fileMatch = p.fileName.match(/--([^.]+)\.md$/)
    if (fileMatch) {
      return fileMatch[1]
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }
    return p.name
  }

  // Render template with highlighted variables and conditional blocks
  const renderHighlightedContent = useMemo(() => {
    if (!prompt) return null

    const tokens = tokenizeTemplate(prompt.template)
    const ctx: RenderContext = {
      values,
      variables: prompt.variables,
      activeVariableKey,
      onActiveVariableChange,
      keyCounter: { current: 0 },
    }

    const { elements } = renderTokens(tokens, ctx)
    return elements
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
    <div className="flex h-full flex-col">
      {/* Variant Bar */}
      <div className="shrink-0 border-b border-gray-200 px-3 py-1.5 dark:border-gray-700">
        <div className="flex items-center gap-1.5">
          {/* Variant Selector */}
          {hasVariants && onSelectVariant ? (
            <Select
              value={prompt.id}
              onValueChange={(value) => {
                const selected = variantFamily.find(p => p.id === value)
                if (selected) onSelectVariant(selected)
              }}
            >
              <SelectTrigger className="h-7 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {variantFamily.map((p, index) => (
                  <SelectItem key={p.id} value={p.id}>
                    {getVariantLabel(p, index)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="flex-1 text-xs text-gray-600 dark:text-gray-400">
              {hasVariants ? getVariantLabel(prompt, variantFamily.indexOf(prompt)) : 'Original'}
            </span>
          )}

          {/* New Variant Button */}
          {onNewVariant && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={onNewVariant}
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </Button>
          )}
        </div>
      </div>

      {/* Preview Content */}
      <ScrollArea className="flex-1">
        <TooltipProvider delayDuration={200}>
          <pre className="whitespace-pre-wrap p-4 font-mono text-sm text-gray-800 dark:text-gray-200">
            {renderHighlightedContent}
          </pre>
        </TooltipProvider>
      </ScrollArea>
    </div>
  )
}
