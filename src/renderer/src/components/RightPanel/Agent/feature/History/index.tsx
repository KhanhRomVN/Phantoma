import React, { useCallback, useState } from 'react';
import HistoryCard from './components/HistoryCard';
import { FolderOpen, Loader2, Search } from 'lucide-react';
import { useConversationHistory } from './hooks/useConversationHistory';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadConversation?: (conversationId: string, tabId: number, folderPath: string | null) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, onLoadConversation }) => {
  const {
    conversations,
    totalCount,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedSort,
    setSelectedSort,
    deleteConversation,
    clearAllHistory,
  } = useConversationHistory(isOpen);

  const [closeHover, setCloseHover] = useState(false);
  const [trashHover, setTrashHover] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${d}/${m}/${y} ${h}:${min}`;
  };

  const handleDeleteConversation = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      deleteConversation(id);
    },
    [deleteConversation],
  );

  const getDateLabel = (item: {
    lastModified?: number;
    timestamp?: number;
    createdAt?: number;
  }): string => {
    const ts = item.lastModified || item.timestamp || item.createdAt || 0;
    const date = new Date(ts);
    const now = new Date();
    const dd = date.getDate().toString().padStart(2, '0');
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dateStr = `${dd}/${mm}`;
    if (date.toDateString() === now.toDateString()) return `Today · ${dateStr}`;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday · ${dateStr}`;
    return `${date.toLocaleDateString('en-US', { weekday: 'long' })} · ${dateStr}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 w-full h-full z-50 flex flex-col"
      style={{ backgroundColor: 'var(--secondary-bg)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 px-4 pt-4 pb-3.5 shrink-0"
        style={{
          borderTop: '1px solid var(--border-color)',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--tertiary-bg)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Icon badge */}
          <div
            className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
            style={{
              background: 'rgba(128,128,128,0.1)',
              color: 'var(--vscode-foreground)',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="5" x="2" y="3" rx="1" />
              <path d="M4 8v11a2 2 0 0 0 2 2h2" />
              <path d="M20 8v11a2 2 0 0 1-2 2h-2" />
              <path d="m9 15 3-3 3 3" />
              <path d="M12 12v9" />
            </svg>
          </div>
          <div>
            <div className="mb-[3px]">
              <span
                className="font-bold text-sm tracking-[0.01em]"
                style={{ color: 'var(--primary-text)' }}
              >
                History
              </span>
            </div>
            <p
              className="m-0 text-xs opacity-70 leading-relaxed"
              style={{ color: 'var(--secondary-text)' }}
            >
              Browse and manage your conversation history
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          onMouseEnter={() => setCloseHover(true)}
          onMouseLeave={() => setCloseHover(false)}
          className="p-[5px] rounded-md shrink-0 border-none flex items-center justify-center cursor-pointer transition-all duration-150"
          style={{
            backgroundColor: closeHover
              ? 'rgba(239,68,68,0.12)'
              : 'rgba(128,128,128,0.12)',
            color: closeHover
              ? 'var(--vscode-errorForeground, #f87171)'
              : 'var(--secondary-text)',
          }}
          title="Close History"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div
        className="flex gap-2 items-center p-3"
        style={{
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--tertiary-bg)',
        }}
      >
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded outline-none box-border"
            style={{
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--primary-text)',
            }}
          />
          <Search
            className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--secondary-text)' }}
          />
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          onMouseEnter={() => setTrashHover(true)}
          onMouseLeave={() => setTrashHover(false)}
          className="p-[5px] rounded-md shrink-0 cursor-pointer transition-all duration-150"
          style={{
            backgroundColor: trashHover
              ? 'rgba(234,179,8,0.12)'
              : 'rgba(128,128,128,0.12)',
            border: trashHover
              ? '1px solid rgba(234,179,8,0.4)'
              : '1px solid transparent',
            color: trashHover
              ? 'var(--vscode-editorWarning-foreground, #fbbf24)'
              : 'var(--secondary-text)',
          }}
          title="Clear all history"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div
          className="absolute inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="flex flex-col gap-3 p-5 w-[calc(100%-32px)] rounded-[10px]"
            style={{
              backgroundColor: 'var(--tertiary-bg)',
              border: '1px solid var(--border-color)',
            }}
          >
            <p
              className="m-0 text-[15px] font-semibold"
              style={{ color: 'var(--primary-text)' }}
            >
              Clear All History
            </p>
            <p
              className="m-0 text-[13px] opacity-80"
              style={{ color: 'var(--secondary-text)' }}
            >
              Are you sure? This will permanently delete all conversations.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-[5px] text-[13px] rounded-md border bg-transparent cursor-pointer"
                style={{
                  borderColor: 'var(--border-color)',
                  color: 'var(--secondary-text)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAllHistory();
                  setShowConfirm(false);
                }}
                className="px-3 py-[5px] text-[13px] rounded-md border cursor-pointer"
                style={{
                  borderColor: 'rgba(239,68,68,0.4)',
                  backgroundColor: 'rgba(239,68,68,0.12)',
                  color: '#f87171',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div
            className="flex flex-col items-center justify-center h-[160px] gap-2"
            style={{ color: 'var(--secondary-text)' }}
          >
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: 'var(--accent-text)', animation: 'spin 1s linear infinite' }}
            />
            <span className="text-xs">Loading...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-[160px] gap-3"
            style={{ color: 'var(--secondary-text)' }}
          >
            <FolderOpen className="w-10 h-10 opacity-20" />
            <div className="text-center">
              <h3
                className="text-sm font-medium mb-1 opacity-70"
                style={{ color: 'var(--primary-text)' }}
              >
                {searchQuery ? 'No results found' : 'No conversations yet'}
              </h3>
              <p className="text-xs max-w-[200px] mx-auto opacity-70">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Start a new chat to begin'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {conversations.map((item, i) => {
              const label = getDateLabel(item);
              const showLabel =
                i === 0 || getDateLabel(conversations[i - 1]) !== label;
              return (
                <React.Fragment key={item.id}>
                  {showLabel && (
                    <div
                      className="text-[11px] font-semibold uppercase tracking-[0.06em] pt-2 pb-1 pl-2 opacity-60"
                      style={{ color: 'var(--secondary-text)' }}
                    >
                      {label}
                    </div>
                  )}
                  <HistoryCard
                    item={item}
                    onClick={() => {
                      onLoadConversation?.(
                        item.id,
                        item.tabId,
                        item.folderPath,
                      );
                    }}
                    onDelete={handleDeleteConversation}
                    formatDate={formatDate}
                  />
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default HistoryPanel;