import { useRef, useEffect, useState, useCallback, memo } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { readFile } from '@tauri-apps/plugin-fs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Square, Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import type { ChatAttachment, AttachmentType } from '@/types/agent'
import { AttachmentGrid } from './AttachmentGrid'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_TOTAL_SIZE = 20 * 1024 * 1024 // 20MB
const MAX_FILES = 5

const SUPPORTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'txt', 'md', 'json', 'csv']

const MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
}

function getAttachmentType(mimeType: string): AttachmentType {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('text/') || mimeType === 'application/json') return 'text'
  return 'document'
}

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: (attachments: ChatAttachment[]) => void
  onStop: () => void
  isLoading: boolean
  placeholder?: string
}

// Hoisted static JSX to avoid recreation on each render (rendering-hoist-jsx)
const HelpText = (
  <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
    Press Enter to send, Shift+Enter for new line
  </p>
)

export const ChatInput = memo(function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isLoading,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [value])

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && (value.trim() || pendingAttachments.length > 0)) {
        handleSend()
      }
    }
  }

  const handleSend = useCallback(() => {
    if (isLoading) return
    if (!value.trim() && pendingAttachments.length === 0) return

    onSend(pendingAttachments)
    setPendingAttachments([])
  }, [value, pendingAttachments, isLoading, onSend])

  const handleFileSelect = useCallback(async () => {
    if (isUploading || isLoading) return
    if (pendingAttachments.length >= MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files per message`)
      return
    }

    setIsUploading(true)
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'Supported Files',
            extensions: SUPPORTED_EXTENSIONS,
          },
        ],
      })

      if (!selected) {
        setIsUploading(false)
        return
      }

      const paths = Array.isArray(selected) ? selected : [selected]
      const currentTotalSize = pendingAttachments.reduce((sum, a) => sum + a.size, 0)
      let addedSize = 0
      const newAttachments: ChatAttachment[] = []

      for (const filePath of paths) {
        if (typeof filePath !== 'string') continue
        if (pendingAttachments.length + newAttachments.length >= MAX_FILES) {
          toast.error(`Maximum ${MAX_FILES} files per message`)
          break
        }

        try {
          const fileData = await readFile(filePath)
          const bytes = new Uint8Array(fileData)
          const size = bytes.length

          if (size > MAX_FILE_SIZE) {
            toast.error(`File too large (max 10MB): ${filePath.split('/').pop()}`)
            continue
          }

          if (currentTotalSize + addedSize + size > MAX_TOTAL_SIZE) {
            toast.error('Total attachment size exceeds 20MB')
            break
          }

          // Convert to base64
          let binary = ''
          const chunkSize = 8192
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
          }
          const base64Data = btoa(binary)

          // Determine mime type
          const ext = filePath.split('.').pop()?.toLowerCase() || ''
          const mimeType = MIME_TYPES[ext] || 'application/octet-stream'
          const type = getAttachmentType(mimeType)

          // Create preview URL for images
          const previewUrl = type === 'image' ? `data:${mimeType};base64,${base64Data}` : undefined

          // Extract filename
          const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'file'

          newAttachments.push({
            id: crypto.randomUUID(),
            fileName,
            mimeType,
            base64Data,
            previewUrl,
            type,
            size,
          })
          addedSize += size
        } catch (err) {
          console.error('Failed to read file:', err)
          toast.error(`Failed to read file: ${filePath.split('/').pop()}`)
        }
      }

      if (newAttachments.length > 0) {
        setPendingAttachments((prev) => [...prev, ...newAttachments])
      }
    } catch (err) {
      console.error('File selection error:', err)
      toast.error('Failed to select files')
    } finally {
      setIsUploading(false)
    }
  }, [isUploading, isLoading, pendingAttachments])

  const handleRemoveAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  return (
    <div className="border-t border-gray-200 p-4 dark:border-gray-700">
      <div className="mx-auto max-w-3xl">
        {pendingAttachments.length > 0 && (
          <div className="mb-3">
            <AttachmentGrid
              attachments={pendingAttachments}
              onRemove={handleRemoveAttachment}
              size="sm"
            />
          </div>
        )}
        <div className="flex items-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFileSelect}
            disabled={isLoading || isUploading}
            className="h-11 w-11 flex-shrink-0"
            title="Attach files"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="min-h-[44px] max-h-[200px] resize-none"
            rows={1}
          />
          {isLoading ? (
            <Button
              variant="destructive"
              size="icon"
              onClick={onStop}
              className="h-11 w-11 flex-shrink-0"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!value.trim() && pendingAttachments.length === 0}
              size="icon"
              className="h-11 w-11 flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        {HelpText}
      </div>
    </div>
  )
})
