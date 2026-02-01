import { useState, useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getPlaybook, updatePlaybook, deletePlaybook } from '@/lib/store'
import { RuleTable } from '@/components/playbooks/RuleTable'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { Pencil, Trash2, Loader2, PanelLeft, PanelLeftClose, X, Check } from 'lucide-react'
import type { Playbook } from '@/types/playbook'
import { useLayout } from '@/context/LayoutContext'
import { cn } from '@/lib/utils'

export function PlaybookDetail() {
  const { playbookId } = useParams({ from: '/playbooks/$playbookId' })
  const navigate = useNavigate()
  const { t } = useTranslation('playbooks')
  const { listPanelCollapsed, toggleListPanelCollapsed } = useLayout()

  const [playbook, setPlaybook] = useState<Playbook | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  useEffect(() => {
    loadPlaybook()
  }, [playbookId])

  async function loadPlaybook() {
    setIsLoading(true)
    const result = await getPlaybook(playbookId)
    if (result.ok && result.data) {
      setPlaybook(result.data)
      setEditName(result.data.name)
      setEditDescription(result.data.description || '')
    } else {
      setPlaybook(null)
    }
    setIsLoading(false)
  }

  async function handleToggleEnabled() {
    if (!playbook) return
    const result = await updatePlaybook(playbook.id, { enabled: !playbook.enabled })
    if (result.ok) {
      setPlaybook({ ...playbook, enabled: !playbook.enabled })
      toast.success(t('success.updated'))
    } else {
      toast.error(t('errors.updateFailed'))
    }
  }

  async function handleDelete() {
    if (!playbook) return
    setIsDeleting(true)
    const result = await deletePlaybook(playbook.id)
    if (result.ok) {
      toast.success(t('success.deleted'))
      navigate({ to: '/playbooks' })
    } else {
      toast.error(t('errors.deleteFailed'))
    }
    setIsDeleting(false)
    setShowDeleteDialog(false)
  }

  function handleEnterEditMode() {
    if (!playbook) return
    setEditName(playbook.name)
    setEditDescription(playbook.description || '')
    setIsEditMode(true)
  }

  function handleCancelEdit() {
    if (!playbook) return
    setEditName(playbook.name)
    setEditDescription(playbook.description || '')
    setIsEditMode(false)
  }

  async function handleSaveEdit() {
    if (!playbook || !editName.trim()) return

    const result = await updatePlaybook(playbook.id, {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
    })

    if (result.ok) {
      setPlaybook({
        ...playbook,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      })
      setIsEditMode(false)
      toast.success(t('success.updated'))
    } else {
      toast.error(t('errors.updateFailed'))
    }
  }

  // Refresh playbook data when rules change (to update rule count)
  async function handleRulesChange() {
    const result = await getPlaybook(playbookId)
    if (result.ok && result.data) {
      setPlaybook(result.data)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!playbook) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500">{t('emptyState.title')}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          {/* Panel toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleListPanelCollapsed}
            className="h-8 w-8"
            aria-label={listPanelCollapsed ? 'Show list' : 'Hide list'}
          >
            {listPanelCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>

          {/* Title */}
          {isEditMode ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-8 w-64 font-semibold"
              autoFocus
            />
          ) : (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {playbook.name}
            </h1>
          )}

          <Badge
            variant="secondary"
            className={cn(
              'h-5',
              playbook.enabled
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            )}
          >
            {playbook.enabled ? t('detail.enabled') : t('detail.disabled')}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Enabled toggle */}
          <Switch
            checked={playbook.enabled}
            onCheckedChange={handleToggleEnabled}
            aria-label={playbook.enabled ? t('detail.enabled') : t('detail.disabled')}
          />

          {/* Edit/Save/Cancel */}
          {isEditMode ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancelEdit}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSaveEdit}
                disabled={!editName.trim()}
                className="h-8 w-8"
              >
                <Check className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEnterEditMode}
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
            className="h-8 w-8 text-gray-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Description */}
          {isEditMode ? (
            <div className="space-y-2">
              <Label>{t('create.descriptionLabel')}</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder={t('create.descriptionPlaceholder')}
                rows={3}
              />
            </div>
          ) : playbook.description ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {playbook.description}
            </p>
          ) : null}

          {/* Rules Table */}
          <RuleTable
            playbookId={playbook.id}
            onRulesChange={handleRulesChange}
          />
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('detail.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('detail.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common:buttons.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
