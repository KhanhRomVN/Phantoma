import { memo } from 'react'
import type { Message } from '@renderer/components/Widgets/AgentTools/services/conversationStorage'
import type { ToolCall } from '@renderer/components/Widgets/AgentTools/types'
import { ToolCallFrame, ToolTitle } from './ToolCallFrame'

export const TodoRenderer = memo<{ message: Message; call: Extract<ToolCall, { type: 'todo' }> }>(
  ({ message, call }) => (
    <ToolCallFrame
      message={message}
      toolType="todo"
      title={<ToolTitle label="Update todo" value={`${call.items.length} item(s)`} />}
      defaultOpen
      body={
        <ul className="flex flex-col gap-1 text-[12px] text-text-primary">
          {call.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <span>{item.status === 'completed' ? '✓' : item.status === 'failed' ? '✕' : '○'}</span>
              <span className={item.status === 'completed' ? 'opacity-60 line-through' : ''}>
                {item.description}
              </span>
            </li>
          ))}
        </ul>
      }
    />
  )
)
TodoRenderer.displayName = 'TodoRenderer'
