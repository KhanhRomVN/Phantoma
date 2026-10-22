import { Fragment, memo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { getAgentFavicon } from '../../../../constants/workspaceAgents';
import { EMPTY_AGENT_CONFIG, useWorkflowStore } from '../../../../hooks/useWorkflowStore';
import {
  USER_ID,
  WORKFLOW_AGENTS,
  getWorkflowAgent,
  type AgentId,
  type ParticipantId,
  type WorkflowAgent,
  type WorkflowLinks,
  type WorkflowMessage,
} from './agents';

const EMPTY_LINKS: WorkflowLinks = {};
const EMPTY_MESSAGES: WorkflowMessage[] = [];

const mentionOf = (id: ParticipantId) =>
  id === USER_ID ? 'You' : `@${getWorkflowAgent(id)?.name ?? id}`;

const MENTION_REGEX = new RegExp(`(@(?:${WORKFLOW_AGENTS.map((a) => a.name).join('|')}))`, 'g');

function renderContent(content: string): ReactNode {
  return content.split(MENTION_REGEX).map((part, i) => {
    const agent = WORKFLOW_AGENTS.find((a) => `@${a.name}` === part);
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
      className="shrink-0 rounded-md grid place-items-center overflow-hidden bg-white/[0.06] border border-white/10 text-[11px] font-semibold"
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
      className="shrink-0 rounded-md grid place-items-center bg-white/[0.06] border border-white/10 text-[10px] font-semibold text-text-secondary"
      style={{ width: size, height: size }}
    >
      You
    </span>
  );
}

function CardWarning({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 flex items-start gap-1.5 px-2 py-1.5 rounded-md border border-amber-400/40 bg-amber-400/10 text-[11px] leading-snug text-amber-300">
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
      className={cn(
        'p-3 rounded-lg border bg-card-background/60 cursor-pointer transition-colors outline-none',
        'hover:bg-card-background focus-visible:border-primary/60',
        linked && configured ? 'border-divider' : 'border-amber-400/40',
      )}
    >
      <div className="flex items-center gap-2.5">
        <AgentAvatar agent={agent} iconUrl={iconUrl} size={28} />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-text-primary truncate">{agent.name}</p>
          <p className="text-[11px] text-text-secondary truncate">{agent.title}</p>
        </div>
      </div>

      {linked && (
        <p className="mt-2 text-[12px] text-text-secondary leading-snug break-words">
          {link.title || 'No conversation yet'}
        </p>
      )}

      {!linked ? (
        <CardWarning>Zen tab is not linked. Click to link.</CardWarning>
      ) : !configured ? (
        <CardWarning>No model or account selected. Choose them in the Zen tab.</CardWarning>
      ) : null}

      {msgCount > 0 && (
        <div className="mt-2 pt-2 border-t border-divider text-[11px] text-text-secondary">
          <span className="font-medium text-text-primary">{msgCount}</span> msg
        </div>
      )}
    </div>
  );
}

interface AgentWorkflowProps {
  onOpenAgent?: (agentId: AgentId) => void;
  links?: WorkflowLinks;
  /** Messages exchanged between agents. Chatting with the Orchestrator happens in its Zen tab. */
  messages?: WorkflowMessage[];
}

export const AgentWorkflow = memo(function AgentWorkflow({
  onOpenAgent,
  links = EMPTY_LINKS,
  messages = EMPTY_MESSAGES,
}: AgentWorkflowProps) {
  const orchestrator = WORKFLOW_AGENTS[0];
  const config = useWorkflowStore((s) => s.configs[orchestrator.id] ?? EMPTY_AGENT_CONFIG);
  const orchestratorIcon = getAgentFavicon(config.model?.providerId);
  const orchestratorLinked = !!links[orchestrator.id];

  return (
    <div className="flex h-full w-full min-h-0 bg-background text-text-primary">
      <aside className="w-64 shrink-0 border-r border-divider bg-sidebar-background flex flex-col min-h-0">
        <div className="h-9 shrink-0 px-3 flex items-center border-b border-divider text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Agents
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
          {WORKFLOW_AGENTS.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              link={links[agent.id]}
              msgCount={messages.filter((m) => m.from === agent.id || m.to === agent.id).length}
              onOpen={() => onOpenAgent?.(agent.id)}
            />
          ))}
        </div>
      </aside>

      <section className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="h-9 shrink-0 px-3 flex items-center border-b border-divider text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Conversation
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-[13px] text-text-secondary">
              {orchestratorLinked
                ? 'Chat with the Orchestrator in its Zen tab. Messages between agents will appear here.'
                : 'Link the Orchestrator Zen tab (click its card) to start chatting.'}
            </p>
          )}
          {messages.map((m) => {
            const mine = m.from === USER_ID;
            const sender = mine ? undefined : getWorkflowAgent(m.from);
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
                      {mentionOf(m.from)}
                    </span>{' '}
                    → {mentionOf(m.to)} · {m.time}
                  </div>
                  <div className="px-3 py-2 rounded-lg text-[13px] leading-relaxed bg-card-background">
                    {renderContent(m.content)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
});

export default AgentWorkflow;