import { memo } from 'react'
import type { Message } from '@renderer/components/Widgets/AgentTools/services/conversationStorage'
import type { ToolCall } from '@renderer/components/Widgets/AgentTools/types'
import { ToolCallFrame, ToolTitle } from './ToolCallFrame'

export const SearchRenderer = memo<{ message: Message; call: Extract<ToolCall, { type: 'search' }> }>(
  ({ message, call }) => (
    <ToolCallFrame
      message={message}
      toolType="search"
      path={call.path}
      title={<ToolTitle label="SEARCH" value={call.pattern} />}
      showOutput
    />
  )
)
SearchRenderer.displayName = 'SearchRenderer'
