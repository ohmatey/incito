import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import type { CreatePlaybookData } from '@/types/playbook'

interface CreatePlaybookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: CreatePlaybookData) => void
}

export function CreatePlaybookDialog({ open, onOpenChange, onCreate }: CreatePlaybookDialogProps) {
  const { t } = useTranslation('playbooks')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  function handleClose() {
    setName('')
    setDescription('')
    onOpenChange(false)
  }

  async function handleCreate() {
    if (!name.trim()) return

    setIsCreating(true)

    onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      enabled: true,
    })

    setIsCreating(false)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="playbook-name">{t('create.nameLabel')}</Label>
            <Input
              id="playbook-name"
              name="playbook-name"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('create.namePlaceholder')}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="playbook-description">{t('create.descriptionLabel')}</Label>
            <Textarea
              id="playbook-description"
              name="playbook-description"
              autoComplete="off"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('create.descriptionPlaceholder')}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            {t('common:buttons.cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common:buttons.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
