/**
 * ------------------------------------------------------------------
 * RecentActivity
 * ------------------------------------------------------------------
 * Component hiển thị danh sách hội thoại gần đây trong Home panel.
 * Tái sử dụng HistoryCard từ feature history.
 *
 * Main features:
 * - Hiển thị tối đa 10 hội thoại gần nhất
 * - Loading state khi đang fetch
 * - Cho phép xóa hội thoại trực tiếp
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { ConversationItem } from '../../History/types';
import HistoryCard from '../../History/components/HistoryCard';

interface RecentActivityProps {
  conversations: ConversationItem[];
  isLoading: boolean;
  onLoadConversation?: (conversationId: string, tabId: number, folderPath: string | null) => void;
  providerFavicons?: Record<string, string>;
}

const RecentActivity: React.FC<RecentActivityProps> = ({
  conversations,
  isLoading,
  onLoadConversation,
  providerFavicons,
}) => {
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const vscodeApi = (window as any).vscodeApi;
    if (vscodeApi) {
      vscodeApi.postMessage({ command: 'deleteConversation', conversationId: id });
    }
  };

  const formatDate = (ts: number): string => {
    const d = new Date(ts);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <div className="rounded-lg p-3.5 box-border border border-border hover:border-primary transition-all duration-200 ease-in-out">
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] opacity-80 text-primary">
          Recent Activities
        </span>
      </div>

      <div className="flex flex-col gap-0.5">
        {isLoading ? (
          <div className="flex items-center gap-2 py-2.5 text-secondary opacity-60">
            <Loader2 size={12} className="spin-animation" />
            <span className="text-[11px]">Loading history...</span>
          </div>
        ) : conversations.length > 0 ? (
          conversations.slice(0, 10).map((item) => (
            <HistoryCard
              key={item.id}
              item={item}
              onClick={() => {
                onLoadConversation?.(item.id, item.tabId, item.folderPath);
              }}
              onDelete={handleDelete}
              formatDate={formatDate}
              providerFavicons={providerFavicons}
            />
          ))
        ) : (
          <div className="py-2.5 text-[11px] italic text-secondary opacity-60">No recent chats</div>
        )}
      </div>
    </div>
  );
};

export default React.memo(RecentActivity);