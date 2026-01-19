import { useState, useCallback, useEffect } from 'react'
import type { PromptFile, Tag } from '@/types/prompt'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { VariableInputCard } from './VariableInputCard'
import { TagBadge } from './TagBadge'
import { TagSelector } from './TagSelector'
import { interpolate } from '@/lib/interpolate'
import { AVAILABLE_LAUNCHERS, getLaunchersByIds, type Launcher } from '@/lib/launchers'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { openUrl } from '@tauri-apps/plugin-opener'
import { toast } from 'sonner'
import { Copy, Check, ExternalLink, MoreHorizontal, Pin, FileText, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

interface CenterPaneProps {
  prompt: PromptFile | null
  prompts: PromptFile[]
  pinnedPromptIds: string[]
  values: Record<string, unknown>
  isEditMode: boolean
  localName: string
  localDescription: string
  localTemplate: string
  localTags: string[]
  nameError: string | null
  tags: Tag[]
  activeVariableKey: string | null
  onValueChange: (key: string, value: unknown) => void
  onActiveVariableChange: (key: string | null) => void
  onLocalNameChange: (name: string) => void
  onLocalDescriptionChange: (description: string) => void
  onLocalTemplateChange: (template: string) => void
  onLocalTagsChange: (tags: string[]) => void
  onCreateTag: (name: string, color: string) => void
  onSelectPrompt: (prompt: PromptFile) => void
  onPromptCompleted?: () => void
}

export function CenterPane({
  prompt,
  prompts,
  pinnedPromptIds,
  values,
  isEditMode,
  localName,
  localDescription,
  localTemplate,
  localTags,
  nameError,
  tags,
  activeVariableKey,
  onValueChange,
  onActiveVariableChange,
  onLocalNameChange,
  onLocalDescriptionChange,
  onLocalTemplateChange,
  onLocalTagsChange,
  onCreateTag,
  onSelectPrompt,
  onPromptCompleted,
}: CenterPaneProps) {
  const [copied, setCopied] = useState(false)

  // Keyboard navigation between variables (Cmd/Ctrl+Shift+Up/Down)
  useEffect(() => {
    if (!prompt || isEditMode || prompt.variables.length === 0) return

    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey
      if (!isMod || !e.shiftKey) return
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return

      e.preventDefault()

      const variables = prompt!.variables
      const currentIndex = activeVariableKey
        ? variables.findIndex((v) => v.key === activeVariableKey)
        : -1

      let nextIndex: number
      if (e.key === 'ArrowUp') {
        nextIndex = currentIndex <= 0 ? variables.length - 1 : currentIndex - 1
      } else {
        nextIndex = currentIndex >= variables.length - 1 ? 0 : currentIndex + 1
      }

      const nextVariable = variables[nextIndex]
      onActiveVariableChange(nextVariable.key)

      // Focus the input element
      const inputId = `var-${nextVariable.key}`
      const inputEl = document.getElementById(inputId) as HTMLElement | null
      if (inputEl) {
        inputEl.focus()
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [prompt, isEditMode, activeVariableKey, onActiveVariableChange])

  // Keyboard shortcut for copy (Cmd/Ctrl+Enter)
  useEffect(() => {
    if (!prompt || isEditMode || !prompt.isValid) return

    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key === 'Enter') {
        e.preventDefault()
        // Check if all required fields are filled
        const requiredVars = prompt!.variables.filter((v) => v.required)
        const allFilled = requiredVars.every((v) => {
          const value = values[v.key]
          if (v.type === 'slider') return true
          return value !== undefined && value !== ''
        })
        if (allFilled) {
          // Trigger copy
          const content = interpolate(prompt!.template, values, prompt!.variables)
          writeText(content).then(() => {
            setCopied(true)
            toast.success('Copied to clipboard')
            setTimeout(() => setCopied(false), 2000)
            onPromptCompleted?.()
          })
        } else {
          toast.error('Fill all required fields first')
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [prompt, isEditMode, values, onPromptCompleted])

  // Get Tag objects for display from tag names
  const promptTagObjects = localTags
    .map((name) => tags.find((t) => t.name === name))
    .filter((t): t is Tag => t !== undefined)

  function handleTagToggle(tagName: string) {
    if (localTags.includes(tagName)) {
      onLocalTagsChange(localTags.filter((t) => t !== tagName))
    } else {
      onLocalTagsChange([...localTags, tagName])
    }
  }

  function handleTagRemove(tagName: string) {
    onLocalTagsChange(localTags.filter((t) => t !== tagName))
  }

  function handleCreateTag(name: string, color: string) {
    onCreateTag(name, color)
    onLocalTagsChange([...localTags, name])
  }

  const getInterpolatedContent = useCallback(() => {
    if (!prompt) return ''
    return interpolate(prompt.template, values, prompt.variables)
  }, [prompt, values])

  const getCompletionStatus = useCallback(() => {
    if (!prompt) return { filled: 0, total: 0, ready: false }
    const requiredVars = prompt.variables.filter((v) => v.required)
    const filledVars = requiredVars.filter((v) => {
      const value = values[v.key]
      // Sliders always have a value (either set, default, or min), so they're always "filled"
      if (v.type === 'slider') {
        return true
      }
      return value !== undefined && value !== ''
    })
    return {
      filled: filledVars.length,
      total: requiredVars.length,
      ready: filledVars.length === requiredVars.length,
    }
  }, [prompt, values])

  const completionStatus = getCompletionStatus()
  const canCopy = useCallback(() => completionStatus.ready, [completionStatus.ready])

  async function handleCopy() {
    const content = getInterpolatedContent()
    await writeText(content)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
    onPromptCompleted?.()
  }

  // Get default launchers for this prompt
  const defaultLaunchers = getLaunchersByIds(prompt?.defaultLaunchers ?? [])

  async function handleOpenInApp(app: Launcher) {
    const content = getInterpolatedContent()

    try {
      if (!app.supportsDeepLink) {
        await writeText(content)
        await openUrl(app.getUrl(content))
        toast.success(`Copied & opened ${app.name}`, {
          description: 'Paste your prompt to continue',
        })
      } else {
        await openUrl(app.getUrl(content))
        toast.success(`Opened in ${app.name}`)
      }
      onPromptCompleted?.()
    } catch (error) {
      console.error(`Failed to open ${app.name}:`, error)
      toast.error(`Failed to open ${app.name}`)
    }
  }

  if (!prompt) {
    const pinnedPrompts = prompts.filter((p) => pinnedPromptIds.includes(p.id))
    const hasPrompts = prompts.length > 0

    return (
      <div className="flex h-full flex-1 flex-col bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          {hasPrompts ? (
            <>
              {pinnedPrompts.length > 0 && (
                <div className="mb-8 w-full max-w-md">
                  <h3 className="mb-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                    Pinned Prompts
                  </h3>
                  <div className="grid gap-2">
                    {pinnedPrompts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onSelectPrompt(p)}
                        className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-700"
                      >
                        <Pin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-gray-900 dark:text-gray-100">
                            {p.name}
                          </div>
                          {p.description && (
                            <div className="truncate text-sm text-gray-500 dark:text-gray-400">
                              {p.description}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select a prompt to get started
              </p>
            </>
          ) : (
            <div className="w-full max-w-md">
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
                  <FileText className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Create your first prompt
                </h3>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                  Prompts are reusable templates with variables. Create one to get started with organizing your AI workflows.
                </p>
                <Button
                  onClick={() => {
                    // Trigger new prompt dialog via keyboard shortcut simulation
                    const event = new KeyboardEvent('keydown', {
                      key: 'n',
                      metaKey: true,
                      bubbles: true,
                    })
                    document.dispatchEvent(event)
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Prompt
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!prompt.isValid) {
    return (
      <div className="flex h-full flex-1 flex-col bg-gray-100 dark:bg-gray-900">
        <div className="flex-1 p-6">
          <div className="mx-auto max-w-2xl space-y-4">
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
            <div>
              <h3 className="mb-2 font-medium text-gray-700 dark:text-gray-300">Raw Content</h3>
              <pre className="overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 shadow-inner dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-200">
                {prompt.rawContent}
              </pre>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isEditMode) {
    return (
      <div className="flex h-full flex-1 flex-col bg-gray-100 dark:bg-gray-900">
        <ScrollArea className="flex-1">
          <div className="p-6">
            <div className="mx-auto max-w-2xl space-y-4">
            {/* Name input */}
            <div>
              <Input
                value={localName}
                onChange={(e) => onLocalNameChange(e.target.value)}
                className={`border-gray-200 bg-white text-lg font-semibold dark:border-gray-700 dark:bg-gray-800 ${
                  nameError
                    ? 'text-red-500 dark:text-red-400 border-red-300 dark:border-red-600'
                    : 'text-gray-800 dark:text-gray-100'
                }`}
                placeholder="Prompt name"
              />
              {nameError && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">{nameError}</p>
              )}
            </div>

            {/* Description input */}
            <div>
              <Textarea
                value={localDescription}
                onChange={(e) => onLocalDescriptionChange(e.target.value)}
                className="min-h-[60px] resize-none border-gray-200 bg-white text-sm dark:border-gray-700 dark:bg-gray-800"
                placeholder="Add a description..."
              />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              {promptTagObjects.map((tag) => (
                <TagBadge
                  key={tag.id}
                  tag={tag}
                  onRemove={() => handleTagRemove(tag.name)}
                />
              ))}
              <TagSelector
                tags={tags}
                selectedTagNames={localTags}
                onTagToggle={handleTagToggle}
                onCreateTag={handleCreateTag}
              />
            </div>

            {/* Template editor */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Template
              </label>
              <Textarea
                value={localTemplate}
                onChange={(e) => onLocalTemplateChange(e.target.value)}
                className="min-h-[300px] w-full resize-y border-gray-200 bg-white font-mono text-sm dark:border-gray-700 dark:bg-gray-800"
                placeholder="Write your prompt template here. Use {{variable}} to add variables."
              />
            </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    )
  }

  // Run mode
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-gray-100 dark:bg-gray-900">
      <ScrollArea className="min-h-0 flex-1 overflow-auto">
        <div className="p-6">
          <div className="mx-auto max-w-2xl space-y-4">
          {/* Description */}
          {prompt.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {prompt.description}
            </p>
          )}

          {/* Tags */}
          {promptTagObjects.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {promptTagObjects.map((tag) => (
                <TagBadge key={tag.id} tag={tag} />
              ))}
            </div>
          )}

          {/* Variable inputs */}
          <div className="space-y-3 pt-2">
            {prompt.variables.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No variables defined. Add {"{{variableName}}"} in the template.
              </p>
            ) : (
              prompt.variables.map((variable) => (
                <VariableInputCard
                  key={variable.key}
                  variable={variable}
                  value={values[variable.key]}
                  isActive={activeVariableKey === variable.key}
                  onValueChange={(value) => onValueChange(variable.key, value)}
                  onActiveChange={(active) => onActiveVariableChange(active ? variable.key : null)}
                />
              ))
            )}
          </div>
          </div>
        </div>
      </ScrollArea>

      {/* Action bar */}
      <div className="shrink-0 px-6 pb-6">
        <div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {/* Status bar - only show when there are required variables */}
          {completionStatus.total > 0 && (
            <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-700">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className={`h-full transition-all duration-300 ${
                        completionStatus.ready
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${(completionStatus.filled / completionStatus.total) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                    {completionStatus.filled}/{completionStatus.total}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 p-2">
            {/* Copy button with tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={!canCopy() ? 0 : undefined}>
                    <Button
                      onClick={handleCopy}
                      disabled={!canCopy()}
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copied' : 'Copy Prompt'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canCopy() && (
                  <TooltipContent>
                    <p>Fill all required fields to continue</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <div className="flex-1" />

            {/* Launcher buttons - only show configured quick launch options */}
            <div className="flex items-center gap-1.5">
              {defaultLaunchers.map((launcher) => (
                <Button
                  key={launcher.id}
                  onClick={() => handleOpenInApp(launcher)}
                  disabled={!canCopy()}
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                >
                  {launcher.name}
                  <ExternalLink className="h-4 w-4" />
                </Button>
              ))}

              {/* All launchers menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!canCopy()}
                    size="sm"
                    className="px-2"
                    aria-label="More launch options"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Launch In</DropdownMenuLabel>
                  {AVAILABLE_LAUNCHERS.map((launcher) => (
                    <DropdownMenuItem
                      key={launcher.id}
                      onClick={() => handleOpenInApp(launcher)}
                      className="cursor-pointer"
                    >
                      <span>{launcher.name}</span>
                      <ExternalLink className="ml-auto h-4 w-4 opacity-50" />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
