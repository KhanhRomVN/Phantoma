/**
 * ------------------------------------------------------------------
 * Conversation History Panel
 * ------------------------------------------------------------------
 * Hiển thị danh sách các cuộc hội thoại ZenCLI đã lưu cho project hiện tại.
 * Hỗ trợ kéo thả (drag & drop) vào Workspace để tự động tạo terminal tab mới
 * và thực thi lệnh resume (`zen-cli --resume <id>`).
 *
 * Main features:
 * - Đọc dữ liệu từ IPC handler `zencli:list-history`
 * - Layout card 3 dòng: title / favicon + provider/model + email / msgs + tokens
 * - Drag & Drop: Kéo card vào khu vực Workspace để tạo tab mới
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { useCodeStore } from '../../../hooks/useCodeStore';
import { HistoryConversationCard, type ConversationEntry } from './HistoryConversationCard';
// ─── Component ──────────────────────────────────────────────────────────
export function History() {
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const currentProjectPath = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.path,
  );

  // Load history when project changes or on mount
  useEffect(() => {
    if (!currentProjectPath) {
      setConversations([]);
      return;
    }

    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await window.api.invoke('zencli:list-history', currentProjectPath);
        setConversations(data || []);
      } catch (err: any) {
        console.error('[History] Failed to load:', err);
        setError(err.message || 'Failed to load conversation history');
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [currentProjectPath]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-sidebar-background">
      {/* HeaderBar — đồng bộ với FileExplore / Search / SourceControl */}
      <div className="flex items-center justify-between h-9 px-2 border-b border-divider flex-shrink-0 bg-sidebar-background">
        <span className="text-[11px] font-medium uppercase tracking-wide text-text-secondary truncate">
          History
        </span>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {loading && (
          <div className="flex items-center justify-center py-8 text-text-secondary text-sm">
            <Clock className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-2 rounded bg-red-500/10 text-red-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-text-secondary text-xs opacity-60">
            <MessageSquare className="w-6 h-6 mb-2" />
            <span>No conversations found</span>
          </div>
        )}

        {conversations.map((conv) => (
          <HistoryConversationCard key={conv.id} conversation={conv} />
        ))}
      </div>
    </div>
  );
}