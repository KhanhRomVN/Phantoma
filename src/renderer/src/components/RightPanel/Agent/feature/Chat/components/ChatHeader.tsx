/**
 * ------------------------------------------------------------------
 * ChatHeader
 * ------------------------------------------------------------------
 * Header component cho chat — hiển thị tiêu đề conversation, model
 * info, stats (tokens/messages/usage), menu hành động (copy/export/
 * delete), và toggle tìm kiếm.
 *
 * Bỏ `useAccountStats` so với Zen vì backend Phantoma chưa có endpoint
 * account stats — hiển thị stats từ `currentAccount` prop.
 * Bỏ `promptLengthMode`/`systemPromptMode` vì Phantoma chưa có concept đó.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { cn } from '@renderer/shared/utils/cn';
import type { Message } from '../types/message';

// ─── Types ──────────────────────────────────────────────────────────────
interface ChatHeaderProps {
  displayedModel: any;
  currentAccount: any;
  currentTaskName: string | null;
  contextUsage: { prompt: number; completion: number; total: number };
  isSearchOpen: boolean;
  setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  /** Optional: title của conversation (fallback từ message đầu nếu không có). */
  conversationTitle?: string;
  /** Optional: messages để extract title fallback. */
  messages?: Message[];
  /** Optional: token count của conversation. */
  chatTokens?: number;
  /** Optional: số message của conversation. */
  chatRequests?: number;
  /** Optional: action handlers cho menu 3 chấm. */
  onCopyAsMarkdown?: () => void;
  onCopyAsJson?: () => void;
  onDeleteConversation?: () => void;
  onExportAsJson?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────
const fmt = (num: number): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
};

const parseUserContent = (content: string): string => {
  const regex = /## User Message\n<user-message>\n([\s\S]*?)\n<\/user-message>/;
  const match = content.match(regex);
  if (match) return match[1];

  let cleaned = content
    .replace(/^<user-message>\n?/, '')
    .replace(/\n?<\/user-message>[\s\S]*$/, '');

  if (cleaned.startsWith('```') && cleaned.includes('```', 3)) {
    cleaned = cleaned.split('```')[1]?.trim() || cleaned;
  }
  return cleaned || '';
};

const extractFirstUserMessage = (messages: Message[] | undefined): string => {
  if (!messages || !messages.length) return '';
  const firstUserMsg = messages.find((msg) => msg.role === 'user');
  if (!firstUserMsg) return '';

  const rawContent = typeof firstUserMsg.content === 'string' ? firstUserMsg.content : '';
  const parsed = parseUserContent(rawContent).trim();
  const lines = parsed.split('\n').filter((l) => l.trim());
  const titleCandidate = lines[0] || parsed.substring(0, 60);

  return titleCandidate.length > 60 ? titleCandidate.substring(0, 57) + '...' : titleCandidate;
};

const getFaviconUrl = (providerId: string, fallback?: string): string => {
  if (fallback) return fallback;
  const pid = (providerId || '').toLowerCase();
  const domain = (() => {
    if (pid.includes('openai') || pid.includes('chatgpt') || pid.includes('gpt')) return 'openai.com';
    if (pid.includes('anthropic') || pid.includes('claude')) return 'anthropic.com';
    if (pid.includes('google') || pid.includes('gemini')) return 'google.com';
    if (pid.includes('openrouter')) return 'openrouter.ai';
    if (pid.includes('deepseek')) return 'deepseek.com';
    if (pid.includes('grok') || pid.includes('xai') || pid.includes('x.ai')) return 'x.ai';
    if (pid.includes('zenmux')) return 'zenmux.ai';
    if (pid.includes('moonshot') || pid.includes('kimi')) return 'moonshot.cn';
    if (pid.includes('qwen') || pid.includes('alibaba') || pid.includes('aliyun') || pid.includes('dashscope')) return 'qwen.ai';
    if (pid.includes('groq')) return 'groq.com';
    if (pid.includes('mistral')) return 'mistral.ai';
    if (pid.includes('glm') || pid.includes('zai') || pid.includes('z-ai') || pid.includes('zhipu') || pid.includes('bigmodel')) return 'bigmodel.cn';
    if (pid.includes('cohere')) return 'cohere.com';
    if (pid.includes('perplexity')) return 'perplexity.ai';
    if (pid.includes('together')) return 'together.ai';
    if (pid.includes('fireworks')) return 'fireworks.ai';
    if (pid.includes('meta') || pid.includes('llama')) return 'meta.com';
    if (pid.includes('siliconflow')) return 'siliconflow.cn';
    if (pid.includes('baichuan')) return 'baichuan-ai.com';
    if (pid.includes('minimax')) return 'minimaxi.com';
    if (pid.includes('01wanwu') || pid.includes('yi-')) return '01.ai';
    return `${pid}.com`;
  })();
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
};

// ─── Sub-components ─────────────────────────────────────────────────────
const SqButton: React.FC<{
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ title, active = false, onClick, children }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={cn(
        'w-6 h-6 p-0 flex items-center justify-center shrink-0 rounded border-none outline-none cursor-pointer bg-transparent transition-opacity duration-150',
        active ? 'text-primary opacity-100' : 'text-text-secondary',
      )}
      style={{ opacity: active ? 1 : hov ? 1 : 0.6 }}
    >
      {children}
    </button>
  );
};

interface ConversationMenuProps {
  onCopyAsMarkdown?: () => void;
  onCopyAsJson?: () => void;
  onDelete?: () => void;
  onExportAsJson?: () => void;
}

const ConversationMenu: React.FC<ConversationMenuProps> = ({
  onCopyAsMarkdown,
  onCopyAsJson,
  onDelete,
  onExportAsJson,
}) => {
  const [open, setOpen] = React.useState(false);
  const [hov, setHov] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const items: {
    label: string;
    icon: React.ReactNode;
    action?: () => void;
    danger?: boolean;
    sep?: boolean;
  }[] = [
    {
      label: 'Copy as Markdown',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      ),
      action: onCopyAsMarkdown,
    },
    {
      label: 'Copy as JSON',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      ),
      action: onCopyAsJson,
    },
    {
      label: 'Export as JSON',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
      ),
      action: onExportAsJson,
    },
    {
      label: 'Delete Conversation',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      ),
      action: onDelete,
      danger: true,
      sep: true,
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="More options"
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        className={cn(
          'w-6 h-6 p-0 flex items-center justify-center shrink-0 rounded border-none outline-none cursor-pointer bg-transparent transition-opacity duration-150',
          open ? 'text-primary' : 'text-text-secondary',
        )}
        style={{ opacity: open || hov ? 1 : 0.6 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+4px)] right-0 z-[9999] bg-[var(--vscode-menu-background,#1e1e1e)] border border-[var(--vscode-menu-border,#454545)] rounded-md shadow-[0_4px_16px_rgba(0,0,0,0.35)] min-w-[180px] py-1 overflow-hidden">
          {items.map((item) => (
            <React.Fragment key={item.label}>
              {item.sep && <div className="h-px bg-foreground/[0.08] my-1" />}
              <button
                onClick={() => {
                  setOpen(false);
                  item.action?.();
                }}
                disabled={!item.action}
                className={cn(
                  'w-full px-3 py-1.5 flex items-center gap-2 bg-transparent border-none text-xs text-left transition-colors',
                  item.action ? 'cursor-pointer' : 'cursor-not-allowed opacity-40',
                  item.danger ? 'text-error' : 'text-text-primary',
                )}
                onMouseEnter={(e) => {
                  if (item.action)
                    e.currentTarget.style.backgroundColor = item.danger
                      ? 'color-mix(in srgb, var(--vscode-editorError-foreground, #ef4444) 12%, transparent)'
                      : 'var(--vscode-menu-selectionBackground, rgba(255,255,255,0.06))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span className="shrink-0 flex items-center">{item.icon}</span>
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

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

interface StatsBadgeProps {
  chatTokens?: number;
  chatRequests?: number;
  dayTokens?: number | null;
  dayRequests?: number | null;
  usageNum?: number | null;
  usageColor?: string;
}

const StatsBadge: React.FC<StatsBadgeProps> = ({
  chatTokens,
  chatRequests,
  dayTokens,
  dayRequests,
  usageNum,
  usageColor = 'var(--vscode-charts-purple, #a855f7)',
}) => {
  const [tooltipPos, setTooltipPos] = React.useState<{ x: number; y: number } | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setTooltipPos({ x: rect.right, y: rect.bottom + 6 });
  };
  const handleMouseLeave = () => setTooltipPos(null);

  const hasChatStats = chatTokens != null || chatRequests != null;
  const hasDayStats = dayTokens != null || dayRequests != null || usageNum != null;
  if (!hasChatStats && !hasDayStats) return null;

  return (
    <>
      <div
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex items-center gap-2 px-[7px] py-px rounded h-5 box-border cursor-default text-xs text-text-secondary whitespace-nowrap bg-foreground/[0.08] border border-foreground/[0.14]"
      >
        {chatTokens != null && (
          <span>
            <span className="text-text-primary">{fmt(chatTokens)}</span> tok
          </span>
        )}
        {chatRequests != null && (
          <span>
            <span className="text-text-primary">{fmt(chatRequests)}</span> msg
          </span>
        )}
        {usageNum != null && (
          <>
            <UsageCircle pct={usageNum} color={usageColor} />
            <span>{Math.round(usageNum)}%</span>
          </>
        )}
      </div>

      {tooltipPos && (
        <div
          className="fixed z-[99999] bg-[var(--sidebar-bg,var(--input-bg))] border border-border rounded-[10px] px-3 py-2.5 min-w-[200px] shadow-[0_4px_24px_rgba(0,0,0,0.28)] pointer-events-none text-[11px] text-text-primary leading-normal"
          style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translateX(-100%)' }}
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.07em] opacity-50 mb-1.5">
            This conversation
          </div>
          <TooltipRow label="Tokens" value={chatTokens != null ? fmt(chatTokens) : '—'} />
          <TooltipRow label="Messages" value={chatRequests != null ? String(chatRequests) : '—'} />

          <div className="h-px bg-foreground/[0.07] my-1.5" />
          <div className="text-[10px] font-bold uppercase tracking-[0.07em] opacity-50 mb-1.5">
            Account (day)
          </div>
          <TooltipRow label="Tokens" value={dayTokens != null ? fmt(dayTokens) : '—'} />
          <TooltipRow label="Messages" value={dayRequests != null ? String(dayRequests) : '—'} />
          <TooltipRow
            label="Usage"
            value={usageNum != null ? `${usageNum.toFixed(1)}%` : '—'}
            valueColor={usageColor}
          />
        </div>
      )}
    </>
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

// ─── Main component ─────────────────────────────────────────────────────
const ChatHeader: React.FC<ChatHeaderProps> = ({
  displayedModel,
  currentAccount,
  currentTaskName,
  contextUsage: _contextUsage,
  isSearchOpen,
  setIsSearchOpen,
  setSearchQuery,
  conversationTitle,
  messages,
  chatTokens,
  chatRequests,
  onCopyAsMarkdown,
  onCopyAsJson,
  onDeleteConversation,
  onExportAsJson,
}) => {
  const providerId = displayedModel?.providerId || '';
  const faviconUrl = getFaviconUrl(providerId, displayedModel?.favicon);

  const usageNum = currentAccount?.usage != null ? Number(currentAccount.usage) : null;
  const usageColor =
    usageNum == null
      ? 'var(--vscode-charts-purple, #a855f7)'
      : usageNum >= 90
        ? 'var(--vscode-editorError-foreground, #ef4444)'
        : usageNum >= 70
          ? 'var(--vscode-editorWarning-foreground, #f97316)'
          : 'var(--vscode-charts-purple, #a855f7)';

  const dayRequests = currentAccount?.period_requests ?? null;
  const dayTokens = currentAccount?.period_tokens ?? null;

  const derivedTitle = React.useMemo(() => {
    if (conversationTitle) return conversationTitle;
    if (currentTaskName) return currentTaskName;
    return extractFirstUserMessage(messages) || 'Untitled';
  }, [conversationTitle, currentTaskName, messages]);

  return (
    <div className="flex flex-col border-b border-border bg-background">
      <div className="px-4 py-2 flex flex-col gap-1">
        {/* Row 1: title | [search] [3-dot] */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            title={derivedTitle}
            className="flex-1 text-[13px] font-semibold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis min-w-0"
          >
            {derivedTitle}
          </span>

          <SqButton
            title="Search in chat"
            active={isSearchOpen}
            onClick={() => {
              setIsSearchOpen((v) => !v);
              if (isSearchOpen) setSearchQuery('');
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m13 13.5 2-2.5-2-2.5" />
              <path d="m21 21-4.3-4.3" />
              <path d="M9 8.5 7 11l2 2.5" />
              <circle cx="11" cy="11" r="8" />
            </svg>
          </SqButton>

          <ConversationMenu
            onCopyAsMarkdown={onCopyAsMarkdown}
            onCopyAsJson={onCopyAsJson}
            onDelete={onDeleteConversation}
            onExportAsJson={onExportAsJson}
          />
        </div>

        {/* Row 2: favicon · provider/model · email · stats */}
        <div className="flex items-center gap-1.5 min-w-0">
          <img
            src={faviconUrl}
            alt="provider"
            className="w-3.5 h-3.5 rounded-[2px] object-contain shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />

          <span className="text-[11px] font-semibold text-text-primary whitespace-nowrap opacity-85 shrink-0">
            {displayedModel?.providerId || '?'}/{displayedModel?.id || 'chat'}
          </span>

          {currentAccount?.email && (
            <span
              title={currentAccount.email}
              className="text-[11px] opacity-60 italic whitespace-nowrap overflow-hidden max-w-[120px] shrink"
            >
              {currentAccount.email}
            </span>
          )}

          <div className="flex-1" />

          <StatsBadge
            chatTokens={chatTokens}
            chatRequests={chatRequests}
            dayTokens={dayTokens}
            dayRequests={dayRequests}
            usageNum={usageNum}
            usageColor={usageColor}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;