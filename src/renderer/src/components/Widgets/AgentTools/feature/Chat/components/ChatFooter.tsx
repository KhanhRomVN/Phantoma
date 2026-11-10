import { memo } from 'react'
import { MessageInput } from '../../../components/MessageInput'
import type { ProviderOption, RunOptions } from '../../../components/MessageInput/types'

interface ChatFooterProps {
  onSend: (message: string, provider: ProviderOption, model: string, options: RunOptions) => void
  onStop?: () => void
  isStreaming?: boolean
  onProviderChange?: (provider: ProviderOption) => void
  disabled?: boolean
  lockedProviderId?: string
}

const ChatFooter = memo<ChatFooterProps>(
  ({ onSend, onStop, isStreaming, onProviderChange, disabled, lockedProviderId }) => (
    <div
      id="chat-footer-container"
      className="flex flex-col w-full overflow-hidden flex-shrink-0 bg-background"
      style={{ maxWidth: '680px', margin: '0 auto', boxSizing: 'border-box' }}
    >
      <MessageInput
        onSend={onSend}
        onStop={onStop}
        isStreaming={isStreaming}
        onProviderChange={onProviderChange}
        disabled={disabled}
        lockedProviderId={lockedProviderId}
      />
    </div>
  )
)

ChatFooter.displayName = 'ChatFooter'

export default ChatFooter