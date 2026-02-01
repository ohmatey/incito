import { memo } from 'react'
import type { ChatMessage } from '@/types/agent'
import { cn } from '@/lib/utils'
import { User, Bot } from 'lucide-react'
import { AttachmentGrid } from './AttachmentGrid'

interface ChatMessageBubbleProps {
  message: ChatMessage
}

// Memoized to prevent re-renders when new messages are added (rerender-memo rule)
export const ChatMessageBubble = memo(function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user'
  const hasAttachments = message.attachments && message.attachments.length > 0

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-blue-100 dark:bg-blue-900'
            : 'bg-gray-100 dark:bg-gray-800'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2',
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
        )}
      >
        {message.content && (
          <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        )}
        {hasAttachments && (
          <div className={cn('mt-2', !message.content && '-mt-0')}>
            <AttachmentGrid
              attachments={message.attachments!}
              size="sm"
            />
          </div>
        )}
        {message.timestamp && (
          <div
            className={cn(
              'mt-1 text-xs',
              isUser
                ? 'text-blue-200'
                : 'text-gray-400 dark:text-gray-500'
            )}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </div>
  )
})
