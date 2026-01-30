import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, Sparkles } from 'lucide-react'
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
import { toast } from 'sonner'
import {
  getProviderConfigs,
  createProviderConfig,
  updateProviderConfig,
  deleteProviderConfig,
  setDefaultProviderConfig,
  type ProviderConfig,
  type ProviderConfigsSettings,
} from '@/lib/store'
import { ProviderConfigCard } from './ProviderConfigCard'
import { ProviderConfigDialog } from './ProviderConfigDialog'

export function MultiProviderSettings() {
  const { t } = useTranslation(['settings', 'common'])
  const [configs, setConfigs] = useState<ProviderConfigsSettings>({ configs: [], defaultConfigId: null })
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ProviderConfig | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadConfigs = useCallback(async () => {
    setIsLoading(true)
    const result = await getProviderConfigs()
    if (result.ok) {
      setConfigs(result.data)
    } else {
      toast.error(result.error)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  const handleAdd = () => {
    setEditingConfig(null)
    setDialogOpen(true)
  }

  const handleEdit = (config: ProviderConfig) => {
    setEditingConfig(config)
    setDialogOpen(true)
  }

  const handleSave = async (data: Omit<ProviderConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingConfig) {
      // Update existing
      const result = await updateProviderConfig(editingConfig.id, data)
      if (result.ok) {
        toast.success(t('settings:providers.providerUpdated'))
        await loadConfigs()
      } else {
        throw new Error(result.error)
      }
    } else {
      // Create new
      const result = await createProviderConfig(data)
      if (result.ok) {
        toast.success(t('settings:providers.providerAdded'))
        await loadConfigs()
      } else {
        throw new Error(result.error)
      }
    }
  }

  const handleDeleteClick = (id: string) => {
    setDeletingId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return

    const result = await deleteProviderConfig(deletingId)
    if (result.ok) {
      toast.success(t('settings:providers.providerDeleted'))
      await loadConfigs()
    } else {
      toast.error(t('settings:providers.deleteFailed'))
    }

    setDeleteConfirmOpen(false)
    setDeletingId(null)
  }

  const handleSetDefault = async (id: string) => {
    const result = await setDefaultProviderConfig(id)
    if (result.ok) {
      toast.success(t('settings:providers.defaultChanged'))
      await loadConfigs()
    } else {
      toast.error(result.error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('settings:aiProvider.loading')}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {t('settings:providers.title')}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('settings:providers.description')}
      </p>

      {configs.configs.length === 0 ? (
        /* Empty State */
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-600 dark:bg-gray-800/50">
          <Sparkles className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('settings:providers.noProviders')}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            {t('settings:providers.noProvidersDescription')}
          </p>
          <Button onClick={handleAdd} variant="outline" className="mt-3 gap-2">
            <Plus className="h-4 w-4" />
            {t('settings:providers.addProvider')}
          </Button>
        </div>
      ) : (
        /* Provider List */
        <div className="space-y-2">
          <div className="flex justify-end">
            <Button onClick={handleAdd} variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              {t('settings:providers.addProvider')}
            </Button>
          </div>

          {configs.configs.map((config) => (
            <ProviderConfigCard
              key={config.id}
              config={config}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <ProviderConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        config={editingConfig}
        onSave={handleSave}
        isEditing={!!editingConfig}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings:providers.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings:providers.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {t('common:buttons.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
