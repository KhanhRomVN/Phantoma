import { memo } from 'react'
import type { Message } from '@renderer/components/Widgets/AgentTools/services/conversationStorage'
import type { ToolCall } from '@renderer/components/Widgets/AgentTools/types'
import { ToolCallFrame, ToolTitle } from './ToolCallFrame'

export const WebSearchRenderer = memo<{ message: Message; call: Extract<ToolCall, { type: 'web_search' }> }>(
  ({ message, call }) => (
    <ToolCallFrame
      message={message}
      toolType="web_search"
      title={<ToolTitle label="Web search" value={call.query} />}
      showOutput
    />
  )
)
WebSearchRenderer.displayName = 'WebSearchRenderer'
