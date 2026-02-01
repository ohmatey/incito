import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TAG_COLORS } from '@/lib/constants'
import type { Tag } from '@/types/prompt'

interface TagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag?: Tag // If provided, we're editing; otherwise creating
  onSave: (name: string, color: string) => void
}

export function TagDialog({ open, onOpenChange, tag, onSave }: TagDialogProps) {
  const { t } = useTranslation(['tags', 'common'])
  const isEditing = !!tag

  const [name, setName] = useState('')
  const [color, setColor] = useState(TAG_COLORS[0])

  // Reset form when dialog opens/closes or tag changes
  useEffect(() => {
    if (open) {
      if (tag) {
        setName(tag.name)
        setColor(tag.color)
      } else {
        setName('')
        setColor(TAG_COLORS[0])
      }
    }
  }, [open, tag])

  function handleClose() {
    setName('')
    setColor(TAG_COLORS[0])
    onOpenChange(false)
  }

  function handleSave() {
    if (!name.trim()) return
    onSave(name.trim(), color)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('tags:dialog.editTitle') : t('tags:dialog.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t('tags:dialog.editDescription') : t('tags:dialog.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="tag-name">{t('tags:dialog.nameLabel')}</Label>
            <Input
              id="tag-name"
              name="tag-name"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('tags:dialog.namePlaceholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
              }}
              autoFocus
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>{t('tags:dialog.colorLabel')}</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? '2px solid currentColor' : 'none',
                    outlineOffset: '2px',
                  }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('common:buttons.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {isEditing ? t('common:buttons.save') : t('common:buttons.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
