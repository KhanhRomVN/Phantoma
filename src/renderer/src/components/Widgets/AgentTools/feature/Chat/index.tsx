import { memo, useEffect, useRef } from 'react'
import type { Message } from '../../services/conversationStorage'
import { MessageBubble } from './components/MessageBubble'

interface ChatFeatureProps {
  messages: Message[]
  isStreaming: boolean
  streamingMessageId: string | null
  onStop: () => void
}

export const ChatFeature = memo<ChatFeatureProps>(
  ({ messages, isStreaming, streamingMessageId, onStop }) => {
    const chatEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    return (
      <>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={isStreaming && msg.id === streamingMessageId}
            />
          ))}
          <div ref={chatEndRef} />
        </div>

        {isStreaming && (
          <div className="flex justify-center pb-2">
            <button
              onClick={onStop}
              className="px-3 py-1 text-xs rounded bg-button-soft-background text-text-secondary hover:text-text-primary"
            >
              Stop
            </button>
          </div>
        )}
      </>
    )
  }
)

ChatFeature.displayName = 'ChatFeature'