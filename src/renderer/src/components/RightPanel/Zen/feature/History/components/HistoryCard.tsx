/**
 * ------------------------------------------------------------------
 * HistoryCard
 * ------------------------------------------------------------------
 * Card hiển thị một hội thoại trong danh sách lịch sử.
 * Lazy-load tin nhắn khi hover/click, hiển thị model, token usage,
 * custom tooltip bám theo con chuột và context menu.
 *
 * Mapped from Zen to Phantoma (Tailwind + IPC Service).
 * ------------------------------------------------------------------
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { ConversationItem } from '../types';
import { Trash2, Copy, FolderOpen, Zap, Clock } from 'lucide-react';
import { extensionService } from '../../../services/ExtensionService';
import ConversationService from '../../../services/ConversationService';
import { getHistoryKey } from '../hooks/useConversationHistory';

interface HistoryCardProps {
  item: ConversationItem;
  onClick: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  formatDate: (timestamp: number) => string;
  providerFavicons?: Record<string, string>;
  selected?: boolean;
}

/** Vị trí con trỏ (viewport) mà tooltip bám theo. */
interface TooltipPoint {
  x: number;
  y: number;
}

/** Class Tailwind (tĩnh) cho màu token theo ngưỡng sử dụng. */
interface TokenTone {
  text: string;
  chip: string;
}

// ─── Constants ─────────────────────────────────────────────────────────
const TOOLTIP_PREVIEW_CHARS = 600;
const AGENT_BADGE_CLASS: Record<string, string> = {
  orchestrator: 'bg-[#a78bfa]/15 text-[#a78bfa]',
  planner: 'bg-[#38bdf8]/15 text-[#38bdf8]',
  executor: 'bg-emerald-500/15 text-emerald-400',
  reviewer: 'bg-amber-500/15 text-amber-400',
};

const TOOLTIP_OFFSET = 14;

const FAVICON_DOMAINS: Array<[string[], string]> = [
  [['openai', 'chatgpt', 'gpt'], 'openai.com'],
  [['anthropic', 'claude'], 'anthropic.com'],
  [['google', 'gemini'], 'google.com'],
  [['openrouter'], 'openrouter.ai'],
  [['deepseek'], 'deepseek.com'],
  [['grok', 'xai', 'x.ai'], 'x.ai'],
  [['zenmux'], 'zenmux.ai'],
  [['moonshot', 'kimi'], 'moonshot.cn'],
  [['qwen', 'alibaba', 'aliyun', 'dashscope'], 'qwen.ai'],
  [['groq'], 'groq.com'],
  [['mistral'], 'mistral.ai'],
  [['glm', 'zai', 'z-ai', 'zhipu', 'bigmodel'], 'bigmodel.cn'],
  [['cohere'], 'cohere.com'],
  [['perplexity'], 'perplexity.ai'],
  [['together'], 'together.ai'],
  [['fireworks'], 'fireworks.ai'],
  [['meta', 'llama'], 'meta.com'],
  [['siliconflow'], 'siliconflow.cn'],
  [['baichuan'], 'baichuan-ai.com'],
  [['minimax'], 'minimaxi.com'],
  [['01wanwu', 'yi-'], '01.ai'],
];

// ─── Helpers (pure) ─────────────────────────────────────────────────────
/** Màu token theo ngưỡng sử dụng (class Tailwind tĩnh để JIT nhận diện). */
const getTokenTone = (n: number): TokenTone => {
  if (n >= 500000) return { text: 'text-error', chip: 'text-error bg-error/15' };
  if (n >= 50000) return { text: 'text-warn', chip: 'text-warn bg-warn/15' };
  if (n >= 10000) return { text: 'text-success', chip: 'text-success bg-success/15' };
  return { text: 'text-primary', chip: 'text-primary bg-primary/15' };
};

const formatTokens = (n: number): string => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
};

/** Tách nội dung người dùng khỏi wrapper XML của prompt. */
const parseUserContent = (raw: string): string => {
  const content = raw || '';
  const match = content.match(/## User Message\n<user-message>\n([\s\S]*?)\n<\/user-message>/);
  if (match) return match[1];
  let cleaned = content
    .replace(/^<user-message>\n?/, '')
    .replace(/\n?<\/user-message>[\s\S]*$/, '');
  if (cleaned.startsWith('```') && cleaned.includes('```', 3)) {
    cleaned = cleaned.split('```')[1]?.trim() || cleaned;
  }
  return cleaned || '';
};

const pad2 = (n: number) => n.toString().padStart(2, '0');

/** "Just now", "2m ago", "Yesterday 12:30", "dd/mm/yy hh:mm" */
const formatTimeText = (timestamp: number): string => {
  if (!timestamp) return '';
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const d = new Date(timestamp);
  const hhmm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  if (days === 0) {
    if (hours === 0) return minutes <= 0 ? 'Just now' : `${minutes}m ago`;
    return `${hours}h ago`;
  }
  if (days === 1) return `Yesterday ${hhmm}`;
  if (days < 7) return `${days}d ago`;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${hhmm}`;
};

const getFaviconUrlSync = (pid: string): string => {
  if (!pid) return '';
  const lower = pid.toLowerCase();
  const hit = FAVICON_DOMAINS.find(([keys]) => keys.some((k) => lower.includes(k)));
  const domain = hit ? hit[1] : `${lower}.com`;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
};

/**
 * Tính style cho tooltip theo vị trí con chuột: đặt lệch phải-dưới con trỏ,
 * tự lật lên trên / sang trái khi thiếu chỗ trong viewport.
 */
const getTooltipStyle = (p: TooltipPoint): React.CSSProperties => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(340, vw - 16);
  const left = Math.max(8, Math.min(p.x + TOOLTIP_OFFSET, vw - width - 8));
  const spaceBelow = vh - p.y - TOOLTIP_OFFSET - 8;
  const spaceAbove = p.y - TOOLTIP_OFFSET - 8;
  const below = spaceBelow >= 200 || spaceBelow >= spaceAbove;
  return below
    ? {
        left,
        width,
        top: p.y + TOOLTIP_OFFSET,
        maxHeight: Math.min(320, spaceBelow),
      }
    : {
        left,
        width,
        bottom: vh - p.y + TOOLTIP_OFFSET,
        maxHeight: Math.min(320, spaceAbove),
      };
};

// ─── Class constants (Tailwind) ─────────────────────────────────────────
const CARD_BASE =
  'group relative flex w-full items-center gap-2 box-border py-1.5 pl-2.5 pr-2 rounded-lg border bg-transparent cursor-pointer overflow-hidden outline-none transition active:scale-[0.994]';
const CARD_IDLE =
  'border-transparent hover:bg-card-hover hover:border-border/70 focus-visible:bg-card-hover focus-visible:border-primary';
const CARD_SELECTED =
  'bg-card-hover border-primary/45 hover:border-primary/45 focus-visible:border-primary';
const ACCENT_BASE =
  'absolute left-0 top-1/2 w-[3px] rounded-r-[3px] bg-primary -translate-y-1/2 transition-[height] duration-200 group-hover:h-[56%] group-focus-visible:h-[56%]';
const ICON_BTN =
  'inline-flex items-center justify-center w-[22px] h-[22px] rounded-md border-none bg-transparent text-text-secondary cursor-pointer transition-colors duration-150';
const CHIP =
  'inline-flex items-center gap-1 px-[7px] py-0.5 rounded-[5px] text-[10px] font-medium text-text-secondary bg-text-primary/10';
const CLAMP = '[display:-webkit-box] [-webkit-box-orient:vertical] overflow-hidden';

// ─── Component ─────────────────────────────────────────────────────────
const HistoryCard: React.FC<HistoryCardProps> = ({
  item,
  onClick,
  onDelete,
  providerFavicons,
  selected = false,
}) => {
  // ── State ──
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 });
  const [messages, setMessages] = React.useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false);
  const [messageFetchError, setMessageFetchError] = React.useState<string | null>(null);
  const [shouldLoad, setShouldLoad] = React.useState(false);
  const [tooltip, setTooltip] = React.useState<TooltipPoint | null>(null);
  const [failedFavicon, setFailedFavicon] = React.useState<string | null>(null);

  // ── Refs ──
  const cardRef = React.useRef<HTMLDivElement | null>(null);

  // ── Derived ──
  const userContent = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return parseUserContent(messages[i].content);
    }
    return '';
  }, [messages]);

  // Tổng số msg (user + assistant không lỗi); trước khi tải dùng messageCount
  const totalMsgs = React.useMemo(() => {
    if (!messages.length) return item.messageCount ?? 0;
    return messages.filter((m: any) => m.role === 'user' || !m.isError).length;
  }, [messages, item.messageCount]);

  const messagesModel = React.useMemo(() => {
    const m = messages.find((x: any) => x.role === 'assistant' && (x.modelId || x.providerId));
    return {
      providerId: (m?.providerId as string) || null,
      modelId: (m?.modelId as string) || null,
    };
  }, [messages]);

  const providerId = item.providerId || item.provider || messagesModel.providerId;
  const modelId = item.modelId || messagesModel.modelId;
  const favicon = providerId
    ? providerFavicons?.[providerId] || getFaviconUrlSync(providerId)
    : null;
  const showFavicon = !!favicon && failedFavicon !== favicon;

  const tokens = item.totalTokenUsage ?? 0;
  const tone = getTokenTone(tokens);

  const timestamp = item.lastModified || item.timestamp || item.createdAt || 0;
  const timeText = formatTimeText(timestamp);
  const displayTitle = item.title || userContent || item.preview || 'Untitled';

  // ── Callbacks ──
  // Lazy load messages only when user hovers, focuses or clicks
  const triggerLoad = React.useCallback(() => {
    if (shouldLoad || isLoadingMessages || messages.length > 0) return;
    setShouldLoad(true);
  }, [shouldLoad, isLoadingMessages, messages.length]);

  const hideTooltip = React.useCallback(() => setTooltip(null), []);

  // ── Effects ──
  // Fetch messages when shouldLoad becomes true
  React.useEffect(() => {
    if (!shouldLoad) return;

    // Check cache first
    const cached = (window as any).ConversationCache?.get(item.id);
    if (cached && cached.messages && cached.messages.length > 0) {
      setMessages(cached.messages);
      setIsLoadingMessages(false);
      return;
    }

    setIsLoadingMessages(true);
    setMessageFetchError(null);
    let cancelled = false;

    const moduleId = getHistoryKey();
    if (!moduleId) {
      setMessageFetchError('No messages found');
      setIsLoadingMessages(false);
      return;
    }

    ConversationService.get(moduleId, item.id)
      .then((data) => {
        if (cancelled) return;
        if (data?.messages) {
          setMessages(data.messages);
          if ((window as any).ConversationCache) {
            (window as any).ConversationCache.set(item.id, {
              messages: data.messages,
              conversationId: item.id,
            });
          }
        } else {
          setMessageFetchError('No messages found');
        }
      })
      .catch(() => {
        if (!cancelled) setMessageFetchError('No messages found');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMessages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldLoad, item.id]);

  // Đóng context menu khi click ra ngoài
  React.useEffect(() => {
    const close = () => setMenuVisible(false);
    if (menuVisible) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuVisible]);

  // Ẩn tooltip khi cuộn danh sách
  React.useEffect(() => {
    if (!tooltip) return;
    window.addEventListener('scroll', hideTooltip, true);
    return () => window.removeEventListener('scroll', hideTooltip, true);
  }, [!!tooltip, hideTooltip]);

  // ── Handlers ──
  const handleOpen = () => {
    hideTooltip();
    triggerLoad();
    onClick();
  };

  const handleCopyContent = async () => {
    const moduleId = getHistoryKey();
    if (!moduleId) return;
    const data = await ConversationService.get(moduleId, item.id);
    if (!data?.messages) return;
    const text = data.messages
      .map((msg: any) => {
        const content =
          msg.role === 'user' ? parseUserContent(msg.content) || msg.content : msg.content;
        return `[${String(msg.role).toUpperCase()}]\n${content}`;
      })
      .join('\n\n');
    navigator.clipboard.writeText(text.trim());
  };

  const handleOpenConversationFolder = () => {
    extensionService.postMessage({
      command: 'openConversationFolder',
      conversationId: item.id,
    });
  };

  const menuItems = [
    {
      icon: <Trash2 size={13} />,
      label: 'Delete conversation',
      danger: true,
      action: (e: React.MouseEvent) => onDelete(item.id, e),
    },
    {
      icon: <Copy size={13} />,
      label: 'Copy content',
      danger: false,
      action: () => handleCopyContent(),
    },
    {
      icon: <FolderOpen size={13} />,
      label: 'Open conversation folder',
      danger: false,
      action: () => handleOpenConversationFolder(),
    },
  ];

  // ── Render ──
  return (
    <div className="relative w-full">
      <div
        ref={cardRef}
        className={`${CARD_BASE} ${selected ? CARD_SELECTED : CARD_IDLE}`}
        aria-current={selected ? 'true' : undefined}
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
          }
        }}
        onMouseEnter={(e) => {
          triggerLoad();
          setTooltip({ x: e.clientX, y: e.clientY });
        }}
        onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY })}
        onMouseLeave={hideTooltip}
        onFocus={(e) => {
          triggerLoad();
          // Chỉ hiện tooltip khi focus bằng bàn phím (không có tọa độ chuột)
          if (e.currentTarget.matches(':focus-visible')) {
            const r = e.currentTarget.getBoundingClientRect();
            setTooltip({ x: r.left + 24, y: r.bottom - TOOLTIP_OFFSET });
          }
        }}
        onBlur={hideTooltip}
        onContextMenu={(e) => {
          e.preventDefault();
          hideTooltip();
          triggerLoad();
          setMenuPosition({ x: e.clientX, y: e.clientY });
          setMenuVisible(true);
        }}
      >
        <span className={`${ACCENT_BASE} ${selected ? 'h-[56%]' : 'h-0'}`} />

        {/* Avatar provider */}
        <div className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center bg-text-primary/10 border border-border/60 text-[10px] font-bold text-text-secondary overflow-hidden">
          {showFavicon ? (
            <img
              className="w-3.5 h-3.5 rounded-[3px]"
              src={favicon as string}
              alt=""
              onError={() => setFailedFavicon(favicon)}
            />
          ) : (
            (providerId || '?').charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
          {/* Row 1: tiêu đề + thời gian / hành động nhanh */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex-1 min-w-0 text-xs font-semibold leading-tight text-text-primary overflow-hidden whitespace-nowrap text-ellipsis">
              {displayTitle}
            </span>
            <div className="relative shrink-0 grid items-center justify-items-end [&>*]:[grid-area:1/1]">
              <span className="text-[10px] font-medium text-text-secondary transition-opacity duration-150 group-hover:opacity-0 group-focus-within:opacity-0">
                {timeText}
              </span>
              <div className="flex gap-0.5 opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto">
                <button
                  type="button"
                  className={`${ICON_BTN} hover:bg-text-primary/10 hover:text-text-primary`}
                  title="Copy content"
                  aria-label="Copy content"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyContent();
                  }}
                >
                  <Copy size={12} />
                </button>
                <button
                  type="button"
                  className={`${ICON_BTN} hover:bg-error/15 hover:text-error`}
                  title="Delete conversation"
                  aria-label="Delete conversation"
                  onClick={(e) => {
                    e.stopPropagation();
                    hideTooltip();
                    onDelete(item.id, e);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: model, tổng msg, badges */}
          <div className="flex items-center gap-2 min-w-0">
            {modelId && (
              <span className="max-w-[55%] px-1.5 py-px rounded bg-text-primary/10 text-text-secondary text-[10px] font-medium leading-[15px] overflow-hidden whitespace-nowrap text-ellipsis">
                {modelId}
              </span>
            )}
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-medium text-text-secondary shrink-0"
              title="Total messages"
            >
              {totalMsgs} msg
            </span>
            <span className="flex-1" />
            {item.workflowAgentId && (
              <span
                className={`inline-flex items-center px-[7px] py-px rounded text-[10px] font-bold uppercase shrink-0 ${
                  AGENT_BADGE_CLASS[item.workflowAgentId] ?? AGENT_BADGE_CLASS.executor
                }`}
                title={`Agent: ${item.workflowAgentId}`}
              >
                {item.workflowAgentId}
              </span>
            )}
            {tokens > 0 && (
              <span
                className={`inline-flex items-center gap-[3px] px-[7px] py-px rounded text-[10px] font-bold shrink-0 ${tone.chip}`}
                title={`${tokens.toLocaleString()} tokens`}
              >
                <Zap size={9} />
                {formatTokens(tokens)} tok
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Custom tooltip (bám theo chuột, không delay) */}
      {tooltip &&
        createPortal(
          <div
            className="fixed z-[2000] box-border flex flex-col gap-2 p-3 overflow-hidden pointer-events-none rounded-xl bg-tooltip-background border border-border shadow-2xl"
            role="tooltip"
            style={getTooltipStyle(tooltip)}
          >
            <div
              className={`text-[13px] font-semibold leading-snug text-text-primary break-words [-webkit-line-clamp:2] ${CLAMP}`}
            >
              {displayTitle}
            </div>

            <div className="flex flex-wrap gap-[5px]">
              {providerId && (
                <span className={CHIP}>
                  {showFavicon && (
                    <img className="w-2.5 h-2.5 rounded-sm" src={favicon as string} alt="" />
                  )}
                  {providerId}
                </span>
              )}
              {modelId && <span className={CHIP}>{modelId}</span>}
              {timestamp > 0 && (
                <span className={CHIP}>
                  <Clock size={10} />
                  {new Date(timestamp).toLocaleString()}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex flex-col gap-px px-2 py-1.5 rounded-lg bg-text-primary/5">
                <b className="text-[13px] font-bold text-text-primary">{totalMsgs}</b>
                <span className="text-[9px] uppercase tracking-[0.06em] text-text-secondary">msg</span>
              </div>
              <div className="flex flex-col gap-px px-2 py-1.5 rounded-lg bg-text-primary/5">
                <b
                  className={`text-[13px] font-bold ${tokens > 0 ? tone.text : 'text-text-primary'}`}
                >
                  {formatTokens(tokens)}
                </b>
                <span className="text-[9px] uppercase tracking-[0.06em] text-text-secondary">tok</span>
              </div>
            </div>

            <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-text-secondary opacity-80">
              Latest message
            </div>
            {isLoadingMessages ? (
              <div className="flex flex-col gap-1.5">
                <div className="h-[9px] w-[92%] rounded bg-text-primary/10 animate-pulse" />
                <div className="h-[9px] w-[78%] rounded bg-text-primary/10 animate-pulse" />
                <div className="h-[9px] w-[54%] rounded bg-text-primary/10 animate-pulse" />
              </div>
            ) : messageFetchError ? (
              <div className="text-xs text-text-secondary italic">{messageFetchError}</div>
            ) : userContent || item.preview ? (
              <div
                className={`text-xs leading-normal text-text-primary whitespace-pre-wrap break-words px-2.5 py-2 rounded bg-text-primary/5 [-webkit-line-clamp:9] ${CLAMP}`}
              >
                {(userContent || item.preview).slice(0, TOOLTIP_PREVIEW_CHARS)}
              </div>
            ) : (
              <div className="text-xs text-text-secondary italic">No content</div>
            )}

            <div className="text-[10px] text-text-secondary opacity-75">
              Click to open · Right-click for more
            </div>
          </div>,
          document.body,
        )}

      {/* Context menu */}
      {menuVisible &&
        createPortal(
          <div
            className="fixed z-[1000] min-w-[190px] p-1 rounded-[10px] bg-dropdown-background border border-border shadow-xl"
            style={{
              top: Math.min(menuPosition.y, window.innerHeight - 140),
              left: Math.min(menuPosition.x, window.innerWidth - 200),
            }}
          >
            {menuItems.map((m) => (
              <button
                key={m.label}
                type="button"
                className={`flex items-center gap-2 w-full px-3 py-[7px] border-none rounded-md bg-transparent text-xs text-left cursor-pointer ${
                  m.danger ? 'text-error hover:bg-error/10' : 'text-text-primary hover:bg-card-hover'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuVisible(false);
                  m.action(e);
                }}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default HistoryCard;