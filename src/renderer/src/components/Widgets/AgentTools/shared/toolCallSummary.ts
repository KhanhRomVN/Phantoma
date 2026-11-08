import type { ToolCall } from '../types'

export interface ToolCallSummary {
  label: string
  detail?: string
}

export function describeToolCall(call?: ToolCall | null): ToolCallSummary | null {
  if (!call || typeof call !== 'object') return null

  switch (call.type) {
    case 'exec':
      return { label: 'Run command', detail: call.command }
    case 'read_file':
      return { label: 'Read file', detail: call.path }
    case 'write_file':
      return { label: 'Write file', detail: call.path }
    case 'edit_file':
      return { label: 'Edit file', detail: call.path }
    case 'apply_patch':
      return { label: 'Apply patch', detail: call.path }
    case 'search':
      return { label: 'Search', detail: call.path ? `${call.pattern} in ${call.path}` : call.pattern }
    case 'glob':
      return { label: 'Find files', detail: call.pattern }
    case 'web_fetch':
      return { label: 'Fetch URL', detail: call.url }
    case 'web_search':
      return { label: 'Web search', detail: call.query }
    case 'todo':
      return { label: 'Update todo', detail: `${call.items.length} item(s)` }
    case 'mcp':
      return { label: `Use ${call.server}: ${call.tool}` }
    case 'unknown':
      return { label: call.name }
    default:
      return null
  }
}