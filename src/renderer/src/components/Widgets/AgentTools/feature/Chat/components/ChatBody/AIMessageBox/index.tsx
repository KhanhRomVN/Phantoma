import { memo } from 'react'
import type { Message } from '../../../../../services/conversationStorage'
import ThinkingBlock from './ThinkingBlock'
import ErrorBlock from './ErrorBlock'
import { MarkdownRenderer } from './renderers/MarkdownRenderer'
import { ToolCallRenderer } from './renderers/ToolCallRenderer'
import ResponseMetadataBar from './ResponseMetadataBar'

interface AIMessageBoxProps {
  message: Message
  responseNumber?: number
  isStreaming?: boolean
}

const AIMessageBox = memo<AIMessageBoxProps>(({ message, responseNumber, isStreaming }) => {
  if (message.role === 'tool') return <ToolCallRenderer message={message} />

  return (
    <div className="flex flex-col gap-1 px-2">
      {message.thinking && (
        <ThinkingBlock content={message.thinking} isStreaming={isStreaming && !message.content} />
      )}
      {message.isError ? (
        <ErrorBlock content={message.content} />
      ) : (
        message.content && <MarkdownRenderer content={message.content} />
      )}
      {!isStreaming && !message.isError && responseNumber !== undefined && (
        <ResponseMetadataBar responseNumber={responseNumber} message={message} />
      )}
    </div>
  )
})

AIMessageBox.displayName = 'AIMessageBox'

export default AIMessageBox