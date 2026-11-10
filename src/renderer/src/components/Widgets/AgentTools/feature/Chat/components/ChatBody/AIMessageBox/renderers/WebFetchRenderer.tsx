import { memo } from 'react'
import type { Message } from '@renderer/components/Widgets/AgentTools/services/conversationStorage'
import type { ToolCall } from '@renderer/components/Widgets/AgentTools/types'
import { ToolCallFrame, ToolTitle, OutputBlock } from './ToolCallFrame'

export const WebFetchRenderer = memo<{ message: Message; call: Extract<ToolCall, { type: 'web_fetch' }> }>(
  ({ message, call }) => (
    <ToolCallFrame
      message={message}
      toolType="web_fetch"
      title={<ToolTitle label="Fetch URL" value={call.url} />}
      body={call.prompt ? <OutputBlock text={call.prompt} /> : undefined}
      showOutput
    />
  )
)
WebFetchRenderer.displayName = 'WebFetchRenderer'
