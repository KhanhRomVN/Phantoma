import { memo } from 'react'
import type { Message } from '@renderer/components/Widgets/AgentTools/services/conversationStorage'
import type { ToolCall } from '@renderer/components/Widgets/AgentTools/types'
import { ToolCallFrame, ToolTitle, OutputBlock } from './ToolCallFrame'

export const UnknownRenderer = memo<{ message: Message; call: Extract<ToolCall, { type: 'unknown' }> }>(
  ({ message, call }) => (
    <ToolCallFrame
      message={message}
      toolType="unknown"
      title={<ToolTitle label={call.name} />}
      body={call.input !== undefined ? <OutputBlock text={JSON.stringify(call.input, null, 2)} /> : undefined}
      showOutput
    />
  )
)
UnknownRenderer.displayName = 'UnknownRenderer'
