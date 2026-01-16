import { useState } from 'react'
import type { PromptFile, Tag } from '@/types/prompt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Pencil, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { TagBadge } from './TagBadge'
import { TagSelector } from './TagSelector'

interface PromptHeaderProps {
  prompt: PromptFile | null
  isEditMode: boolean
  localName: string
  localDescription: string
  hasUnsavedChanges: boolean
  nameError: string | null
  tags: Tag[]
  localTags: string[]
  onLocalNameChange: (name: string) => void
  onLocalDescriptionChange: (description: string) => void
  onLocalTagsChange: (tags: string[]) => void
  onCreateTag: (name: string, color: string) => void
  onEditModeChange: (editMode: boolean) => void
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
}

export function PromptHeader({
  prompt,
  isEditMode,
  localName,
  localDescription,
  hasUnsavedChanges,
  nameError,
  tags,
  localTags,
  onLocalNameChange,
  onLocalDescriptionChange,
  onLocalTagsChange,
  onCreateTag,
  onEditModeChange,
  onSave,
  onCancel,
  onDelete,
}: PromptHeaderProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

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
    // Add the new tag to this prompt
    onLocalTagsChange([...localTags, name])
  }

  if (!prompt) {
    return (
      <div className="border-b border-gray-200 px-6 py-4 bg-white dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">Select a prompt</p>
      </div>
    )
  }

  const descriptionIsLong = prompt.description && prompt.description.length > 150

  return (
    <div className="border-b border-gray-200 px-6 py-4 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          {isEditMode ? (
            <>
              <div>
                <Input
                  value={localName}
                  onChange={(e) => onLocalNameChange(e.target.value)}
                  className={`border-none bg-transparent p-0 text-xl font-semibold focus-visible:ring-0 ${
                    nameError
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-gray-800 dark:text-gray-100'
                  }`}
                  placeholder="Prompt name"
                  aria-label="Prompt name"
                  aria-invalid={nameError ? true : undefined}
                  aria-describedby={nameError ? 'name-error' : undefined}
                  aria-required
                />
                {nameError && (
                  <p id="name-error" className="mt-1 text-xs text-red-500 dark:text-red-400" role="alert">
                    {nameError}
                  </p>
                )}
              </div>
              <Textarea
                value={localDescription}
                onChange={(e) => onLocalDescriptionChange(e.target.value)}
                className="min-h-[60px] resize-none border-none bg-transparent p-0 text-sm text-gray-600 focus-visible:ring-0 dark:text-gray-400"
                placeholder="Add a description..."
                aria-label="Prompt description"
              />
              {/* Tags in edit mode */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
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
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{prompt.name}</h1>
              {prompt.description && (
                <div>
                  <p
                    className={`text-sm text-gray-600 dark:text-gray-400 ${
                      !isDescriptionExpanded && descriptionIsLong ? 'line-clamp-2' : ''
                    }`}
                  >
                    {prompt.description}
                  </p>
                  {descriptionIsLong && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-0 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    >
                      {isDescriptionExpanded ? (
                        <>
                          Show less <ChevronUp className="ml-1 h-3 w-3" />
                        </>
                      ) : (
                        <>
                          Show more <ChevronDown className="ml-1 h-3 w-3" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
              {/* Tags in view mode */}
              {promptTagObjects.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {promptTagObjects.map((tag) => (
                    <TagBadge key={tag.id} tag={tag} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <Button variant="secondary" size="sm" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                disabled={!hasUnsavedChanges || !!nameError}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEditModeChange(true)}
                title="Edit prompt"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" title="Delete prompt">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-gray-800 dark:text-gray-100">Delete prompt?</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
                      This will permanently delete "{prompt.name}". This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-red-500 text-white hover:bg-red-600">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
