import { memo, useEffect } from 'react'
import { cn } from '@renderer/utils/cn'
import { useAgentToolStore } from './hooks/useAgentToolStore'
import { MessageInput } from './components/MessageInput'
import { PermissionDialog } from './components/PermissionDialog'
import { HomeFeature } from './feature/Home'
import { ChatFeature } from './feature/Chat'
import { useAgentChat } from './feature/Chat/hooks/useAgentChat'

interface AgentToolsProps {
  className?: string
  onProviderChange?: (provider: { id: string; name: string; url?: string }) => void
}

export const AgentTools = memo<AgentToolsProps>(({ className, onProviderChange }) => {
  const { setSelectedProvider, addPermissionRequest } = useAgentToolStore()
  const { messages, isStreaming, streamingMessageId, send, stop } = useAgentChat()

  useEffect(() => {
    return window.api.agentTool.onPermissionRequest(
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
        <HomeFeature />
      ) : (
        <ChatFeature
          messages={messages}
          isStreaming={isStreaming}
          streamingMessageId={streamingMessageId}
          onStop={stop}
        />
      )}

      <MessageInput
        onSend={send}
        onProviderChange={handleProviderChange}
        disabled={isStreaming}
      />

      <PermissionDialog />
    </div>
  )
})

AgentTools.displayName = 'AgentTools'

export { useAgentToolStore } from './hooks/useAgentToolStore'
export * from './types'