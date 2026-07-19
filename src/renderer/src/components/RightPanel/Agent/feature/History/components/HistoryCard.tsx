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
}

const HistoryCard: React.FC<HistoryCardProps> = ({ item, onClick, onDelete }) => {
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    const close = () => setMenuVisible(false);
    if (menuVisible) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuVisible]);

  const handleCopyContent = () => {
    const requestId = `copy-${Date.now()}`;
    console.log('[HistoryCard] requesting conversation for copy:', { conversationId: item.id, requestId });
    extensionService.postMessage({
      command: 'getConversation',
      conversationId: item.id,
      requestId,
    });
    const handler = (data: any) => {
      console.log('[HistoryCard] messageResponse for copy:', { command: data.command, requestId: data.requestId });
      if (data.command === 'getConversation' && data.requestId === requestId) {
        unsubscribe();
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
    const unsubscribe = extensionService.onMessage('messageResponse', handler);
    setTimeout(() => unsubscribe(), 5000);
  };

  const handleOpenFolder = () => {
    extensionService.postMessage({
      command: 'openConversationFolder',
      conversationId: item.id,
    });
  };

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

  return (
    <div className="w-full rounded-md border-none bg-transparent cursor-pointer relative overflow-hidden">
      <div
        className="history-card-inner w-full flex items-center justify-between gap-2 px-2.5 py-[7px] hover:bg-card-hover rounded-md"
        onClick={onClick}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuPosition({ x: e.clientX, y: e.clientY });
          setMenuVisible(true);
        }}
      >
        {/* Title */}
        <span
          className="text-[13px] font-medium overflow-hidden whitespace-nowrap text-ellipsis flex-1"
          style={{ color: $('--primary-text') || 'currentColor' }}
        >
          {title}
        </span>

        {/* Token badge */}
        {(item.totalTokenUsage ?? 0) > 0 &&
          (() => {
            const c = getTokenColor(item.totalTokenUsage ?? 0);
            return (
              <div
                className="flex items-center gap-[3px] shrink-0 px-1.5 py-px rounded text-[10px] font-bold"
                style={{
                  backgroundColor: c.bg,
                  border: `1px solid ${c.border}`,
                  color: c.text,
                }}
              >
                <Zap size={9} />
                <span>{formatTokens(item.totalTokenUsage ?? 0)}</span>
              </div>
            );
          })()}
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
                handleOpenFolder();
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
    </div>
  );
};

export default HistoryCard;
