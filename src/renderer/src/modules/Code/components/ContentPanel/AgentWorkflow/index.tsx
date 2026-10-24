import { Fragment, memo, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { AlertTriangle, Link2, MessagesSquare } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { getAgentFavicon } from '../../../constants/workspaceAgents';
import { useCodeStore, type StoredWorkspacePanel } from '../../../hooks/useCodeStore';
import { EMPTY_AGENT_CONFIG, useWorkflowStore } from '../../../hooks/useWorkflowStore';
import {
  USER_ID,
  type AgentId,
  type ParticipantId,
  type WorkflowAgent,
  type WorkflowLinks,
} from '../../../types/agents';

const NO_PANELS: StoredWorkspacePanel[] = [];

const mentionOf = (id: ParticipantId, agents: WorkflowAgent[]) =>
  id === USER_ID ? 'You' : `@${agents.find((a) => a.id === id)?.name ?? id}`;

const createMentionRegex = (agents: WorkflowAgent[]) =>
  new RegExp(`(@(?:${agents.map((a) => a.name).join('|')}))`, 'g');

function renderContent(content: string, agents: WorkflowAgent[]): ReactNode {
  const mentionRegex = createMentionRegex(agents);
  return content.split(mentionRegex).map((part, i) => {
    const agent = agents.find((a) => `@${a.name}` === part);
    return agent ? (
      <span key={i} className="font-medium" style={{ color: agent.color }}>
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    );
  });
}

function AgentAvatar({
  agent,
  iconUrl,
  size = 24,
}: {
  agent: WorkflowAgent;
  iconUrl?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className="shrink-0 rounded-lg grid place-items-center overflow-hidden bg-white/[0.06] text-[11px] font-semibold"
      style={{ width: size, height: size, color: agent.color }}
    >
      {iconUrl && !failed ? (
        <img
          src={iconUrl}
          alt=""
          draggable={false}
          className="w-3/5 h-3/5 object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        agent.name.charAt(0)
      )}
    </span>
  );
}

function UserAvatar({ size = 24 }: { size?: number }) {
  return (
    <span
      className="shrink-0 rounded-lg grid place-items-center bg-white/[0.06] text-[10px] font-semibold text-text-secondary"
      style={{ width: size, height: size }}
    >
      You
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
  const iconUrl = getAgentFavicon(config.model?.providerId);

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
        <AgentAvatar agent={agent} iconUrl={iconUrl} size={32} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-text-primary truncate">{agent.name}</p>
          <p className="text-[11px] text-text-secondary truncate">{agent.title}</p>
        </div>
      </div>

      {linked && (
        <p className="mt-2.5 text-[12px] text-text-secondary leading-snug break-words">
          {link.title || 'No conversation yet'}
        </p>
      )}

      {!linked ? (
        <CardWarning>Zen tab is not linked. Click to link.</CardWarning>
      ) : !configured ? (
        <CardWarning>No model or account selected. Choose them in the Zen tab.</CardWarning>
      ) : null}

      {msgCount > 0 && (
        <div className="mt-2.5 text-[11px] text-text-secondary">
          <span className="font-medium text-text-primary">{msgCount}</span> msg
        </div>
      )}
    </div>
  );
}

function EmptyState({
  agent,
  iconUrl,
  linked,
}: {
  agent: WorkflowAgent;
  iconUrl?: string;
  linked: boolean;
}) {
  const Icon = linked ? MessagesSquare : Link2;
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-8">
      <div className="relative mb-6">
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-30"
          style={{ background: agent.color }}
        />
        <div className="relative w-20 h-20 rounded-3xl grid place-items-center bg-white/[0.04]">
          <AgentAvatar agent={agent} iconUrl={iconUrl} size={44} />
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
  const messages = useWorkflowStore((s) => s.messages);
  const orchestrator = agents[0]; // Orchestrator is always first
  const config = useWorkflowStore((s) => s.configs[orchestrator.id] ?? EMPTY_AGENT_CONFIG);
  const orchestratorIcon = getAgentFavicon(config.model?.providerId);

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
      result[agentId] = { title: panel.agentTitle ?? null };
    }
    return result;
  }, [panelByAgent]);

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
          {agents.map((agent) => (
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
          <EmptyState agent={orchestrator} iconUrl={orchestratorIcon} linked={orchestratorLinked} />
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
            {messages.map((m) => {
              const mine = m.from === USER_ID;
              const sender = mine ? undefined : agents.find((a) => a.id === m.from);
              return (
                <div key={m.id} className={cn('flex items-end gap-2.5', mine && 'flex-row-reverse')}>
                  {sender ? (
                    <AgentAvatar agent={sender} iconUrl={orchestratorIcon} size={28} />
                  ) : (
                    <UserAvatar size={28} />
                  )}
                  <div className={cn('flex flex-col min-w-0 max-w-[75%]', mine && 'items-end')}>
                    <div className="text-[11px] text-text-secondary mb-0.5">
                      <span className="font-medium" style={{ color: sender?.color }}>
                        {mentionOf(m.from, agents)}
                      </span>{' '}
                      → {mentionOf(m.to, agents)} · {m.time}
                    </div>
                    <div className="px-3 py-2 rounded-lg text-[13px] leading-relaxed bg-card-background">
                      {renderContent(m.content, agents)}
                    </div>
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