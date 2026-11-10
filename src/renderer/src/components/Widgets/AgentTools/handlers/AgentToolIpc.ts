import type {
  AgentConfig,
  AgentEvent,
  AgentKind,
  DiscoveryResult,
  PlanUsageResult,
  RunRequest
} from '@app/types/agent-tool'

export interface AgentSessionRaw {
  id: string
  title: string
  updatedAt: number
  messageCount?: number
  totalTokens?: number
  modelId?: string
}

export interface PermissionRequestPayload {
  id: string
  question: string
  options: string[]
  serverName?: string
}

export class AgentToolIpc {
  private get api(): Window['api']['agentTool'] {
    return window.api.agentTool
  }

  public discover(config: Pick<AgentConfig, 'kind'> & Partial<AgentConfig>): Promise<DiscoveryResult> {
    return this.api.discover(config)
  }

  public listSessions(config: Pick<AgentConfig, 'kind'>): Promise<AgentSessionRaw[]> {
    return this.api.listSessions(config)
  }

  public loadSession(
    config: Pick<AgentConfig, 'kind'>,
    sessionId: string
  ): Promise<
    Array<{ role: 'user' | 'assistant'; content: string; thinking?: string; timestamp: number }>
  > {
    return this.api.loadSession(config, sessionId)
  }

  public run(request: RunRequest): Promise<{ ok: boolean }> {
    return this.api.run(request)
  }

  public interrupt(runId: string): Promise<void> {
    return this.api.interrupt(runId)
  }

  public planUsage(kind: AgentKind): Promise<PlanUsageResult> {
    return this.api.planUsage(kind)
  }

  public resolvePermission(id: string, approved: boolean): Promise<void> {
    return this.api.resolvePermission(id, approved)
  }

  public onEvent(listener: (data: { runId: string; event: AgentEvent }) => void): () => void {
    return this.api.onEvent(listener)
  }

  public onPermissionRequest(listener: (data: PermissionRequestPayload) => void): () => void {
    return this.api.onPermissionRequest(listener)
  }
}

export const agentToolIpc = new AgentToolIpc()