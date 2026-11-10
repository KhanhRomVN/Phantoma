import { memo } from 'react'
import type { Message } from '@renderer/components/Widgets/AgentTools/services/conversationStorage'
import type { ToolCall } from '@renderer/components/Widgets/AgentTools/types'
import { ToolCallFrame, ToolTitle, OutputBlock } from './ToolCallFrame'

export const McpRenderer = memo<{ message: Message; call: Extract<ToolCall, { type: 'mcp' }> }>(
  ({ message, call }) => (
    <ToolCallFrame
      message={message}
      toolType="mcp"
      title={<ToolTitle label={`Use ${call.server}`} value={call.tool} />}
      body={call.input !== undefined ? <OutputBlock text={JSON.stringify(call.input, null, 2)} /> : undefined}
      showOutput
    />
  )
)
McpRenderer.displayName = 'McpRenderer'
