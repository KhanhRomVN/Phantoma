import React, { useCallback, useState } from 'react';
import HistoryCard from './components/HistoryCard';
import { FolderOpen, Loader2, Search } from 'lucide-react';
import { useConversationHistory } from './hooks/useConversationHistory';
import { Drawer, DrawerHeader, DrawerBody } from '@renderer/components/ui/Drawer';
import { Button } from '@renderer/components/ui/Button';

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

  return (
    <Drawer isOpen={isOpen} onClose={onClose} height="100%" strategy="absolute">
      <DrawerHeader
        title="History"
        description="Browse and manage your conversation history"
        onClose={onClose}
      />

      {/* Search */}
      <div className="flex gap-2 items-center px-4 py-3 border-b border-divider bg-background">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded outline-none box-border bg-[rgb(var(--input-background))] border border-border text-text-primary"
          />
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          onMouseEnter={() => setTrashHover(true)}
          onMouseLeave={() => setTrashHover(false)}
          className="p-[5px] rounded-md shrink-0 cursor-pointer transition-all duration-150"
          style={{
            backgroundColor: trashHover ? 'rgba(234,179,8,0.12)' : 'rgba(128,128,128,0.12)',
            border: trashHover ? '1px solid rgba(234,179,8,0.4)' : '1px solid transparent',
            color: trashHover ? 'var(--warn, #fbbf24)' : 'var(--secondary-text)',
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
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="flex flex-col gap-3 p-5 w-[calc(100%-32px)] rounded-[10px] bg-[rgb(var(--card-background))] border border-border">
            <p className="m-0 text-[15px] font-semibold text-text-primary">Clear All History</p>
            <p className="m-0 text-[13px] opacity-80 text-text-secondary">
              Are you sure? This will permanently delete all conversations.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="error"
                size="sm"
                onClick={() => {
                  clearAllHistory();
                  setShowConfirm(false);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <DrawerBody className="p-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[160px] gap-2 text-text-secondary">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-text)]" />
            <span className="text-xs">Loading...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[160px] gap-3 text-text-secondary">
            <FolderOpen className="w-10 h-10 opacity-20" />
            <div className="text-center">
              <h3 className="text-sm font-medium mb-1 opacity-70 text-text-primary">
                {searchQuery ? 'No results found' : 'No conversations yet'}
              </h3>
              <p className="text-xs max-w-[200px] mx-auto opacity-70">
                {searchQuery ? 'Try a different search term' : 'Start a new chat to begin'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {conversations.map((item, i) => {
              const label = getDateLabel(item);
              const showLabel = i === 0 || getDateLabel(conversations[i - 1]) !== label;
              return (
                <React.Fragment key={item.id}>
                  {showLabel && (
                    <div className="text-[11px] font-semibold uppercase tracking-[0.06em] pt-2 pb-1 pl-2 opacity-60 text-text-secondary">
                      {label}
                    </div>
                  )}
                  <HistoryCard
                    item={item}
                    onClick={() => {
                      onLoadConversation?.(item.id, item.tabId, item.folderPath);
                    }}
                    onDelete={handleDeleteConversation}
                    formatDate={formatDate}
                  />
                </React.Fragment>
              );
            })}
          </div>
        )}
      </DrawerBody>
    </Drawer>
  );
};

export default HistoryPanel;