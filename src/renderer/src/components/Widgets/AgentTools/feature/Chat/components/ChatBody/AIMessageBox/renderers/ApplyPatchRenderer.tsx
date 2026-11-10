import { memo } from 'react'
import type { Message } from '@renderer/components/Widgets/AgentTools/services/conversationStorage'
import type { ToolCall } from '@renderer/components/Widgets/AgentTools/types'
import { ToolCallFrame, ToolTitle, baseName } from './ToolCallFrame'

export const ApplyPatchRenderer = memo<{ message: Message; call: Extract<ToolCall, { type: 'apply_patch' }> }>(
  ({ message, call }) => (
    <ToolCallFrame
      message={message}
      toolType="apply_patch"
      path={call.path}
      title={<ToolTitle label="PATCH" value={call.path ? baseName(call.path) : undefined} />}
      showOutput
    />
  )
)
ApplyPatchRenderer.displayName = 'ApplyPatchRenderer'
