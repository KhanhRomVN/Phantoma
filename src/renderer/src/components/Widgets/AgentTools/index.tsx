import { memo, useEffect } from 'react'
import { cn } from '@renderer/utils/cn'
import { agentToolIpc } from './handlers/AgentToolIpc'
import { useAgentToolStore } from './hooks/useAgentToolStore'
import ChatFooter from './feature/Chat/components/ChatFooter'
import { PermissionDialog } from './components/PermissionDialog'
import { HomeFeature } from './feature/Home'
import { ChatFeature } from './feature/Chat'
import { useAgentChat } from './feature/Chat/hooks/useAgentChat'
import { setWorkingPath } from './shared/workingPath'

interface AgentToolsProps {
  className?: string
  onProviderChange?: (provider: { id: string; name: string; url?: string }) => void
  conversationId?: string | null
  onConversationChange?: (conversationId: string | null) => void
  cwd?: string
}

export const AgentTools = memo<AgentToolsProps>(
  ({ className, onProviderChange, conversationId, onConversationChange, cwd }) => {
  if (cwd) setWorkingPath(cwd)
  const { setSelectedProvider, addPermissionRequest } = useAgentToolStore()
  const { conversation, messages, isStreaming, streamingMessageId, send, stop, reset, remove, loadSession } = useAgentChat({
    conversationId,
    onConversationChange
  })

  useEffect(() => {
    return agentToolIpc.onPermissionRequest(
      (data: { id: string; question: string; options: string[]; serverName?: string }) => {
        addPermissionRequest({
          id: data.id,
          toolId: data.id,
          question: data.question,
          options: data.options,
          serverName: data.serverName
        })
      }
    )
  }, [addPermissionRequest])

  const handleProviderChange = (provider: {
    id: string
    name: string
    url?: string
    models: string[]
  }) => {
    setSelectedProvider({ id: provider.id, name: provider.name, url: provider.url })
    onProviderChange?.({ id: provider.id, name: provider.name, url: provider.url })
  }

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {messages.length === 0 ? (
        <HomeFeature onSelectSession={loadSession} />
      ) : (
        <ChatFeature
          conversation={conversation}
          isStreaming={isStreaming}
          streamingMessageId={streamingMessageId}
          onGoHome={reset}
          onDeleteConversation={remove}
        />
      )}

      <ChatFooter
        onSend={send}
        onStop={stop}
        isStreaming={isStreaming}
        onProviderChange={handleProviderChange}
        disabled={isStreaming}
        lockedProviderId={messages.length > 0 ? conversation?.provider : undefined}
      />

      <PermissionDialog />
    </div>
  )
  }
)

AgentTools.displayName = 'AgentTools'

export { useAgentToolStore } from './hooks/useAgentToolStore'
export * from './types'