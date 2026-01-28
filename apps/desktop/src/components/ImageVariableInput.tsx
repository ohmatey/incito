import { useState, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { open } from '@tauri-apps/plugin-dialog'
import { readFile, writeFile, exists, mkdir } from '@tauri-apps/plugin-fs'
import { join } from '@tauri-apps/api/path'
import { Button } from '@/components/ui/button'
import { ImagePlus, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ImageAddonValue } from '@/types/prompt'

interface ImageVariableInputProps {
  value: ImageAddonValue | null
  promptsFolder: string
  onValueChange: (value: ImageAddonValue | null) => void
  onFocus?: () => void
  onBlur?: () => void
}

export const ImageVariableInput = memo(function ImageVariableInput({
  value,
  promptsFolder,
  onValueChange,
  onFocus,
  onBlur,
}: ImageVariableInputProps) {
  const { t } = useTranslation('prompts')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectImage = useCallback(async () => {
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
        // Read the source file
        const fileData = await readFile(selected)
        const bytes = new Uint8Array(fileData)

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

        // Extract original filename
        const originalFileName = selected.split('/').pop() || selected.split('\\').pop() || 'image'

        // Create resources directory if needed
        const resourcesPath = await join(promptsFolder, 'resources')
        const resourcesDirExists = await exists(resourcesPath)
        if (!resourcesDirExists) {
          await mkdir(resourcesPath, { recursive: true })
        }

        // Generate unique filename
        const timestamp = Date.now()
        const uniqueFileName = `${timestamp}_${originalFileName}`
        const filePath = await join(resourcesPath, uniqueFileName)

        // Write file to resources folder
        await writeFile(filePath, bytes)

        // Create base64 for preview
        let binary = ''
        const chunkSize = 8192
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
        }
        const base64Data = btoa(binary)
        const previewUrl = `data:${mimeType};base64,${base64Data}`

        const imageValue: ImageAddonValue = {
          fileName: uniqueFileName,
          filePath: `resources/${uniqueFileName}`,
          mimeType,
          base64Data,
          previewUrl,
        }

        onValueChange(imageValue)
      }
    } catch (err) {
      console.error('Failed to load image:', err)
      setError(t('variableConfig.imageField.loadError'))
    } finally {
      setIsLoading(false)
    }
  }, [promptsFolder, onValueChange, t])

  const handleClearImage = useCallback(() => {
    onValueChange(null)
    setError(null)
  }, [onValueChange])

  return (
    <div
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {value ? (
        <div className="relative">
          <div className="group relative overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
            <img
              src={value.previewUrl}
              alt={value.fileName}
              className="h-32 w-full object-contain bg-gray-50 dark:bg-gray-900"
            />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSelectImage}
                disabled={isLoading}
              >
                {t('variableConfig.imageField.replace')}
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
          </div>
          <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
            {value.fileName}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSelectImage}
          disabled={isLoading}
          className={cn(
            'flex h-24 w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed transition-colors',
            'cursor-pointer border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-gray-500 dark:hover:bg-gray-800'
          )}
        >
          <ImagePlus className="h-6 w-6 text-gray-400 dark:text-gray-500" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {isLoading
              ? t('variableConfig.imageField.loading')
              : t('variableConfig.imageField.selectImage')}
          </span>
        </button>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-xs">{error}</span>
        </div>
      )}
    </div>
  )
})
