// ─── Agent Types ─────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  isHidden?: boolean
}

export interface ToolAction {
  type: string
  rawXml: string
  params: Record<string, unknown>
}

export interface ParsedMessage {
  thinking: string | null
  displayText: string
  actions: ToolAction[]
}

export interface Provider {
  provider_id: string
  provider_name: string
  website_url?: string
  website?: string
  is_enabled: boolean
  models: Model[]
}

export interface Model {
  id: string
  name: string
  description?: string
  provider_id?: string
  max_context_length?: number
  context_length?: number
  is_thinking?: boolean
  is_search?: boolean
  success_rate?: number
}

export interface Account {
  id: string
  provider_id: string
  email: string
  credential?: string
  total_requests?: number
  total_tokens?: number
  daily_requests?: number
  is_active?: boolean
  created_at?: string
}

export interface ToolOutput {
  output: string
  isError: boolean
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface AgentSettings {
  apiUrl: string
  language: string
  aiLanguage: string
  activeModelId: string | null
  activeAccountId: string | null
}

// ─── API Types ──────────────────────────────────────────────────────────────

export interface ChatRequest {
  model_id: string
  account_id: string
  messages: Array<{ role: string; content: string }>
  stream?: boolean
}

export interface ChatStreamChunk {
  type: 'content' | 'tool_call' | 'tool_result' | 'error' | 'done'
  content?: string
  tool_name?: string
  tool_params?: Record<string, unknown>
  tool_output?: string
  tool_error?: boolean
  error?: string
}

// ─── Storage Keys ───────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  API_URL: 'aiweb2api-url',
  LANGUAGE: 'preferred-language',
  AI_LANGUAGE: 'ai-language',
  ACTIVE_MODEL_ID: 'active-model-id',
  ACTIVE_ACCOUNT_ID: 'active-account-id',
  ACTIVE_CONVERSATION_ID: 'active-conversation-id',
  SESSIONS: 'agent-sessions',
} as const