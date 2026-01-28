import { useRef, useEffect } from 'react'
import type { ChatMessage } from '@/types/agent'
import { ChatMessageBubble } from './ChatMessageBubble'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'

interface ChatMessagesProps {
  messages: ChatMessage[]
  isLoading: boolean
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Start a conversation...
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  )
}
