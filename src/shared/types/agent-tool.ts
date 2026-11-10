// Shared types between main and renderer for Agent Tools

export type ToolCall =
  | { type: 'exec'; command: string }
  | { type: 'read_file'; path: string }
  | { type: 'write_file'; path: string; content?: string }
  | {
      type: 'edit_file'
      path: string
      old_string?: string
      new_string?: string
    }
  | { type: 'apply_patch'; path?: string }
  | { type: 'search'; pattern: string; path?: string }
  | { type: 'glob'; pattern: string }
  | { type: 'web_fetch'; url: string; prompt?: string }
  | { type: 'web_search'; query: string }
  | { type: 'todo'; items: TodoItem[] }
  | { type: 'mcp'; server: string; tool: string; input?: unknown }
  | { type: 'unknown'; name: string; input?: unknown }

export interface TodoItem {
  id: string
  description: string
  status: 'pending' | 'completed' | 'failed'
}

export type ToolStatus = 'running' | 'completed' | 'failed' | 'canceled'

export interface ToolEntry {
  id: string
  call: ToolCall
  status: ToolStatus
  output?: string
  diff?: ToolDiff
  timestamp: number
}

export interface ToolDiff {
  path: string
  old_content: string
  new_content: string
}

export interface ProviderModel {
  id: string
  name: string
  provider: string
  contextWindow?: number
  variants?: string[]
}

export interface Provider {
  id: string
  name: string
  connected: boolean
  models: ProviderModel[]
}

export interface MCPServer {
  id: string
  name: string
  connected: boolean
  tools: MCPTool[]
}

export interface MCPTool {
  id: string
  name: string
  description?: string
  inputSchema?: unknown
}

export interface DiscoveryResult {
  providers: Provider[]
  agents?: string[]
  mcpServers: MCPServer[]
  timestamp: number
  source: 'fresh' | 'stale'
  error?: CatalogFailure
}

export interface CatalogFailure {
  code: 'failed' | 'auth_required' | 'missing_executable' | 'timeout'
  message: string
}

export interface PermissionRequest {
  id: string
  toolId?: string
  question: string
  options: string[]
  serverName?: string
}

export type AgentKind = 'claude' | 'codex' | 'opencode' | 'custom'

export interface AgentConfig {
  kind: AgentKind
  executable?: string
  baseUrl?: string
  apiKey?: string
}

export type AgentDoneStatus = 'completed' | 'interrupted' | 'errored'

export interface PlanUsageWindow {
  label: string
  usedFraction: number
  resetsAt?: number
}

export interface PlanUsage {
  windows: PlanUsageWindow[]
  planLabel?: string
}

export type PlanUsageResult = { ok: true; usage: PlanUsage } | { ok: false; error: string }

export type AgentEvent =
  | { type: 'session_started'; sessionId: string; model?: string }
  | { type: 'text_delta'; text: string }
  | { type: 'reasoning_delta'; text: string }
  | { type: 'message_completed' }
  | { type: 'tool_call'; id: string; call: ToolCall }
  | { type: 'tool_result'; id: string; isError: boolean; output?: string; diff?: ToolDiff }
  | { type: 'error'; message: string }
  | { type: 'context_usage'; tokens?: number; window?: number }
  | { type: 'usage'; inputTokens: number; outputTokens: number }
  | { type: 'done'; status: AgentDoneStatus; error?: string; sessionId?: string }

export interface RunRequest {
  runId: string
  kind: AgentKind
  prompt: string
  model?: string
  cwd?: string
  resume?: string
  variant?: string
  agent?: string
  contextSize?: string
  executable?: string
  baseUrl?: string
}