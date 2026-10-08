/**
 * ------------------------------------------------------------------
 * History Conversation Card
 * ------------------------------------------------------------------
 * Component con cho mỗi cuộc hội thoại trong danh sách History.
 * Hỗ trợ drag & drop với payload JSON chứa thông tin resume.
 * Layout 3 dòng: title / favicon + provider/model + email / msgs + tokens.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { useCallback } from 'react';
import { MessageSquare, Cpu } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { Favicon } from '@renderer/shared/utils/faviconUtils';

// ─── Interfaces ───────────────────────────────────────────────────────
export interface ConversationEntry {
  id: string;
  title: string;
  createdAt: number;
  lastModified: number;
  messageCount: number;
  totalTokens: number;
  providerId?: string;
  modelId?: string;
  email?: string;
  websiteUrl?: string;
  sourceEnvironment?: 'terminal' | 'vscode-extension';
}

interface HistoryConversationCardProps {
  conversation: ConversationEntry;
}

// ─── Component ──────────────────────────────────────────────────────────
export function HistoryConversationCard({ conversation }: HistoryConversationCardProps) {
  // Handle drag start for this specific conversation
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('application/json', JSON.stringify({
        type: 'zencli-resume',
        conversationId: conversation.id,
        title: conversation.title,
      }));
    },
    [conversation.id, conversation.title],
  );

  const modelText = conversation.modelId
    ? `${conversation.providerId ? conversation.providerId + '/' : ''}${conversation.modelId}`
    : '';

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "group relative p-2.5 rounded-md border border-transparent transition-all cursor-grab active:cursor-grabbing",
        "hover:bg-white/[0.03] hover:border-white/[0.08]",
        "bg-card-background/50"
      )}
    >
      {/* Dòng 1: conversation_title */}
      <div className="mb-1">
        <span
          className="block text-[13px] font-medium text-text-primary truncate leading-tight"
          title={conversation.title}
        >
          {conversation.title || 'Untitled'}
        </span>
      </div>

      {/* Dòng 2: favicon + provider/model + email */}
      {(modelText || conversation.email) && (
        <div className="flex items-center gap-1.5 mb-1 min-w-0">
          {conversation.websiteUrl && (
            <Favicon
              url={conversation.websiteUrl}
              size={14}
              className="shrink-0 rounded-sm"
            />
          )}
          {modelText && (
            <span
              className="text-[11px] text-text-secondary truncate"
              title={modelText}
            >
              {modelText}
            </span>
          )}
          {conversation.email && (
            <>
              <span className="text-[11px] text-text-secondary/40 shrink-0">·</span>
              <span
                className="text-[11px] text-text-secondary/70 truncate"
                title={conversation.email}
              >
                {conversation.email}
              </span>
            </>
          )}
        </div>
      )}

      {/* Dòng 3: tổng message + tổng token */}
      <div className="flex items-center gap-3 text-[10px] text-text-secondary/70">
        <span className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3 opacity-70" />
          <span className="tabular-nums">{conversation.messageCount} msgs</span>
        </span>
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3 opacity-70" />
          <span className="tabular-nums">{conversation.totalTokens.toLocaleString()} tok</span>
        </span>
      </div>

      {/* Hover Indicator for Dragging */}
      <div className="absolute inset-0 rounded-md ring-1 ring-primary/0 group-hover:ring-primary/30 transition-all pointer-events-none" />
    </div>
  );
}