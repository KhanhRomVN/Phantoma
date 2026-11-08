/**
 * Agent Tools API Service
 * Handles all communication with backend for agent operations
 */

import type { AgentKind } from '../types';
import type { AgentEvent, RunRequest } from '@app/types/agent-tool';

export interface Provider {
  id: string;
  name: string;
  url?: string;
  models: Model[];
}

export interface Model {
  id: string;
  name: string;
  contextWindow?: number;
  capabilities?: {
    streaming?: boolean;
    toolUse?: boolean;
    imageUpload?: boolean;
  };
}

export interface SendMessageRequest {
  message: string;
  provider: string;
  model: string;
  conversationId?: string;
  systemPrompt?: string;
}

export interface SendMessageResponse {
  content: string;
  conversationId: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  type: 'content' | 'tool_call' | 'tool_result' | 'done';
  content?: string;
  toolCall?: any;
  toolResult?: any;
}

// Danh sách cấp 1 giống wu: mỗi agent (Claude Code / Codex / OpenCode) là một "provider",
// models lấy từ discovery riêng của agent đó
const AGENT_PROVIDERS: Array<{ kind: AgentKind; id: string; name: string; url: string }> = [
  { kind: 'claude', id: 'claude', name: 'Claude Code', url: 'https://claude.ai' },
  { kind: 'codex', id: 'codex', name: 'Codex', url: 'https://openai.com' },
  { kind: 'opencode', id: 'opencode', name: 'OpenCode', url: 'https://opencode.ai' },
];

/**
 * Fetch available agents and their models
 */
export async function fetchProviders(): Promise<Provider[]> {
  const settled = await Promise.allSettled(
    AGENT_PROVIDERS.map(({ kind }) => window.api.agentTool.discover({ kind })),
  );

  return AGENT_PROVIDERS.map((agent, i) => {
    const r = settled[i];
    if (r.status === 'rejected') {
      console.error(`Failed to discover ${agent.name}:`, r.reason);
    }

    const discovered: any[] = r.status === 'fulfilled' ? r.value.providers : [];
    const models: Model[] = discovered.flatMap((p) =>
      p.models.map((m: any) => ({
        id: m.id,
        name: m.name,
        contextWindow: m.contextWindow,
        capabilities: {
          streaming: true, // Assume streaming supported
          toolUse: true,
          imageUpload: false,
        },
      })),
    );
    return { id: agent.id, name: agent.name, url: agent.url, models };
  });
}

export const AGENT_LIST = AGENT_PROVIDERS.map(({ id, name, url }) => ({ id, name, url }));

export function listProviderShells(): Provider[] {
  return AGENT_PROVIDERS.map(({ id, name, url }) => ({ id, name, url, models: [] }));
}

const discoverCache = new Map<string, Provider>();

export async function discoverProvider(id: string): Promise<Provider> {
  const agent = AGENT_PROVIDERS.find((a) => a.id === id);
  if (!agent) throw new Error(`Unknown agent: ${id}`);
  const cached = discoverCache.get(id);
  if (cached) return cached;

  let discovered: any[] = [];
  try {
    discovered = (await window.api.agentTool.discover({ kind: agent.kind })).providers;
  } catch (error) {
    console.error(`Failed to discover ${agent.name}:`, error);
  }
  const models: Model[] = discovered.flatMap((p) =>
    p.models.map((m: any) => ({
      id: m.id,
      name: m.name,
      contextWindow: m.contextWindow,
      capabilities: { streaming: true, toolUse: true, imageUpload: false },
    })),
  );
  const provider: Provider = { id: agent.id, name: agent.name, url: agent.url, models };
  if (models.length > 0) discoverCache.set(id, provider);
  return provider;
}

export async function fetchSessionsFor(id: string): Promise<AgentSessionItem[]> {
  const agent = AGENT_PROVIDERS.find((a) => a.id === id);
  if (!agent) return [];
  try {
    const list = await window.api.agentTool.listSessions({ kind: agent.kind });
    return list.map((s) => ({
      ...s,
      agentId: agent.id,
      agentName: agent.name,
      url: agent.url,
    }));
  } catch (error) {
    console.error(`Failed to list ${agent.name} sessions:`, error);
    return [];
  }
}

export interface AgentSessionItem {
  id: string;
  title: string;
  updatedAt: number;
  agentId: string;
  agentName: string;
  url: string;
}

/**
 * Fetch saved conversations from every agent (agent tự lưu, app chỉ đọc lại)
 */
export async function fetchAgentSessions(): Promise<AgentSessionItem[]> {
  const settled = await Promise.allSettled(
    AGENT_PROVIDERS.map(({ kind }) => window.api.agentTool.listSessions({ kind })),
  );
  const items = settled.flatMap((r, i): AgentSessionItem[] => {
    const agent = AGENT_PROVIDERS[i];
    if (r.status === 'rejected') {
      console.error(`[DEBUG] list sessions ${agent.name} failed:`, r.reason);
      return [];
    }
    return r.value.map((s) => ({
      ...s,
      agentId: agent.id,
      agentName: agent.name,
      url: agent.url,
    }));
  });
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Send message to agent (non-streaming)
 */
export async function sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
  try {
    // TODO: Replace with actual backend endpoint
    // For now, simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      content: `Response from ${request.provider}/${request.model}: ${request.message}`,
      conversationId: request.conversationId || generateConversationId(),
      usage: {
        promptTokens: request.message.length,
        completionTokens: 100,
        totalTokens: request.message.length + 100,
      },
    };
  } catch (error) {
    console.error('Failed to send message:', error);
    throw new Error(
      `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Send message with streaming support
 */
export async function* sendMessageStream(
  request: SendMessageRequest,
): AsyncGenerator<StreamChunk, void, unknown> {
  try {
    // TODO: Replace with actual streaming endpoint
    // For now, simulate streaming
    const fullResponse = `This is a streaming response from ${request.provider}/${request.model}.\n\nYour message was: "${request.message}"\n\nThis response is being streamed chunk by chunk to simulate real-time updates.`;
    const words = fullResponse.split(' ');

    for (const word of words) {
      yield {
        type: 'content',
        content: word + ' ',
      };
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    yield { type: 'done' };
  } catch (error) {
    console.error('Failed to stream message:', error);
    throw new Error(
      `Failed to stream message: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

export interface AgentRunHandle {
  runId: string;
  events: AsyncGenerator<AgentEvent, void, unknown>;
}

/**
 * Start a real agent run; events are streamed from main via agent-tool:event
 */
export function startAgentRun(request: Omit<RunRequest, 'runId'>): AgentRunHandle {
  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const queue: AgentEvent[] = [];
  let wake: (() => void) | null = null;

  const push = (event: AgentEvent): void => {
    queue.push(event);
    wake?.();
  };

  const unsubscribe = window.api.agentTool.onEvent((data) => {
    if (data.runId === runId) push(data.event as AgentEvent);
  });

  window.api.agentTool.run({ ...request, runId }).catch((error: unknown) => {
    push({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    push({ type: 'done', status: 'errored' });
  });

  async function* events(): AsyncGenerator<AgentEvent, void, unknown> {
    try {
      while (true) {
        const next = queue.shift();
        if (!next) {
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
          wake = null;
          continue;
        }
        yield next;
        if (next.type === 'done') return;
      }
    } finally {
      unsubscribe();
    }
  }

  return { runId, events: events() };
}

export function interruptAgentRun(runId: string): Promise<void> {
  return window.api.agentTool.interrupt(runId);
}

/**
 * Generate unique conversation ID
 */
function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
