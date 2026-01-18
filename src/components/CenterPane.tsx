import { useState, useCallback } from 'react'
import type { PromptFile, Tag } from '@/types/prompt'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { VariableInputCard } from './VariableInputCard'
import { TagBadge } from './TagBadge'
import { TagSelector } from './TagSelector'
import { interpolate } from '@/lib/interpolate'
import { AVAILABLE_LAUNCHERS, getLaunchersByIds, type Launcher } from '@/lib/launchers'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { openUrl } from '@tauri-apps/plugin-opener'
import { toast } from 'sonner'
import { Copy, Check, ExternalLink, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

interface CenterPaneProps {
  prompt: PromptFile | null
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
}

export function CenterPane({
  prompt,
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
}: CenterPaneProps) {
  const [copied, setCopied] = useState(false)

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
    } catch (error) {
      console.error(`Failed to open ${app.name}:`, error)
      toast.error(`Failed to open ${app.name}`)
    }
  }

  if (!prompt) {
    return (
      <div className="flex h-full flex-1 flex-col bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select a prompt to get started
          </p>
        </div>
      </div>
    )
  }

  if (!prompt.isValid) {
    return (
      <div className="flex h-full flex-1 flex-col bg-gray-100 dark:bg-gray-900">
        <div className="flex-1 p-6">
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

  if (isEditMode) {
    return (
      <div className="flex h-full flex-1 flex-col bg-gray-100 dark:bg-gray-900">
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
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
        </ScrollArea>
      </div>
    )
  }

  // Run mode
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-gray-100 dark:bg-gray-900">
      <ScrollArea className="min-h-0 flex-1 overflow-auto">
        <div className="p-6 space-y-4">
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
      </ScrollArea>

      {/* Action bar */}
      <div className="shrink-0 p-4 pt-0">
        <div className="rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
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
            {/* Copy button */}
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
                  <ExternalLink className="h-3.5 w-3.5" />
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
                  >
                    <MoreHorizontal className="h-4 w-4" />
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
                      <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
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
