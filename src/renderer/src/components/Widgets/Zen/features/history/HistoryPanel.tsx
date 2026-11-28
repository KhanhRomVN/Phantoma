/**
 * ------------------------------------------------------------------
 * HistoryPanel
 * ------------------------------------------------------------------
 * Panel hiển thị lịch sử conversation, hỗ trợ tìm kiếm, xóa từng
 * conversation hoặc xóa toàn bộ.
 *
 * Main features:
 * - Tìm kiếm conversations
 * - Load conversation khi click
 * - Xóa conversation đơn lẻ hoặc toàn bộ
 * - Hiển thị ngày theo nhóm (Today, Yesterday, ...)
 * ------------------------------------------------------------------
 */

import React, { useCallback, useMemo, useState } from 'react';
import HistoryCard from './components/HistoryCard';
import ConfirmClearHistoryModal from './components/ConfirmClearHistoryModal';
import { FolderOpen, Loader2, Search } from 'lucide-react';
import { useConversationHistory } from './hooks/useConversationHistory';
import { getDateLabel } from './utils/history.utils';
import { Drawer, DrawerBody } from '@renderer/components/ui/Drawer';
import { $ } from '@renderer/utils/color';
import { NavTarget } from '../../shared/components/AgentNavBadge';
import NavPanelHeader from '../../shared/components/NavPanelHeader';

export interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadConversation?: (conversationId: string, tabId: number, folderPath: string | null) => void;
  onNavigate: (target: NavTarget) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  isOpen,
  onClose,
  onLoadConversation,
  onNavigate,
}) => {
  const {
    conversations,
    totalCount,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    deleteConversation,
    clearAllHistory,
    refreshHistory,
  } = useConversationHistory(isOpen);

  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteConversation = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      void deleteConversation(id);
    },
    [deleteConversation],
  );

  // Tính nhãn ngày một lần cho mỗi item
  const groupedItems = useMemo(
    () => conversations.map((item) => ({ item, label: getDateLabel(item) })),
    [conversations],
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} height="100%" strategy="absolute" showHandle={false}>
      <NavPanelHeader
        title="History"
        description="Browse and manage your conversation history"
        maxWidth={680}
        current="history"
        onNavigate={onNavigate}
        onClose={onClose}
      />

      {/* Search */}
      <div className="w-full max-w-[680px] mx-auto box-border flex gap-2 items-center px-4 py-3 bg-background">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search conversations..."
            aria-label="Search conversations"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded outline-none box-border bg-input-background border border-border text-text-primary"
          />
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
        </div>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="p-[5px] rounded-md shrink-0 cursor-pointer transition-all duration-150 border bg-[rgba(128,128,128,0.12)] border-transparent text-text-secondary hover:bg-[rgba(234,179,8,0.12)] hover:border-[rgba(234,179,8,0.4)] hover:text-warn"
          title="Clear all history"
          aria-label="Clear all history"
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

      {/* Confirm drawer */}
      <ConfirmClearHistoryModal
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={clearAllHistory}
        totalCount={totalCount}
      />

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="w-full max-w-[680px] mx-auto box-border px-4 pb-2 flex items-center gap-2 text-xs text-error"
        >
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => void refreshHistory()}
            className="px-2 py-0.5 rounded border border-border text-text-secondary hover:text-text-primary cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* List */}
      <DrawerBody className="py-3 px-[max(12px,calc((100%-680px)/2+16px))]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[160px] gap-2 text-text-secondary">
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: $('--accent-text') || 'currentColor' }}
            />
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
                {searchQuery
                  ? 'Try a different search term'
                  : 'Start a new conversation to see it here'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {groupedItems.map(({ item, label }, i) => {
              const showLabel = i === 0 || groupedItems[i - 1].label !== label;
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
