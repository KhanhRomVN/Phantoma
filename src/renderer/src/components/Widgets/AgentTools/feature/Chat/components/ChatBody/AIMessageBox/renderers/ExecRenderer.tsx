import { memo } from 'react'
import type { Message } from '@renderer/components/Widgets/AgentTools/services/conversationStorage'
import type { ToolCall } from '@renderer/components/Widgets/AgentTools/types'
import { getWorkingPath } from '@renderer/components/Widgets/AgentTools/shared/workingPath'
import { getFolderIconPath } from '@renderer/utils/file-icon'
import { TerminalBlock } from '@renderer/modules/Code/renderers/RunCommandRenderer'
import { ToolCallFrame } from './ToolCallFrame'

export const ExecRenderer = memo<{ message: Message; call: Extract<ToolCall, { type: 'exec' }> }>(
  ({ message, call }) => {
    const workingPath = getWorkingPath()
    const folderName = workingPath.split('/').filter(Boolean).pop() || ''
    const output = (message.toolResult?.output as string | undefined) ?? ''

    return (
      <ToolCallFrame
        message={message}
        toolType="exec"
        path={workingPath || undefined}
        absolutePath
        defaultOpen
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary min-w-0">
            <span className="font-semibold opacity-80 shrink-0">EXECUTE</span>
            {folderName && (
              <>
                <img
                  src={getFolderIconPath(workingPath)}
                  alt=""
                  style={{ width: '14px', height: '14px', flexShrink: 0 }}
                />
                <span className="font-medium opacity-80 font-mono text-[11px] truncate">
                  {folderName}
                </span>
              </>
            )}
          </div>
        }
        body={
          <TerminalBlock
            logs={output}
            initialCommand={call.command}
            cwd={workingPath}
            status={message.toolResult ? 'idle' : 'busy'}
          />
        }
      />
    )
  }
)
ExecRenderer.displayName = 'ExecRenderer'