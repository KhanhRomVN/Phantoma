import { memo } from 'react'
import type { Message } from '@renderer/components/Widgets/AgentTools/services/conversationStorage'
import type { ToolCall } from '@renderer/components/Widgets/AgentTools/types'
import {
  getWorkingPath,
  toRelativePath
} from '@renderer/components/Widgets/AgentTools/shared/workingPath'
import { openFileInWorkspace } from '@renderer/components/Widgets/AgentTools/shared/openFile'
import { getFileIconPath } from '@renderer/utils/file-icon'
import { TreeBlock } from '@renderer/components/common/TreeBlock'
import { buildTreeFromPaths } from '@renderer/modules/Code/utils/tree-builder'
import { ToolCallFrame } from './ToolCallFrame'

const parseRawPaths = (output?: string): string[] =>
  (output ?? '')
    .split('\n')
    .map((line) => line.replace(/^-\s+/, '').trim())
    .filter((line) => line && !/^Found \d+/.test(line))

export const GlobRenderer = memo<{ message: Message; call: Extract<ToolCall, { type: 'glob' }> }>(
  ({ message, call }) => {
    const isDone = !!message.toolResult && !message.toolResult.error
    const rawPaths = isDone ? parseRawPaths(message.toolResult?.output as string | undefined) : []
    const rawByDisplay = new Map<string, string>()
    const displayPaths = rawPaths.map((raw) => {
      const display = toRelativePath(raw)
      rawByDisplay.set(display.replace(/^\/+/, ''), raw)
      return display
    })
    const pattern = call.pattern.replace(/^\*\*\//, '')

    return (
      <ToolCallFrame
        message={message}
        toolType="glob"
        path={getWorkingPath() || undefined}
        absolutePath
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary min-w-0">
            <span className="font-semibold opacity-80 shrink-0">FIND</span>
            <img
              src={getFileIconPath(pattern)}
              alt=""
              style={{ width: '14px', height: '14px', flexShrink: 0 }}
            />
            <span className="font-medium opacity-90 font-mono text-[11px] truncate">{pattern}</span>
            {isDone && (
              <span className="opacity-50 text-[10px] text-text-secondary shrink-0">
                {rawPaths.length} {rawPaths.length === 1 ? 'file' : 'files'}
              </span>
            )}
          </div>
        }
        body={
          displayPaths.length > 0 ? (
            <div className="bg-card-background border border-border rounded max-h-[400px] overflow-y-auto">
              <TreeBlock
                files={buildTreeFromPaths(displayPaths)}
                onFileClick={(treePath) => openFileInWorkspace(rawByDisplay.get(treePath) ?? treePath)}
              />
            </div>
          ) : undefined
        }
      />
    )
  }
)
GlobRenderer.displayName = 'GlobRenderer'