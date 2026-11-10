import { memo } from 'react'
import type { Message } from '@renderer/components/Widgets/AgentTools/services/conversationStorage'
import type { ToolCall } from '@renderer/components/Widgets/AgentTools/types'
import { getFileIconPath } from '@renderer/utils/file-icon'
import { openFileInWorkspace } from '@renderer/components/Widgets/AgentTools/shared/openFile'
import { ToolCallFrame, baseName } from './ToolCallFrame'

export const ReadFileRenderer = memo<{ message: Message; call: Extract<ToolCall, { type: 'read_file' }> }>(
  ({ message, call }) => {
    const open = (e: React.MouseEvent): void => {
      e.stopPropagation()
      if (call.path) openFileInWorkspace(call.path)
    }
    return (
      <ToolCallFrame
        message={message}
        toolType="read_file"
        path={call.path}
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary min-w-0">
            <span className="font-semibold opacity-80 shrink-0 cursor-pointer" onClick={open}>
              READ
            </span>
            <span className="flex items-center shrink-0" onClick={open}>
              <img
                src={getFileIconPath(call.path)}
                alt=""
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
            </span>
            <span
              className="font-medium opacity-90 font-mono text-[11px] truncate cursor-pointer"
              onClick={open}
            >
              {baseName(call.path)}
            </span>
          </div>
        }
      />
    )
  }
)
ReadFileRenderer.displayName = 'ReadFileRenderer'