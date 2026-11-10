import { memo, useEffect, useRef } from 'react'
import type { Message } from '../../../../services/conversationStorage'
import UserMessageBox from './UserMessageBox'
import AIMessageBox from './AIMessageBox'
import ProcessingIndicator from './ProcessingIndicator'

interface ChatBodyProps {
  messages: Message[]
  isStreaming: boolean
  streamingMessageId: string | null
}

const ChatBody = memo<ChatBodyProps>(({ messages, isStreaming, streamingMessageId }) => {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const last = messages[messages.length - 1]
  const isWaiting = isStreaming && (!last || last.role === 'user')

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-4 py-4 pr-6 pl-3 text-[15px]">
      {messages.map((msg, index) =>
        msg.role === 'user' ? (
          <UserMessageBox key={msg.id} message={msg} />
        ) : (
          <AIMessageBox
            key={msg.id}
            message={msg}
            responseNumber={messages.slice(0, index + 1).filter((m) => m.role === 'assistant').length}
            isStreaming={isStreaming && msg.id === streamingMessageId}
          />
        )
      )}
      <ProcessingIndicator isResponding={isWaiting} />
      <div ref={endRef} />
    </div>
  )
})

ChatBody.displayName = 'ChatBody'

export default ChatBody