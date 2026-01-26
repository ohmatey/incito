import * as React from 'react'
import { cn } from '@/lib/utils'

interface HighlightedTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string
  onValueChange?: (value: string) => void
}

/**
 * Highlights template syntax:
 * - {{variable}} - variable placeholders
 * - {{#if var}}...{{/if}} - conditional blocks
 */
function highlightTemplate(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  // Match variables {{var}}, conditionals {{#if var}}, {{/if}}, {{else}}
  const regex = /(\{\{#if\s+\w+\}\}|\{\{\/if\}\}|\{\{else\}\}|\{\{[^}]+\}\})/g

  let lastIndex = 0
  let match
  let key = 0

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++} className="text-gray-800 dark:text-gray-200">
          {text.slice(lastIndex, match.index)}
        </span>
      )
    }

    const token = match[0]

    // Determine token type and style
    if (token.startsWith('{{#if') || token === '{{/if}}' || token === '{{else}}') {
      // Conditional syntax - amber/orange with background
      parts.push(
        <span
          key={key++}
          className="text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 rounded px-0.5"
        >
          {token}
        </span>
      )
    } else {
      // Variable placeholder - blue with background
      parts.push(
        <span
          key={key++}
          className="text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded px-0.5"
        >
          {token}
        </span>
      )
    }

    lastIndex = regex.lastIndex
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={key++} className="text-gray-800 dark:text-gray-200">
        {text.slice(lastIndex)}
      </span>
    )
  }

  // Handle empty text
  if (parts.length === 0) {
    parts.push(
      <span key={0} className="text-gray-800 dark:text-gray-200">
        {text}
      </span>
    )
  }

  return parts
}

const HighlightedTextarea = React.forwardRef<
  HTMLTextAreaElement,
  HighlightedTextareaProps
>(({ className, value, onChange, onValueChange, ...props }, ref) => {
  const highlightRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Sync scroll position between textarea and highlight layer
  const handleScroll = React.useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [])

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e)
      onValueChange?.(e.target.value)
    },
    [onChange, onValueChange]
  )

  // Combine refs
  React.useImperativeHandle(ref, () => textareaRef.current!, [])

  return (
    <div className="relative">
      {/* Highlight layer - renders behind textarea */}
      <div
        ref={highlightRef}
        aria-hidden="true"
        className={cn(
          'absolute inset-0 overflow-hidden whitespace-pre-wrap break-words font-mono text-sm',
          'pointer-events-none select-none',
          'border border-transparent rounded-md',
          // Match textarea padding
          'px-3 py-2',
          className
        )}
        style={{
          // Ensure same line height and font
          lineHeight: '1.5',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
        }}
      >
        {highlightTemplate(value || '')}
        {/* Add extra space for scrolling alignment */}
        <br />
      </div>

      {/* Actual textarea - transparent text when has value, handles input */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onScroll={handleScroll}
        className={cn(
          'relative w-full rounded-md border bg-transparent font-mono text-sm',
          'caret-gray-900 dark:caret-gray-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'placeholder:text-gray-400 dark:placeholder:text-gray-500',
          'px-3 py-2',
          className
        )}
        style={{
          // Match highlight layer
          lineHeight: '1.5',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          // Make text transparent so highlights show through (only when has content)
          // Placeholder remains visible when empty
          color: value ? 'transparent' : undefined,
          caretColor: 'inherit',
        }}
        {...props}
      />
    </div>
  )
})

HighlightedTextarea.displayName = 'HighlightedTextarea'

export { HighlightedTextarea }
