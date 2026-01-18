import { useState } from 'react'
import type { Tag, PromptFile } from '@/types/prompt'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TagBadge } from './TagBadge'
import { Pencil, Trash2, Check, X, Plus } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TAG_COLORS } from '@/lib/constants'

interface TagsPageProps {
  tags: Tag[]
  prompts: PromptFile[]
  onCreateTag: (name: string, color: string) => Promise<void>
  onUpdateTag: (id: string, name: string, color: string) => Promise<void>
  onDeleteTag: (id: string) => Promise<void>
}

export function TagsPage({
  tags,
  prompts,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: TagsPageProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6b7280')
  const [deleteTag, setDeleteTag] = useState<Tag | null>(null)

  // Count prompts using each tag
  const tagUsageCounts = new Map<string, number>()
  tags.forEach((tag) => {
    const count = prompts.filter((p) => p.tags?.includes(tag.name)).length
    tagUsageCounts.set(tag.id, count)
  })

  function startEditing(tag: Tag) {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditName('')
    setEditColor('')
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return
    await onUpdateTag(editingId, editName.trim(), editColor)
    cancelEditing()
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return
    await onCreateTag(newTagName.trim(), newTagColor)
    setNewTagName('')
    setNewTagColor('#6b7280')
  }

  async function confirmDelete() {
    if (!deleteTag) return
    await onDeleteTag(deleteTag.id)
    setDeleteTag(null)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex h-14 items-center border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Tags</h1>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="max-w-2xl space-y-6">
            {/* Create new tag */}
            <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Create New Tag</h3>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                className="max-w-xs"
              />
              <div className="flex items-center gap-1">
                {TAG_COLORS.slice(0, 8).map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className="h-6 w-6 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      outline: newTagColor === color ? '2px solid currentColor' : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>
              <Button onClick={handleCreateTag} disabled={!newTagName.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add Tag
              </Button>
            </div>
          </div>

          {/* Tag list */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">All Tags ({tags.length})</h3>
            {tags.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                No tags created yet. Create your first tag above.
              </p>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                  >
                    {editingId === tag.id ? (
                      <>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit()
                            if (e.key === 'Escape') cancelEditing()
                          }}
                          className="max-w-xs"
                          autoFocus
                        />
                        <div className="flex items-center gap-1">
                          {TAG_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => setEditColor(color)}
                              className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                              style={{
                                backgroundColor: color,
                                outline: editColor === color ? '2px solid currentColor' : 'none',
                                outlineOffset: '2px',
                              }}
                            />
                          ))}
                        </div>
                        <div className="ml-auto flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={cancelEditing}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button size="sm" onClick={saveEdit}>
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <TagBadge tag={tag} size="md" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {tagUsageCounts.get(tag.id) || 0} prompt
                          {(tagUsageCounts.get(tag.id) || 0) !== 1 ? 's' : ''}
                        </span>
                        <div className="ml-auto flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(tag)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTag(tag)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTag} onOpenChange={() => setDeleteTag(null)}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-800 dark:text-gray-100">Delete Tag</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete the tag "{deleteTag?.name}"? This will
              remove it from all prompts that use it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 text-white hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
