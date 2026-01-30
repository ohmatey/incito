import { memo, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ChatAttachment } from '@/types/agent'
import { AttachmentPreview } from './AttachmentPreview'

interface AttachmentGridProps {
  attachments: ChatAttachment[]
  onRemove?: (id: string) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const AttachmentGrid = memo(function AttachmentGrid({
  attachments,
  onRemove,
  size = 'md',
  className,
}: AttachmentGridProps) {
  const [expandedImage, setExpandedImage] = useState<ChatAttachment | null>(null)

  if (attachments.length === 0) return null

  return (
    <>
      <div className={cn('flex flex-wrap gap-2', className)}>
        {attachments.map((attachment) => (
          <AttachmentPreview
            key={attachment.id}
            attachment={attachment}
            size={size}
            onRemove={onRemove ? () => onRemove(attachment.id) : undefined}
            onClick={
              attachment.type === 'image' && attachment.previewUrl
                ? () => setExpandedImage(attachment)
                : undefined
            }
          />
        ))}
      </div>

      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-h-[90vh] max-w-[90vw] overflow-auto p-2">
          {expandedImage?.previewUrl && (
            <img
              src={expandedImage.previewUrl}
              alt={expandedImage.fileName}
              className="max-h-[85vh] w-auto"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
})
