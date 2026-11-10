import { memo, useState, type ReactNode } from 'react'
import { TagHeader } from '@renderer/components/Widgets/Zen/feature/Chat/components/ChatBody/AIMessageBox/TagHeader'
import type { Message } from '@renderer/components/Widgets/AgentTools/services/conversationStorage'
import ErrorBlock from '../ErrorBlock'
import { toRelativePath } from '@renderer/components/Widgets/AgentTools/shared/workingPath'
import { openFileInWorkspace } from '@renderer/components/Widgets/AgentTools/shared/openFile'

export type ToolStatus = 'running' | 'completed' | 'failed'

export const getToolStatus = (message: Message): ToolStatus =>
  message.toolResult ? (message.toolResult.error ? 'failed' : 'completed') : 'running'

const STATUS_COLOR: Record<ToolStatus, string> = {
  running: 'rgb(106, 122, 154)',
  completed: 'rgb(48, 209, 88)',
  failed: 'rgb(255, 45, 85)'
}

const FILE_TOOLS = new Set(['read_file', 'write_file', 'edit_file', 'apply_patch'])

export const baseName = (path: string): string => path.split('/').pop() || path

export interface DiffLine {
  kind: 'add' | 'del'
  text: string
}

const toLines = (kind: DiffLine['kind'], text?: string): DiffLine[] =>
  text ? text.split('\n').map((line) => ({ kind, text: line })) : []

export const diffFromTexts = (oldText?: string, newText?: string): DiffLine[] => [
  ...toLines('del', oldText),
  ...toLines('add', newText)
]

export const diffStatsOf = (lines: DiffLine[]): { added: number; removed: number } => ({
  added: lines.filter((l) => l.kind === 'add').length,
  removed: lines.filter((l) => l.kind === 'del').length
})

export const ToolTitle = ({
  label,
  value,
  icon
}: {
  label: string
  value?: string
  icon?: ReactNode
}): ReactNode => (
  <div className="flex items-center gap-2 text-xs text-text-primary min-w-0">
    <span className="font-semibold opacity-80 shrink-0">{label}</span>
    {icon}
    {value && <span className="font-medium opacity-90 font-mono text-[11px] truncate">{value}</span>}
  </div>
)

export const OutputBlock = ({ text }: { text: string }): ReactNode => (
  <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded bg-input-background border border-border p-2 text-[11px] font-mono text-text-secondary">
    {text}
  </pre>
)

export const DiffLines = ({ lines }: { lines: DiffLine[] }): ReactNode => (
  <pre className="max-h-60 overflow-auto rounded bg-input-background border border-border p-2 text-[11px] font-mono">
    {lines.map((line, index) => (
      <div key={index} className={line.kind === 'add' ? 'text-green-500' : 'text-red-500'}>
        {(line.kind === 'add' ? '+ ' : '- ') + line.text}
      </div>
    ))}
  </pre>
)

interface ToolCallFrameProps {
  message: Message
  title: ReactNode
  toolType?: string
  path?: string
  absolutePath?: boolean
  diffStats?: { added: number; removed: number }
  body?: ReactNode
  showOutput?: boolean
  defaultOpen?: boolean
}

export const ToolCallFrame = memo<ToolCallFrameProps>(
  ({
    message,
    title,
    toolType,
    path,
    absolutePath,
    diffStats,
    body,
    showOutput,
    defaultOpen = false
  }) => {
    const [open, setOpen] = useState(defaultOpen)
    const status = getToolStatus(message)
    const output = message.toolResult?.output as string | undefined
    const error = message.toolResult?.error as string | undefined
    const showOutputBlock = !!showOutput && !!output?.trim()
    const isFileTool = !!path && FILE_TOOLS.has(toolType ?? '')
    const hasBody = !isFileTool && (!!body || showOutputBlock)

    return (
      <div className="flex flex-col gap-1.5 pb-1 mb-0.5">
        <TagHeader
          title={title}
          statusColor={STATUS_COLOR[status]}
          isError={status === 'failed'}
          toolType={toolType}
          path={path && !absolutePath ? toRelativePath(path) : path}
          compactPath
          onPathClick={isFileTool && path ? () => openFileInWorkspace(path) : undefined}
          onClick={isFileTool && path ? () => openFileInWorkspace(path) : undefined}
          diffStats={diffStats}
          isCollapsed={hasBody ? !open : undefined}
          onToggleCollapse={hasBody ? () => setOpen((v) => !v) : undefined}
        />
        {status === 'failed' && error && <ErrorBlock content={error} compact maxHeight="300px" />}
        {open && hasBody && (
          <div className="flex flex-col gap-1.5 pl-3">
            {body}
            {showOutputBlock && <OutputBlock text={output as string} />}
          </div>
        )}
      </div>
    )
  }
)

ToolCallFrame.displayName = 'ToolCallFrame'