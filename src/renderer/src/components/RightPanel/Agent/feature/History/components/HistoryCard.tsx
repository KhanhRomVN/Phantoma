/**
 * ------------------------------------------------------------------
 * HistoryCard
 * ------------------------------------------------------------------
 * Card hiển thị một hội thoại trong danh sách lịch sử.
 * Lazy-load tin nhắn khi hover/click, hiển thị model, token usage,
 * và context menu (xóa, copy nội dung, mở thư mục).
 *
 * Main features:
 * - Hiển thị tiêu đề (parse từ user-message), model, request/response count
 * - Token badge với màu theo mức sử dụng
 * - Lazy-load messages khi hover/click
 * - Context menu: Xóa, Copy nội dung, Mở thư mục conv
 * ------------------------------------------------------------------
 */

import React from 'react';
import { ConversationItem } from '../types';
import { Trash2, Copy, FolderOpen, Zap } from 'lucide-react';
import { extensionService } from '../../../services/ExtensionService';
import { $ } from '@renderer/utils/color';

interface HistoryCardProps {
  item: ConversationItem;
  onClick: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  formatDate: (timestamp: number) => string;
  providerFavicons?: Record<string, string>;
}

const HistoryCard: React.FC<HistoryCardProps> = ({
  item,
  onClick,
  onDelete,
  providerFavicons,
}) => {
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 });
  const [messages, setMessages] = React.useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false);
  const [messageFetchError, setMessageFetchError] = React.useState<string | null>(null);
  const [shouldLoad, setShouldLoad] = React.useState(false);

  const loadTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Truncate title
  const title = item.title
    ? item.title.length > 60
      ? item.title.substring(0, 57) + '...'
      : item.title
    : 'Untitled';

  const getTokenColor = (n: number) => {
    if (n >= 500000)
      return {
        bg: 'rgba(239,68,68,0.15)',
        border: 'rgba(239,68,68,0.4)',
        text: '#ef4444',
      };
    if (n >= 100000)
      return {
        bg: 'rgba(249,115,22,0.15)',
        border: 'rgba(249,115,22,0.4)',
        text: '#f97316',
      };
    if (n >= 50000)
      return {
        bg: 'rgba(234,179,8,0.15)',
        border: 'rgba(234,179,8,0.4)',
        text: '#ca8a04',
      };
    if (n >= 10000)
      return {
        bg: 'rgba(34,197,94,0.15)',
        border: 'rgba(34,197,94,0.4)',
        text: '#16a34a',
      };
    return {
      bg: 'rgba(99,102,241,0.15)',
      border: 'rgba(99,102,241,0.4)',
      text: '#6366f1',
    };
  };

  const formatTokens = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  };

  // Parse user content from XML
  const parseUserContent = (content: string): string => {
    const regex =
      /## User Message\n<user-message>\n([\s\S]*?)\n<\/user-message>/;
    const match = content.match(regex);
    if (match) {
      return match[1];
    }
    // Fallback: strip wrapper if present
    let cleaned = content
      .replace(/^<user-message>\n?/, '')
      .replace(/\n?<\/user-message>[\s\S]*$/, '');
    if (cleaned.startsWith('```') && cleaned.includes('```', 3)) {
      cleaned = cleaned.split('```')[1]?.trim() || cleaned;
    }
    return cleaned || 'No content';
  };

  // Get latest user message content
  const getUserContent = (): string => {
    if (!messages.length) return '';
    const userMessages = messages.filter((msg: any) => msg.role === 'user');
    if (!userMessages.length) return '';
    const lastUserMsg = userMessages[userMessages.length - 1];
    return parseUserContent(lastUserMsg.content);
  };

  // Get provider_id/model_id from messages
  const getModelInfo = (): {
    providerId: string | null;
    modelId: string | null;
  } => {
    if (!messages.length) return { providerId: null, modelId: null };
    const assistantMsg = messages.find(
      (msg: any) => msg.role === 'assistant' && (msg.modelId || msg.providerId),
    );
    if (!assistantMsg) return { providerId: null, modelId: null };
    return {
      providerId: assistantMsg.providerId || null,
      modelId: assistantMsg.modelId || null,
    };
  };

  // Calculate request count and response count
  const getRequestResponseCounts = (): {
    requests: number;
    responses: number;
  } => {
    if (!messages.length) return { requests: 0, responses: 0 };
    const requests = messages.filter((msg: any) => msg.role === 'user').length;
    const responses = messages.filter(
      (msg: any) => msg.role === 'assistant' && !msg.isError,
    ).length;
    return { requests, responses };
  };

  // Format timestamp: "2m ago", "Yesterday 12:30", "dd/mm/yy hh:mm"
  const formatTimeText = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days === 0) {
      if (hours === 0) {
        if (minutes === 0) return 'Just now';
        return `${minutes}m ago`;
      }
      return `${hours}h ago`;
    }
    if (days === 1) {
      const d = new Date(timestamp);
      return `Yesterday ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
    if (days < 7) {
      return `${days}d ago`;
    }
    const d = new Date(timestamp);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(2)} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const userContent = getUserContent();
  const messagesModelInfo = getModelInfo();
  const providerId =
    item.provider || messagesModelInfo.providerId;
  const modelId = messagesModelInfo.modelId;
  const favicon = providerId ? providerFavicons?.[providerId] : null;
  const { requests, responses } = getRequestResponseCounts();
  const timestamp = item.lastModified || item.timestamp || item.createdAt || 0;
  const timeText = formatTimeText(timestamp);

  // Lazy load messages only when user hovers or clicks
  const triggerLoad = React.useCallback(() => {
    if (shouldLoad || isLoadingMessages || messages.length > 0) return;
    setShouldLoad(true);
  }, [shouldLoad, isLoadingMessages, messages.length]);

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
    const requestId = `hist-card-${Date.now()}`;
    extensionService.postMessage({
      command: 'getConversation',
      conversationId: item.id,
      requestId,
    });

    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (
        data.command === 'conversationResult' &&
        data.requestId === requestId
      ) {
        window.removeEventListener('message', handler);
        if (data.data?.messages) {
          setMessages(data.data.messages);
          // Update cache if available
          if ((window as any).ConversationCache) {
            (window as any).ConversationCache.set(item.id, {
              messages: data.data.messages,
              conversationId: item.id,
            });
          }
        } else {
          setMessageFetchError('No messages found');
        }
        setIsLoadingMessages(false);
      }
    };

    window.addEventListener('message', handler);
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      setIsLoadingMessages(false);
    }, 5000);
    loadTimeoutRef.current = timeout;

    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      window.removeEventListener('message', handler);
    };
  }, [shouldLoad, item.id]);

  React.useEffect(() => {
    const close = () => setMenuVisible(false);
    if (menuVisible) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuVisible]);

  const handleCopyContent = () => {
    const requestId = `copy-${Date.now()}`;
    extensionService.postMessage({
      command: 'getConversation',
      conversationId: item.id,
      requestId,
    });
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (
        data.command === 'conversationResult' &&
        data.requestId === requestId
      ) {
        window.removeEventListener('message', handler);
        if (data.data?.messages) {
          const text = data.data.messages
            .map((msg: any) => {
              let content = msg.content;
              const m = content.match(/## User Message\n```\n([\s\S]*?)\n```/);
              if (m) content = m[1];
              return `[${msg.role.toUpperCase()}]\n${content}`;
            })
            .join('\n\n');
          navigator.clipboard.writeText(text.trim());
        }
      }
    };
    window.addEventListener('message', handler);
    setTimeout(() => window.removeEventListener('message', handler), 5000);
  };

  const handleOpenCoversationFolder = () => {
    extensionService.postMessage({
      command: 'openConversationFolder',
      conversationId: item.id,
    });
  };

  return (
    <div className="history-card-container">
      <div
        className="history-card-inner"
        onClick={() => {
          triggerLoad();
          onClick();
        }}
        onMouseEnter={triggerLoad}
        onContextMenu={(e) => {
          e.preventDefault();
          triggerLoad();
          setMenuPosition({ x: e.clientX, y: e.clientY });
          setMenuVisible(true);
        }}
        style={{
          width: '100%',
          padding: '7px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {/* Row 1: Title (parsed from user-message) */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--primary-text)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              flex: 1,
            }}
          >
            {item.title ? title : userContent || title}
          </span>

          {/* TimeText - now on the right of Row 1 */}
          <span
            style={{
              fontSize: '10px',
              color: 'var(--secondary-text, #888)',
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            {timeText}
          </span>
        </div>

        {/* Row 2: Badge row - model+request/response on the left, token badge on the right */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '2px',
          }}
        >
          {/* Left: Model + request/response count */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
            }}
          >
            {modelId && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0 6px',
                  borderRadius: '3px',
                  backgroundColor: 'rgba(128,128,128,0.06)',
                  color: 'var(--secondary-text, #888)',
                  fontSize: '9px',
                  fontWeight: 500,
                  height: '16px',
                  letterSpacing: '0.3px',
                }}
              >
                {favicon && (
                  <img
                    src={favicon}
                    alt=""
                    width={10}
                    height={10}
                    style={{ borderRadius: '2px', flexShrink: 0 }}
                  />
                )}
                {providerId ? `${providerId}/${modelId}` : modelId}
              </div>
            )}

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                color: 'var(--secondary-text, #888)',
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={$('--success') || '#89d185'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    flexShrink: 0,
                  }}
                >
                  <path d="M12 3v12" />
                  <path d="m17 8-5-5-5 5" />
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                </svg>
                {requests}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={$('--error') || '#f48771'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    flexShrink: 0,
                  }}
                >
                  <path d="M12 15V3" />
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="m7 10 5 5 5-5" />
                </svg>
                {responses}
              </span>
            </div>
          </div>

          {/* Right: Token badge - no border/outline */}
          {(item.totalTokenUsage ?? 0) > 0 &&
            (() => {
              const c = getTokenColor(item.totalTokenUsage ?? 0);
              return (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    flexShrink: 0,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: c.bg,
                    color: c.text,
                    fontSize: '10px',
                    fontWeight: 700,
                  }}
                >
                  <Zap size={9} />
                  <span>{formatTokens(item.totalTokenUsage ?? 0)}</span>
                </div>
              );
            })()}
        </div>
      </div>

      {/* Context menu */}
      {menuVisible && (
        <div
          className="fixed rounded-lg z-[1000] min-w-[180px] p-1"
          style={{
            top: menuPosition.y,
            left: menuPosition.x,
            backgroundColor: $('--tertiary-bg') || 'transparent',
            border: `1px solid ${$('--border-color') || 'rgba(128,128,128,0.2)'}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          }}
        >
          {[
            {
              icon: <Trash2 size={13} />,
              label: 'Xóa',
              color: $('--error-color') || '#ef4444',
              hoverBg: 'rgba(244,67,54,0.1)',
              action: (e: React.MouseEvent) => {
                setMenuVisible(false);
                onDelete(item.id, e);
              },
            },
            {
              icon: <Copy size={13} />,
              label: 'Copy nội dung',
              color: $('--primary-text') || 'currentColor',
              hoverBg: $('--hover-bg') || 'rgba(128,128,128,0.1)',
              action: () => {
                setMenuVisible(false);
                handleCopyContent();
              },
            },
            {
              icon: <FolderOpen size={13} />,
              label: 'Mở thư mục conv',
              color: $('--primary-text') || 'currentColor',
              hoverBg: $('--hover-bg') || 'rgba(128,128,128,0.1)',
              action: () => {
                setMenuVisible(false);
                handleOpenCoversationFolder();
              },
            },
          ].map((menuItem, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                menuItem.action(e);
              }}
              className="flex items-center gap-2 w-full px-3 py-[7px] rounded-md border-none bg-transparent text-xs cursor-pointer text-left"
              style={{ color: menuItem.color }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = menuItem.hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {menuItem.icon}
              <span>{menuItem.label}</span>
            </button>
          ))}
        </div>
      )}

      <style>{`
        .history-card-container {
          width: 100%; border-radius: 6px;
          border: none; background-color: transparent;
          cursor: pointer; position: relative; overflow: hidden;
        }
        .history-card-container:hover { background-color: var(--hover-bg); }
      `}</style>
    </div>
  );
};

export default HistoryCard;