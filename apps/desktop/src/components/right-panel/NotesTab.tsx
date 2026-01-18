import { useState } from 'react'
import type { PromptFile, Note } from '@/types/prompt'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, Check, X, StickyNote } from 'lucide-react'

interface NotesTabProps {
  prompt: PromptFile | null
  onNotesChange: (notes: Note[]) => void
  isAddingNote: boolean
  onAddingNoteChange: (adding: boolean) => void
}

export function NotesTab({ prompt, onNotesChange, isAddingNote, onAddingNoteChange }: NotesTabProps) {
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')

  if (!prompt) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Select a prompt</p>
      </div>
    )
  }

  const notes = prompt.notes || []

  function handleAddNote() {
    if (!newNoteContent.trim()) return

    const newNote: Note = {
      id: crypto.randomUUID(),
      content: newNoteContent.trim(),
      createdAt: new Date().toISOString(),
    }

    onNotesChange([newNote, ...notes])
    setNewNoteContent('')
    onAddingNoteChange(false)
  }

  function handleDeleteNote(noteId: string) {
    onNotesChange(notes.filter(n => n.id !== noteId))
  }

  function handleStartEdit(note: Note) {
    setEditingNoteId(note.id)
    setEditingContent(note.content)
  }

  function handleSaveEdit() {
    if (!editingNoteId || !editingContent.trim()) return

    onNotesChange(
      notes.map(n =>
        n.id === editingNoteId
          ? { ...n, content: editingContent.trim() }
          : n
      )
    )
    setEditingNoteId(null)
    setEditingContent('')
  }

  function handleCancelEdit() {
    setEditingNoteId(null)
    setEditingContent('')
  }

  function formatDate(isoString: string): string {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Add note form */}
      {isAddingNote && (
        <div className="border-b border-gray-200 p-3 dark:border-gray-700">
          <Textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Write a note..."
            className="mb-2 min-h-[80px] resize-none text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onAddingNoteChange(false)
                setNewNoteContent('')
              }}
              className="h-7 px-2 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!newNoteContent.trim()}
              className="h-7 px-2 text-xs"
            >
              Add Note
            </Button>
          </div>
        </div>
      )}

      {/* Notes list */}
      <ScrollArea className="flex-1">
        {notes.length === 0 && !isAddingNote ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="rounded-full bg-gray-100 p-4 dark:bg-gray-800">
              <StickyNote className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="mt-4 font-medium text-gray-700 dark:text-gray-300">
              No notes yet
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Add notes to remember important details about this prompt
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddingNoteChange(true)}
              className="mt-4 gap-1"
            >
              <Plus className="h-4 w-4" />
              Add first note
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {notes.map((note) => (
              <div key={note.id} className="group p-3">
                {editingNoteId === note.id ? (
                  <div>
                    <Textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="mb-2 min-h-[80px] resize-none text-sm"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancelEdit}
                        className="h-7 w-7"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSaveEdit}
                        disabled={!editingContent.trim()}
                        className="h-7 w-7 text-green-600 hover:text-green-700 dark:text-green-500"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                      {note.content}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(note.createdAt)}
                      </span>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEdit(note)}
                          className="h-6 w-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteNote(note.id)}
                          className="h-6 w-6 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
