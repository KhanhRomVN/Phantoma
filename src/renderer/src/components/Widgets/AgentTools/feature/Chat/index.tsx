import { memo } from 'react'
import type { Conversation } from '../../services/conversationStorage'
import ChatHeader from './components/ChatHeader'
import ChatBody from './components/ChatBody'

interface ChatFeatureProps {
  conversation: Conversation | null
  isStreaming: boolean
  streamingMessageId: string | null
  onGoHome: () => void
  onDeleteConversation: () => void
}

export const ChatFeature = memo<ChatFeatureProps>(
  ({ conversation, isStreaming, streamingMessageId, onGoHome, onDeleteConversation }) => (
    <>
      <ChatHeader
        conversation={conversation}
        onGoHome={onGoHome}
        onDeleteConversation={onDeleteConversation}
      />
      <ChatBody
        messages={conversation?.messages ?? []}
        isStreaming={isStreaming}
        streamingMessageId={streamingMessageId}
      />
    </>
  )
)

ChatFeature.displayName = 'ChatFeature'