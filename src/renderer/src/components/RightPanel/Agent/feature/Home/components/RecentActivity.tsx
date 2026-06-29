import React from 'react';
import { Loader2 } from 'lucide-react';
import { ConversationItem } from '../../History/types';
import HistoryCard from '../../History/components/HistoryCard';

interface RecentActivityProps {
  conversations: ConversationItem[];
  isLoading: boolean;
  onLoadConversation?: (conversationId: string, tabId: number, folderPath: string | null) => void;
}

const RecentActivity: React.FC<RecentActivityProps> = ({
  conversations,
  isLoading,
  onLoadConversation,
}) => {
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const vscodeApi = (window as any).vscodeApi;
    if (vscodeApi) {
      vscodeApi.postMessage({ command: 'confirmDelete', conversationId: id });
    }
  };

  const formatDate = (ts: number): string => {
    const d = new Date(ts);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <div
      className="rounded-lg p-3.5 box-border"
      style={{
        backgroundColor: 'var(--vscode-sideBar-background, rgba(0,0,0,0.15))',
        border: '1px solid var(--vscode-widget-border, rgba(128,128,128,0.15))',
      }}
    >
      <div className="flex justify-between items-center mb-2.5">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.05em] opacity-80"
          style={{ color: 'var(--vscode-foreground)' }}
        >
          Recent Activities
        </span>
      </div>

      <div className="flex flex-col gap-0.5">
        {isLoading ? (
          <div
            className="flex items-center gap-2 py-2.5"
            style={{ color: 'var(--vscode-disabledForeground)' }}
          >
            <Loader2 size={12} className="spin-animation" />
            <span className="text-[11px]">Loading history...</span>
          </div>
        ) : conversations.length > 0 ? (
          conversations
            .slice(0, 10)
            .map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                onClick={() => onLoadConversation?.(item.id, item.tabId, item.folderPath)}
                onDelete={handleDelete}
                formatDate={formatDate}
              />
            ))
        ) : (
          <div
            className="py-2.5 text-[11px] italic"
            style={{ color: 'var(--vscode-disabledForeground)' }}
          >
            No recent chats
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;