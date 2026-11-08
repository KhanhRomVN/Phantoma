import { memo } from 'react'
import { cn } from '@renderer/utils/cn'
import type { Message } from '../../../services/conversationStorage'
import { ToolCallBubble } from './ToolCallBubble'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

export const MessageBubble = memo<MessageBubbleProps>(({ message, isStreaming }) => {
  if (message.role === 'tool') {
    return <ToolCallBubble message={message} />
  }

  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex-none w-8 h-8 rounded-full bg-card-background flex items-center justify-center">
          <svg
            className="w-4 h-4 text-text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
      )}

      <div
        className={cn(
          'max-w-[80%] px-4 py-2 rounded-lg',
          isUser
            ? 'bg-button-soft-background text-text-primary'
            : message.isError
              ? 'bg-red-500/10 text-red-500 border border-red-500/20'
              : 'bg-card-background text-text-primary border border-border'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">
          {message.content}
          {isStreaming && <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />}
        </p>
        <p className="text-xs text-text-faint mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>

      {isUser && (
        <div className="flex-none w-8 h-8 rounded-full bg-button-soft-background flex items-center justify-center">
          <svg
            className="w-4 h-4 text-text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
      )}
    </div>
  )
})

MessageBubble.displayName = 'MessageBubble'