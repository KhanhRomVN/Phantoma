// Tool Call Types (tương tự Wu's ToolCall enum)
export type ToolCall =
  | { type: 'exec'; command: string }
  | { type: 'read_file'; path: string }
  | { type: 'write_file'; path: string; content?: string }
  | {
      type: 'edit_file';
      path: string;
      old_string?: string;
      new_string?: string;
    }
  | { type: 'apply_patch'; path?: string }
  | { type: 'search'; pattern: string; path?: string }
  | { type: 'glob'; pattern: string }
  | { type: 'web_fetch'; url: string; prompt?: string }
  | { type: 'web_search'; query: string }
  | { type: 'todo'; items: TodoItem[] }
  | { type: 'mcp'; server: string; tool: string; input?: unknown }
  | { type: 'unknown'; name: string; input?: unknown };

export interface TodoItem {
  id: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
}

export type ToolStatus = 'running' | 'completed' | 'failed' | 'canceled';

export interface ToolEntry {
  id: string;
  call: ToolCall;
  status: ToolStatus;
  output?: string;
  diff?: ToolDiff;
  timestamp: number;
}

export interface ToolDiff {
  path: string;
  old_content: string;
  new_content: string;
}

// Provider & Model Types (tương tự Wu's discovery)
export interface ProviderModel {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  variants?: string[];
}

export interface Provider {
  id: string;
  name: string;
  connected: boolean;
  models: ProviderModel[];
}

export interface MCPServer {
  id: string;
  name: string;
  connected: boolean;
  tools: MCPTool[];
}

export interface MCPTool {
  id: string;
  name: string;
  description?: string;
  inputSchema?: unknown;
}

// Discovery Result
export interface DiscoveryResult {
  providers: Provider[];
  mcpServers: MCPServer[];
  timestamp: number;
  source: 'fresh' | 'stale';
  error?: CatalogFailure;
}

export interface CatalogFailure {
  code: 'failed' | 'auth_required' | 'missing_executable' | 'timeout';
  message: string;
}

// Permission Request
export interface PermissionRequest {
  id: string;
  toolId: string;
  question: string;
  options: string[];
  serverName?: string;
}

// Agent Types
export type AgentKind = 'claude' | 'codex' | 'opencode' | 'custom';

export interface AgentConfig {
  kind: AgentKind;
  executable?: string;
  baseUrl?: string;
  apiKey?: string;
}

// UI State
export interface ToolFilter {
  status?: ToolStatus[];
  type?: ToolCall['type'][];
  search?: string;
}

export interface ToolGrouping {
  mode: 'none' | 'by_status' | 'by_type' | 'by_session';
}
