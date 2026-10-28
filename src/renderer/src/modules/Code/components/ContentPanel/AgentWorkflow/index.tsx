import { memo, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  ClipboardList,
  Cpu,
  Hammer,
  Link2,
  MessagesSquare,
  ScanSearch,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { MarkdownRenderer } from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/renderers/MarkdownRenderer';
import UserMessageBox from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/UserMessageBox';
import type { Message } from '@renderer/components/RightPanel/Zen/feature/Chat/types/message';
import { getAgentFavicon } from '../../../constants/workspaceAgents';
import { useCodeStore, type StoredWorkspacePanel } from '../../../hooks/useCodeStore';
import { EMPTY_AGENT_CONFIG, useWorkflowStore } from '../../../hooks/useWorkflowStore';
import {
  USER_ID,
  type AgentId,
  type AgentType,
  type ParticipantId,
  type ParticipantSnapshot,
  type WorkflowAgent,
  type WorkflowLinks,
} from '../../../types/agents';

const NO_PANELS: StoredWorkspacePanel[] = [];

const AGENT_TYPE_ICONS: Record<AgentType, LucideIcon> = {
  orchestrator: Workflow,
  executor: Hammer,
  planner: ClipboardList,
  reviewer: ScanSearch,
  recon_planner: ClipboardList,
  recon_web: ScanSearch,
  recon_local: Hammer,
  recon_verifier: AlertTriangle,
  recon_synthesizer: Cpu,
};

function AgentAvatar({
  agent,
  size = 24,
}: {
  agent: Pick<WorkflowAgent, 'type' | 'color'>;
  size?: number;
}) {
  const Icon = AGENT_TYPE_ICONS[agent.type] ?? Workflow;
  return (
    <span
      className="shrink-0 rounded-lg grid place-items-center bg-white/[0.06]"
      style={{ width: size, height: size, color: agent.color }}
    >
      <Icon size={Math.round(size * 0.55)} />
    </span>
  );
}

function UserAvatar({ size = 24 }: { size?: number }) {
  const logoSize = Math.round(size * 0.65);
  return (
    <span
      className="shrink-0 rounded-lg grid place-items-center bg-white/[0.06]"
      style={{ width: size, height: size }}
    >
      <img
        src="/images/phantoma-dark-logo.png"
        alt="You"
        className="shrink-0 object-contain dark:hidden"
        style={{ width: logoSize, height: logoSize }}
        draggable={false}
      />
      <img
        src="/images/phantoma-light-logo.png"
        alt="You"
        className="shrink-0 object-contain hidden dark:block"
        style={{ width: logoSize, height: logoSize }}
        draggable={false}
      />
    </span>
  );
}

function ParticipantTag({
  id,
  info,
  agents,
}: {
  id: ParticipantId;
  info?: ParticipantSnapshot;
  agents: WorkflowAgent[];
}) {
  const config = useWorkflowStore((s) => s.configs[id] ?? EMPTY_AGENT_CONFIG);
  const [failed, setFailed] = useState(false);
  const live = agents.find((a) => a.id === id);
  const name = id === USER_ID ? 'You' : (info?.name ?? live?.name ?? id);
  const color = info?.color ?? live?.color;
  const providerId = info?.providerId ?? config.model?.providerId ?? config.model?.provider_id;
  const modelId = info?.modelId ?? config.model?.modelId ?? config.model?.id;
  const iconUrl = providerId ? getAgentFavicon(providerId) : undefined;
  return (
    <span className="inline-flex items-center gap-1 min-w-0">
      <span className="font-medium shrink-0" style={{ color }}>
        @{name}
      </span>
      {providerId && modelId && (
        <span className="inline-flex items-center gap-1 min-w-0">
          <span className="shrink-0">(</span>
          {iconUrl && !failed ? (
            <img
              src={iconUrl}
              alt=""
              draggable={false}
              className="w-3 h-3 shrink-0 rounded-[2px] object-contain"
              onError={() => setFailed(true)}
            />
          ) : (
            <Cpu size={11} className="shrink-0 text-text-secondary opacity-70" />
          )}
          <span className="font-mono text-text-primary truncate">
            {providerId}/{modelId}
          </span>
          <span className="shrink-0">)</span>
        </span>
      )}
    </span>
  );
}

function ModelBadge({ agentId, className }: { agentId: string; className?: string }) {
  const config = useWorkflowStore((s) => s.configs[agentId] ?? EMPTY_AGENT_CONFIG);
  const [failed, setFailed] = useState(false);
  const providerId = config.model?.providerId ?? config.model?.provider_id;
  const modelId = config.model?.modelId ?? config.model?.id;
  if (!providerId || !modelId) return null;
  const email = config.account?.email ?? config.account?.accountId ?? config.account?.id;
  const iconUrl = getAgentFavicon(providerId);
  return (
    <span className={cn('flex items-center gap-1.5 min-w-0 text-[11px] leading-[1.3]', className)}>
      {iconUrl && !failed ? (
        <img
          src={iconUrl}
          alt=""
          draggable={false}
          className="w-3.5 h-3.5 shrink-0 rounded-[2px] object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <Cpu size={12} className="shrink-0 text-text-secondary opacity-70" />
      )}
      <span className="font-mono text-text-primary truncate">
        {providerId}/{modelId}
      </span>
      {email && (
        <span className="font-mono text-text-secondary opacity-60 truncate">{email}</span>
      )}
    </span>
  );
}

function CardWarning({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2.5 flex items-start gap-2 px-2.5 py-2 rounded-lg bg-amber-400/10 text-[11px] leading-snug text-amber-300/90">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
      <span>{children}</span>
    </div>
  );
}

function AgentCard({
  agent,
  link,
  msgCount,
  onOpen,
}: {
  agent: WorkflowAgent;
  link?: WorkflowLinks[string];
  msgCount: number;
  onOpen: () => void;
}) {
  const config = useWorkflowStore((s) => s.configs[agent.id] ?? EMPTY_AGENT_CONFIG);
  const configured = !!config.model && !!config.account;
  const linked = !!link;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className="p-3 rounded-xl bg-white/[0.03] cursor-pointer transition-colors outline-none hover:bg-white/[0.06] focus-visible:bg-white/[0.08]"
    >
      <div className="flex items-center gap-2.5">
        <AgentAvatar agent={agent} size={32} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-text-primary truncate">{agent.name}</p>
          <p className="text-[11px] text-text-secondary truncate">{agent.title}</p>
        </div>
      </div>

      <ModelBadge agentId={agent.id} className="mt-2.5" />

      {linked && (
        <p className="mt-2.5 text-[12px] text-text-secondary leading-snug break-words">
          {link.title || 'No conversation yet'}
        </p>
      )}

      {!configured && (
        <CardWarning>No model or account selected. Choose them in the Zen tab.</CardWarning>
      )}

      {msgCount > 0 && (
        <div className="mt-2.5 text-[11px] text-text-secondary">
          <span className="font-medium text-text-primary">{msgCount}</span> msg
        </div>
      )}
    </div>
  );
}

function EmptyState({ agent, linked }: { agent: WorkflowAgent; linked: boolean }) {
  const Icon = linked ? MessagesSquare : Link2;
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-8">
      <div className="relative mb-6">
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-30"
          style={{ background: agent.color }}
        />
        <div className="relative w-20 h-20 rounded-3xl grid place-items-center bg-white/[0.04]">
          <AgentAvatar agent={agent} size={44} />
          <span className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full grid place-items-center bg-background text-text-secondary">
            <span
              className="w-6 h-6 rounded-full grid place-items-center"
              style={{ background: `${agent.color}26`, color: agent.color }}
            >
              <Icon className="w-3.5 h-3.5" />
            </span>
          </span>
        </div>
      </div>
      <h3 className="text-[15px] font-semibold text-text-primary">
        {linked ? 'No messages yet' : `Link the ${agent.name}`}
      </h3>
      <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-text-secondary">
        {linked
          ? `Chat with the ${agent.name} in its Zen tab. Messages between agents will appear here.`
          : `Enable multi-agent in a Zen tab of this branch to link the ${agent.name}. Messages between agents will appear here.`}
      </p>
    </div>
  );
}

interface AgentWorkflowProps {}

export const AgentWorkflow = memo(function AgentWorkflow({}: AgentWorkflowProps) {
  // Get agents and messages from workflow store
  const agents = useWorkflowStore((s) => s.agents);
  const allMessages = useWorkflowStore((s) => s.messages);
  const orchestrator = agents[0]; // Orchestrator is always first

  const sessionId = useCodeStore((s) => s.activeWorkspaceSessionId);
  const storedPanels = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.workspacePanels ?? NO_PANELS,
  );
  const setContentViewMode = useCodeStore((s) => s.setContentViewMode);
  const requestFocusPanel = useCodeStore((s) => s.requestFocusPanel);

  const panelByAgent = useMemo(() => {
    const map: Record<string, StoredWorkspacePanel> = {};
    for (const p of storedPanels) {
      if (p.workflowAgentId && p.sessionId === sessionId) map[p.workflowAgentId] = p;
    }
    return map;
  }, [storedPanels, sessionId]);

  const links = useMemo<WorkflowLinks>(() => {
    const result: WorkflowLinks = {};
    for (const [agentId, panel] of Object.entries(panelByAgent)) {
      result[agentId] = { title: panel.agentConversationId ? (panel.agentTitle ?? null) : null };
    }
    return result;
  }, [panelByAgent]);

  const visibleAgents = useMemo(
    () => agents.filter((a) => panelByAgent[a.id]),
    [agents, panelByAgent],
  );

  const orchestratorConversationId = panelByAgent[orchestrator.id]?.agentConversationId ?? null;

  const messages = useMemo(() => {
    if (!orchestratorConversationId) return [];
    return allMessages.filter((m) => m.conversationId === orchestratorConversationId);
  }, [allMessages, orchestratorConversationId]);

  const openAgent = (agentId: AgentId) => {
    const panel = panelByAgent[agentId];
    setContentViewMode('workspace');
    if (panel && sessionId) requestFocusPanel(sessionId, panel.id);
  };

  const orchestratorLinked = !!links[orchestrator.id];

  return (
    <div className="flex flex-1 h-full w-full min-h-0 bg-background text-text-primary">
      <aside className="w-64 shrink-0 border-r border-divider bg-sidebar-background flex flex-col min-h-0">
        <div className="h-9 shrink-0 px-3 flex items-center border-b border-divider text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Agents
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
          {visibleAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              link={links[agent.id]}
              msgCount={messages.filter((m) => m.from === agent.id || m.to === agent.id).length}
              onOpen={() => openAgent(agent.id)}
            />
          ))}
        </div>
      </aside>

      <section className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="h-9 shrink-0 px-3 flex items-center border-b border-divider text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Conversation
        </div>
        {messages.length === 0 ? (
          <EmptyState agent={orchestrator} linked={orchestratorLinked} />
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
            {messages.map((m) => {
              const mine = m.from === USER_ID;
              const sender = mine ? undefined : agents.find((a) => a.id === m.from);
              return (
                <div key={m.id} className={cn('flex items-start gap-2.5', mine && 'flex-row-reverse')}>
                  {mine ? (
                    <UserAvatar size={28} />
                  ) : (
                    <AgentAvatar
                      agent={
                        sender ?? {
                          type: m.fromInfo?.type ?? 'executor',
                          color: m.fromInfo?.color ?? '#9CA3AF',
                        }
                      }
                      size={28}
                    />
                  )}
                  <div className={cn('flex flex-col min-w-0 max-w-[75%]', mine && 'items-end')}>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-text-secondary mb-0.5">
                      <ParticipantTag id={m.from} info={m.fromInfo} agents={agents} />
                      <span className="shrink-0">→</span>
                      <ParticipantTag id={m.to} info={m.toInfo} agents={agents} />
                      <span className="shrink-0">· {m.time}</span>
                    </div>
                    {mine ? (
                      <div className="w-full min-w-0">
                        <UserMessageBox
                          readOnly
                          message={
                            {
                              id: m.id,
                              role: 'user',
                              content: `## User Message\n<user-message>\n${m.content}\n</user-message>`,
                              timestamp: m.timestamp,
                            } as unknown as Message
                          }
                        />
                      </div>
                    ) : (
                      <div className="px-3 py-2 rounded-lg bg-card-background min-w-0 max-w-full overflow-hidden">
                        <MarkdownRenderer content={m.content} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
});

export default AgentWorkflow;