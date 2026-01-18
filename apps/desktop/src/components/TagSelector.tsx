import { useState } from 'react'
import type { Tag } from '@/types/prompt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, ChevronDown } from 'lucide-react'
import { TAG_COLORS } from '@/lib/constants'

interface TagSelectorProps {
  tags: Tag[]
  selectedTagNames: string[]
  onTagToggle: (tagName: string) => void
  onCreateTag: (name: string, color: string) => void
}

export function TagSelector({
  tags,
  selectedTagNames,
  onTagToggle,
  onCreateTag,
}: TagSelectorProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[9]) // default blue

  function handleCreateTag() {
    if (!newTagName.trim()) return
    onCreateTag(newTagName.trim(), newTagColor)
    setNewTagName('')
    setIsCreating(false)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
          <Plus className="h-3 w-3" />
          Add tag
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {tags.length === 0 && !isCreating && (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            No tags yet
          </div>
        )}

        {tags.map((tag) => (
          <DropdownMenuCheckboxItem
            key={tag.id}
            checked={selectedTagNames.includes(tag.name)}
            onCheckedChange={() => onTagToggle(tag.name)}
            onSelect={(e) => e.preventDefault()}
          >
            <span
              className="mr-2 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: tag.color }}
            />
            {tag.name}
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />

        {isCreating ? (
          <div className="p-2 space-y-2">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name"
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCreateTag()
                } else if (e.key === 'Escape') {
                  setIsCreating(false)
                  setNewTagName('')
                }
              }}
            />
            <div className="flex flex-wrap gap-1">
              {TAG_COLORS.slice(0, 8).map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`h-5 w-5 rounded-full transition-transform ${
                    newTagColor === color ? 'ring-2 ring-ring ring-offset-1 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewTagColor(color)}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 flex-1 text-xs"
                onClick={handleCreateTag}
                disabled={!newTagName.trim()}
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  setIsCreating(false)
                  setNewTagName('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="h-4 w-4" />
            Create new tag
          </button>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
