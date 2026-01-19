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
import { TAG_COLORS, TAG_COLOR_NAMES } from '@/lib/constants'

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
        <Button variant="outline" size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Add tag
          <ChevronDown className="h-4 w-4" />
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
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Select tag color">
              {TAG_COLORS.slice(0, 8).map((color) => (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={newTagColor === color}
                  aria-label={`Select ${TAG_COLOR_NAMES[color] || color} color`}
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
                className="flex-1"
                onClick={handleCreateTag}
                disabled={!newTagName.trim()}
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                className=""
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
