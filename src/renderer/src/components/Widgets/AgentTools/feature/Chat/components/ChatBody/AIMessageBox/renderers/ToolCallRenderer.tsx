import { memo } from 'react'
import type { Message } from '@renderer/components/Widgets/AgentTools/services/conversationStorage'
import type { ToolCall } from '@renderer/components/Widgets/AgentTools/types'
import { ToolCallFrame, ToolTitle } from './ToolCallFrame'
import { ReadFileRenderer } from './ReadFileRenderer'
import { WriteFileRenderer } from './WriteFileRenderer'
import { EditFileRenderer } from './EditFileRenderer'
import { ApplyPatchRenderer } from './ApplyPatchRenderer'
import { ExecRenderer } from './ExecRenderer'
import { SearchRenderer } from './SearchRenderer'
import { GlobRenderer } from './GlobRenderer'
import { WebFetchRenderer } from './WebFetchRenderer'
import { WebSearchRenderer } from './WebSearchRenderer'
import { TodoRenderer } from './TodoRenderer'
import { McpRenderer } from './McpRenderer'
import { UnknownRenderer } from './UnknownRenderer'

export const ToolCallRenderer = memo<{ message: Message }>(({ message }) => {
  const call = message.toolCall as ToolCall | undefined
  switch (call?.type) {
    case 'exec':
      return <ExecRenderer message={message} call={call} />
    case 'read_file':
      return <ReadFileRenderer message={message} call={call} />
    case 'write_file':
      return <WriteFileRenderer message={message} call={call} />
    case 'edit_file':
      return <EditFileRenderer message={message} call={call} />
    case 'apply_patch':
      return <ApplyPatchRenderer message={message} call={call} />
    case 'search':
      return <SearchRenderer message={message} call={call} />
    case 'glob':
      return <GlobRenderer message={message} call={call} />
    case 'web_fetch':
      return <WebFetchRenderer message={message} call={call} />
    case 'web_search':
      return <WebSearchRenderer message={message} call={call} />
    case 'todo':
      return <TodoRenderer message={message} call={call} />
    case 'mcp':
      return <McpRenderer message={message} call={call} />
    case 'unknown':
      return <UnknownRenderer message={message} call={call} />
    default:
      return (
        <ToolCallFrame
          message={message}
          title={<ToolTitle label="Tool call" value={message.content || undefined} />}
          showOutput
        />
      )
  }
})

ToolCallRenderer.displayName = 'ToolCallRenderer'