import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Home } from 'lucide-react';
import type { PlanUsage } from '@app/types/agent-tool';
import { agentToolIpc } from '../../../handlers/AgentToolIpc';
import { cn } from '@renderer/utils/cn';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@renderer/components/ui/Dropdown';
import { getFaviconUrl } from '@renderer/utils/favicon';
import { AGENT_LIST, discoverProvider } from '../../../services/agentApi';
import type { Conversation } from '../../../services/conversationStorage';

interface ChatHeaderProps {
  conversation: Conversation | null;
  onGoHome: () => void;
  onDeleteConversation: () => void;
}

const SqButton: React.FC<{
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ title, onClick, children }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="w-6 h-6 p-0 flex items-center justify-center shrink-0 rounded border-none outline-none cursor-pointer bg-transparent text-text-secondary transition-opacity duration-150"
      style={{ opacity: hov ? 1 : 0.6 }}
    >
      {children}
    </button>
  );
};

const toMarkdown = (conversation: Conversation): string =>
  conversation.messages
    .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content))
    .map((m) => `**${m.role === 'user' ? 'User' : 'Assistant'}:**\n\n${m.content}`)
    .join('\n\n---\n\n');

const downloadJson = (conversation: Conversation): void => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(conversation, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `${conversation.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const ConversationMenu: React.FC<{
  conversation: Conversation | null;
  onDelete: () => void;
}> = ({ conversation, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [hov, setHov] = useState(false);

  const items: { label: string; action?: () => void; danger?: boolean; sep?: boolean }[] = [
    {
      label: 'Copy as Markdown',
      action: conversation
        ? () => void navigator.clipboard.writeText(toMarkdown(conversation))
        : undefined,
    },
    {
      label: 'Copy as JSON',
      action: conversation
        ? () => void navigator.clipboard.writeText(JSON.stringify(conversation, null, 2))
        : undefined,
    },
    {
      label: 'Export as JSON',
      action: conversation ? () => downloadJson(conversation) : undefined,
    },
    { label: 'Delete Conversation', action: onDelete, danger: true, sep: true },
  ];

  return (
    <Dropdown open={open} onOpenChange={setOpen} align="end" side="bottom" sideOffset={4}>
      <DropdownTrigger asChild>
        <button
          title="More options"
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          className={cn(
            'w-6 h-6 p-0 flex items-center justify-center shrink-0 rounded border-none outline-none cursor-pointer bg-transparent transition-opacity duration-150',
            open ? 'text-primary' : 'text-text-secondary',
          )}
          style={{ opacity: open || hov ? 1 : 0.6 }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </DropdownTrigger>
      <DropdownContent>
        {items.map((item) => (
          <React.Fragment key={item.label}>
            {item.sep && <DropdownSeparator />}
            <DropdownItem
              disabled={!item.action}
              variant={item.danger ? 'error' : 'default'}
              onClick={() => item.action?.()}
            >
              {item.label}
            </DropdownItem>
          </React.Fragment>
        ))}
      </DropdownContent>
    </Dropdown>
  );
};

const fmt = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
};

const usageColorFor = (pct: number | null): string =>
  pct == null
    ? 'var(--vscode-charts-purple, #a855f7)'
    : pct >= 90
      ? 'var(--vscode-editorError-foreground, #ef4444)'
      : pct >= 70
        ? 'var(--vscode-editorWarning-foreground, #f97316)'
        : 'var(--vscode-charts-purple, #a855f7)';

const UsageCircle: React.FC<{ pct: number; color: string }> = ({ pct, color }) => {
  const R = 6;
  const circ = 2 * Math.PI * R;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
      <circle cx="8" cy="8" r={R} fill="none" stroke="rgba(128,128,128,0.2)" strokeWidth="2.5" />
      <circle
        cx="8"
        cy="8"
        r={R}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        transform="rotate(-90 8 8)"
      />
    </svg>
  );
};

const TooltipRow: React.FC<{ label: string; value: string; valueColor?: string }> = ({
  label,
  value,
  valueColor,
}) => (
  <div className="flex items-center gap-1.5 mb-1">
    <span className="opacity-70 flex-1">{label}</span>
    <span className="font-semibold" style={{ color: valueColor ?? 'var(--vscode-foreground)' }}>
      {value}
    </span>
  </div>
);

interface StatsBadgeProps {
  tokens?: number;
  messages?: number;
  contextTokens?: number;
  contextWindow?: number;
  planUsage?: PlanUsage | null;
}

const StatsBadge: React.FC<StatsBadgeProps> = ({
  tokens,
  messages,
  contextTokens,
  contextWindow,
  planUsage,
}) => {
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (): void => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setTooltipPos({ x: rect.right, y: rect.bottom + 6 });
  };

  const contextPct =
    contextTokens != null && contextWindow ? (contextTokens / contextWindow) * 100 : null;
  const planPct = planUsage?.windows.length
    ? Math.max(...planUsage.windows.map((w) => w.usedFraction)) * 100
    : null;
  const circlePct = planPct ?? contextPct;
  const color = usageColorFor(circlePct);

  if (tokens == null && messages == null && circlePct == null) return null;

  return (
    <>
      <div
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setTooltipPos(null)}
        className="inline-flex items-center gap-2 px-[7px] py-px rounded h-5 box-border cursor-default text-xs text-text-secondary whitespace-nowrap bg-foreground/[0.08] border border-foreground/[0.14]"
      >
        {tokens != null && (
          <span>
            <span className="text-text-primary">{fmt(tokens)}</span> tok
          </span>
        )}
        {messages != null && (
          <span>
            <span className="text-text-primary">{fmt(messages)}</span> msg
          </span>
        )}
        {circlePct != null && (
          <>
            <UsageCircle pct={circlePct} color={color} />
            <span>{Math.round(circlePct)}%</span>
          </>
        )}
      </div>

      {tooltipPos && (
        <div
          className="fixed z-[99999] bg-tooltip-background border border-border rounded-xl px-3 py-2.5 min-w-[200px] shadow-2xl pointer-events-none text-[11px] text-text-primary leading-normal"
          style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translateX(-100%)' }}
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.07em] opacity-50 mb-1.5">
            This conversation
          </div>
          <TooltipRow label="Tokens" value={tokens != null ? fmt(tokens) : '—'} />
          <TooltipRow label="Messages" value={messages != null ? String(messages) : '—'} />
          <TooltipRow
            label="Context"
            value={
              contextTokens != null
                ? `${fmt(contextTokens)}${contextWindow ? ` / ${fmt(contextWindow)}` : ''}`
                : '—'
            }
            valueColor={contextPct != null ? usageColorFor(contextPct) : undefined}
          />

          {planUsage && (
            <>
              <div className="h-px bg-foreground/[0.07] my-1.5" />
              <div className="text-[10px] font-bold uppercase tracking-[0.07em] opacity-50 mb-1.5">
                {planUsage.planLabel ? `Plan · ${planUsage.planLabel}` : 'Plan'}
              </div>
              {planUsage.windows.map((w) => (
                <TooltipRow
                  key={w.label}
                  label={
                    w.resetsAt
                      ? `${w.label} (resets ${new Date(w.resetsAt).toLocaleString()})`
                      : w.label
                  }
                  value={`${(w.usedFraction * 100).toFixed(1)}%`}
                  valueColor={usageColorFor(w.usedFraction * 100)}
                />
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
};

const ChatHeader = memo<ChatHeaderProps>(({ conversation, onGoHome, onDeleteConversation }) => {
  const title = conversation?.title || 'Untitled';
  const agent = useMemo(
    () => AGENT_LIST.find((a) => a.id === conversation?.provider),
    [conversation?.provider],
  );
  const faviconUrl = getFaviconUrl(agent?.url, undefined);
  const messageCount = conversation?.messages.filter((m) => m.role !== 'tool').length ?? 0;
  const rootRef = useRef<HTMLDivElement>(null);
  const [fullWidth, setFullWidth] = useState(false);
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
  const [catalogWindow, setCatalogWindow] = useState<number | undefined>();
  const providerId = conversation?.provider;
  const modelId = conversation?.model;
  const totalTokens = conversation?.totalTokens;

  useEffect(() => {
    if (providerId !== 'claude' && providerId !== 'codex') {
      setPlanUsage(null);
      return;
    }
    let cancelled = false;
    agentToolIpc
      .planUsage(providerId)
      .then((result) => {
        if (!cancelled) setPlanUsage(result.ok ? result.usage : null);
      })
      .catch(() => {
        if (!cancelled) setPlanUsage(null);
      });
    return () => {
      cancelled = true;
    };
  }, [providerId, totalTokens]);

  useEffect(() => {
    if (!providerId || !modelId) return;
    let cancelled = false;
    discoverProvider(providerId)
      .then((provider) => {
        if (!cancelled)
          setCatalogWindow(provider.models.find((m) => m.id === modelId)?.contextWindow);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [providerId, modelId]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setFullWidth(entry.contentRect.width <= 680));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="flex flex-col bg-background">
      <div
        className={cn(
          'px-4 py-2 flex flex-col gap-1 w-full border-x border-b border-border',
          !fullWidth && 'rounded-bl-md rounded-br-md',
        )}
        style={{ maxWidth: '680px', margin: '0 auto' }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            title={title}
            className="flex-1 text-[13px] font-semibold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis min-w-0"
          >
            {title}
          </span>
          <SqButton title="Home" onClick={onGoHome}>
            <Home size={15} />
          </SqButton>
          <ConversationMenu conversation={conversation} onDelete={onDeleteConversation} />
        </div>

        <div className="flex items-center gap-1.5 min-w-0">
          {faviconUrl && (
            <img
              src={faviconUrl}
              alt="provider"
              className="w-3.5 h-3.5 rounded-[2px] object-contain shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <span className="text-[11px] font-semibold text-text-primary whitespace-nowrap opacity-85 shrink-0">
            {conversation?.provider || '?'}/{conversation?.model || 'chat'}
          </span>
          <div className="flex-1" />
          <StatsBadge
            tokens={conversation?.totalTokens ?? conversation?.contextTokens}
            messages={messageCount}
            contextTokens={conversation?.contextTokens}
            contextWindow={conversation?.contextWindow ?? catalogWindow}
            planUsage={planUsage}
          />
        </div>
      </div>
    </div>
  );
});

ChatHeader.displayName = 'ChatHeader';

export default ChatHeader;
