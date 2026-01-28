import { useState, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { open } from '@tauri-apps/plugin-dialog'
import { readFile } from '@tauri-apps/plugin-fs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ImagePlus, X, Trash2, Lock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AddonField, ImageAddonValue } from '@/types/prompt'

interface ImageAddonFieldProps {
  addon: AddonField
  value: ImageAddonValue | null
  disabled?: boolean
  onValueChange: (value: ImageAddonValue | null) => void
  onRemove: () => void
}

export const ImageAddonField = memo(function ImageAddonField({
  addon,
  value,
  disabled = false,
  onValueChange,
  onRemove,
}: ImageAddonFieldProps) {
  const { t } = useTranslation('prompts')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectImage = useCallback(async () => {
    if (disabled) return

    setError(null)
    setIsLoading(true)

    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'],
          },
        ],
      })

      if (selected && typeof selected === 'string') {
        // Read the file to get base64 data
        const fileData = await readFile(selected)
        const bytes = new Uint8Array(fileData)
        let binary = ''
        const chunkSize = 8192
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
        }
        const base64Data = btoa(binary)

        // Determine mime type from extension
        const ext = selected.split('.').pop()?.toLowerCase() || 'png'
        const mimeTypes: Record<string, string> = {
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          gif: 'image/gif',
          webp: 'image/webp',
          bmp: 'image/bmp',
        }
        const mimeType = mimeTypes[ext] || 'image/png'

        // Create preview URL
        const previewUrl = `data:${mimeType};base64,${base64Data}`

        // Extract filename from path
        const fileName = selected.split('/').pop() || selected.split('\\').pop() || 'image'

        const imageValue: ImageAddonValue = {
          fileName,
          filePath: selected,
          mimeType,
          base64Data,
          previewUrl,
        }

        onValueChange(imageValue)
      }
    } catch (err) {
      console.error('Failed to load image:', err)
      setError(t('addons.image.loadError'))
    } finally {
      setIsLoading(false)
    }
  }, [disabled, onValueChange, t])

  const handleClearImage = useCallback(() => {
    onValueChange(null)
    setError(null)
  }, [onValueChange])

  return (
    <div
      className={cn(
        'relative rounded-lg border bg-white p-3 shadow-sm transition-all duration-150 dark:bg-gray-800',
        disabled
          ? 'border-gray-200 dark:border-gray-700 opacity-60'
          : 'border-gray-200 dark:border-gray-700'
      )}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImagePlus className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {addon.label}
          </Label>
          {disabled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              <Lock className="h-2.5 w-2.5" />
              {t('addons.runModeOnly')}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
          title={t('addons.remove')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Description */}
      {addon.description && (
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          {addon.description}
        </p>
      )}

      {/* Content */}
      {value ? (
        <div className="relative">
          <div className="group relative overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
            <img
              src={value.previewUrl}
              alt={value.fileName}
              className="h-32 w-full object-contain bg-gray-50 dark:bg-gray-900"
            />
            {!disabled && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSelectImage}
                  disabled={isLoading}
                >
                  {t('addons.image.replace')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleClearImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
            {value.fileName}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSelectImage}
          disabled={disabled || isLoading}
          className={cn(
            'flex h-24 w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed transition-colors',
            disabled
              ? 'cursor-not-allowed border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
              : 'cursor-pointer border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-gray-500 dark:hover:bg-gray-800'
          )}
        >
          <ImagePlus
            className={cn(
              'h-6 w-6',
              disabled
                ? 'text-gray-300 dark:text-gray-600'
                : 'text-gray-400 dark:text-gray-500'
            )}
          />
          <span
            className={cn(
              'text-xs',
              disabled
                ? 'text-gray-300 dark:text-gray-600'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {isLoading ? t('addons.image.loading') : t('addons.image.selectPrompt')}
          </span>
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-xs">{error}</span>
        </div>
      )}
    </div>
  )
})
