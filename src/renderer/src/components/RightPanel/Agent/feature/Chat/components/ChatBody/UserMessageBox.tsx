import React from 'react';
/**
 * ------------------------------------------------------------------
 * UserMessageBox
 * ------------------------------------------------------------------
 * Component hiển thị message của người dùng trong chat.
 * Hỗ trợ Inline Edit, Revert Preview, và Question Answer parsing.
 *
 * Main features:
 * - Hiển thị nội dung message đã clean question-answer tags
 * - Chế độ chỉnh sửa inline với auto-resize textarea
 * - Nút Copy, Edit và Revert ở thanh công cụ dưới cùng
 * - Tích hợp RevertConfirmModal để xác nhận thay đổi file trước khi revert/edit
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ── Types ──
import { Message } from '../../types/message';

// ── Components ──
import FilesPreviews from '../../../../components/MessageInput/FilesPreviews';
import RevertConfirmModal from './RevertConfirmModal';

// ── Hooks ─
import { useMessageActions } from '../../hooks/messages/useMessageActions';

// ─── Helper ────────────────────────────────────────────────────────────
const parseQuestionAnswerFromContent = (
  content: string,
): { answers: Record<string, string>; cleanedContent: string } => {
  const regex = /<question-answer>([\s\S]*?)<\/question-answer>/i;
  const match = regex.exec(content);

  if (!match) {
    return { answers: {}, cleanedContent: content };
  }

  const innerContent = match[1].trim();
  const answers: Record<string, string> = {};

  const lines = innerContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const lineMatch = /^(\d+)\.\s*(.*)$/i.exec(trimmed);
    if (!lineMatch) continue;

    const questionNumber = lineMatch[1];
    const answerText = lineMatch[2].trim();
    answers[`q${questionNumber}`] = answerText || '(no answer)';
  }

  const cleanedContent = content.replace(regex, '').trim();
  return { answers, cleanedContent };
};

interface UserMessageBoxProps {
  message: Message;
  messages?: Message[];
  conversationId?: string;
  onRevertConversation?: (messageId: string, timestamp: number) => void;
  onSendMessage?: (
    content: string,
    files?: any[],
    model?: any,
    account?: any,
    skipLogic?: boolean,
    actionIds?: string[],
    uiHidden?: boolean,
    extraOptions?: {
      user_action?: string;
      edit_message_id?: string;
      parent_message_id?: string;
    },
  ) => void | Promise<void>;
}

const UserMessageBox: React.FC<UserMessageBoxProps> = ({
  message,
  messages,
  conversationId,
  onRevertConversation,
  onSendMessage,
}) => {
  const [showRevertModal, setShowRevertModal] = React.useState(false);
  const [isCopied, setIsCopied] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState('');
  const [pendingSendEdit, setPendingSendEdit] = React.useState<{ content: string } | null>(null);
  const [showRevertModal_forEdit, setShowRevertModal_forEdit] = React.useState(false);
  const [checkingRevert, setCheckingRevert] = React.useState(false);
  const [checkingRevertIcon, setCheckingRevertIcon] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Hook xử lý regenerate/edit/retry khi có đủ context.
  const { handleRegenerateRequest } = useMessageActions({
    messages: messages || [message],
    onSendMessage,
    onRevertConversation,
  });

  const userMsgRegex = /## User Message\n<zen-user-content>\n([\s\S]*?)\n<\/zen-user-content>/;
  const match = message.content.match(userMsgRegex);

  if (!match && !message.content.includes('## User Message')) {
    return null;
  }

  let displayContent = match ? match[1] : message.content.replace(/^[\s\S]*?## User Message\n/, '');

  if (!match) {
    if (displayContent.startsWith('```') && displayContent.includes('```', 3)) {
      displayContent = displayContent.split('```')[1].trim();
    }
    displayContent = displayContent
      .replace(/^<zen-user-content>\n?/, '')
      .replace(/\n?<\/zen-user-content>[\s\S]*$/, '');
  }

  // Parse <question-answer> tag from content
  const { answers: questionAnswers, cleanedContent } =
    parseQuestionAnswerFromContent(displayContent);
  const hasQuestionAnswers = Object.keys(questionAnswers).length > 0;

  if (hasQuestionAnswers) {
    displayContent = cleanedContent;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1000);
  };

  // Auto-resize textarea in edit mode
  React.useEffect(() => {
    if (!isEditing) return;
    const el = textareaRef.current;
    if (!el) return;
    const rafId = requestAnimationFrame(() => {
      el.style.height = 'auto';
      const maxHeight = 240;
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
      el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
    });
    return () => cancelAnimationFrame(rafId);
  }, [editValue, isEditing]);

  const handleOpenEdit = () => {
    setEditValue(displayContent);
    setIsEditing(true);
    setTimeout(() => {
      textareaRef.current?.focus();
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    }, 50);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSendEdit = () => {
    const trimmed = editValue.trim();
    if (!trimmed) return;

    const vscodeApi = (window as any).vscodeApi;

    // Nếu không có vscodeApi hoặc không có messageId, không thể query revert preview
    // → mở drawer như cũ để an toàn
    if (!vscodeApi || !message.id) {
      setPendingSendEdit({ content: trimmed });
      setShowRevertModal_forEdit(true);
      return;
    }

    // Query revert preview trước. Nếu không có file nào bị ảnh hưởng → send thẳng.
    // Nếu có file → mở drawer để user confirm.
    setCheckingRevert(true);

    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (
        data?.command === 'revertPreviewResult' &&
        data?.messageId === message.id
      ) {
        window.removeEventListener('message', handler);
        clearTimeout(timeoutId);
        setCheckingRevert(false);

        const hasFiles = Array.isArray(data.files) && data.files.length > 0;
        if (hasFiles) {
          // Có file bị ảnh hưởng → cần confirm qua drawer/modal
          setPendingSendEdit({ content: trimmed });
          setShowRevertModal_forEdit(true);
        } else {
          // Không có revert nào → send ngay, không qua modal
          if (onSendMessage) {
            onSendMessage(trimmed, undefined, undefined, undefined, false, undefined, true, {
              user_action: 'edit',
              edit_message_id: message.id,
              parent_message_id: message.parentMessageId,
            });
          }
          setIsEditing(false);
        }
      }
    };

    window.addEventListener('message', handler);
    vscodeApi.postMessage({
      command: 'getRevertPreview',
      conversationId,
      messageId: message.id,
    });

    // Timeout 3s: nếu không nhận được kết quả → fallback mở modal
    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', handler);
      setCheckingRevert(false);
      setPendingSendEdit({ content: trimmed });
      setShowRevertModal_forEdit(true);
    }, 3000);
  };

  const handleConfirmSendEdit = () => {
    if (!pendingSendEdit) return;
    if (onSendMessage) {
      onSendMessage(pendingSendEdit.content, undefined, undefined, undefined, false, undefined, true, {
        user_action: 'edit',
        edit_message_id: message.id,
        parent_message_id: message.parentMessageId,
      });
    }
    setPendingSendEdit(null);
    setIsEditing(false);
  };

  const handleRevertIconClick = () => {
    const vscodeApi = (window as any).vscodeApi;
    if (!vscodeApi || !message.id) {
      // Không query được → mở modal để an toàn
      setShowRevertModal(true);
      return;
    }

    setCheckingRevertIcon(true);

    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (
        data?.command === 'revertPreviewResult' &&
        data?.messageId === message.id
      ) {
        window.removeEventListener('message', handler);
        clearTimeout(timeoutId);
        setCheckingRevertIcon(false);
        const hasFiles = Array.isArray(data.files) && data.files.length > 0;
        if (hasFiles) {
          setShowRevertModal(true);
        } else {
          // Không có file changes → revert thẳng không cần confirm
          onRevertConversation!(message.id, message.timestamp);
        }
      }
    };

    window.addEventListener('message', handler);
    vscodeApi.postMessage({
      command: 'getRevertPreview',
      conversationId,
      messageId: message.id,
    });

    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', handler);
      setCheckingRevertIcon(false);
      setShowRevertModal(true);
    }, 3000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendEdit();
    }
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-0 mb-4 relative z-[1] transition-all duration-300',
        message.isCancelled
          ? 'opacity-40 grayscale blur-[0.5px] pointer-events-none'
          : 'opacity-100 pointer-events-auto',
      )}
    >
      {/* Files Preview - Show at top if there are files */}
      {message.uploadedFiles?.length || message.attachedItems?.length ? (
        <div className="mb-1">
          <FilesPreviews
            uploadedFiles={message.uploadedFiles || []}
            attachedItems={(message.attachedItems || []) as any}
            onRemoveFile={() => {}}
            onRemoveAttachedItem={() => {}}
            onOpenImage={(file: any) => {
              const vscodeApi = (window as any).vscodeApi;
              if (vscodeApi) {
                vscodeApi.postMessage({
                  command: 'openTempImage',
                  content: file.content,
                  filename: file.name,
                });
              }
            }}
            onAttachedItemClick={() => {}}
          />
        </div>
      ) : null}

      {/* Message bubble — ẩn khi đang edit, thay bằng edit box */}
      {!isEditing ? (
        <div className="flex flex-col gap-1 rounded-md p-3 ml-0 relative bg-input-background border border-border">
          {/* Question Answers Summary */}
          {hasQuestionAnswers && (
            <div className="mb-2 p-2 rounded bg-primary/10 border border-primary/20">
              <div className="text-[11px] font-semibold uppercase tracking-[0.5px] mb-2 text-text-secondary">
                Question Answers
              </div>
              <div className="flex flex-col gap-1.5">
                {Object.entries(questionAnswers).map(([qId, answer]) => {
                  const questionNumber = qId.replace('q', '');
                  return (
                    <div key={qId} className="text-xs leading-relaxed text-text-primary">
                      <span className="font-semibold mr-1.5 text-primary">{questionNumber}.</span>
                      <span
                        className={cn(
                          answer === '(no answer)' ? 'opacity-50 italic' : 'opacity-100 not-italic',
                        )}
                      >
                        {answer}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap break-all max-w-full max-h-[400px] overflow-auto">
            {displayContent}
          </div>
        </div>
      ) : (
        /* Inline edit box — thay thế message bubble */
        <div className="flex flex-col gap-2 rounded-md p-3 ml-0 relative bg-input-background border border-dashed border-primary/50">
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="w-full min-h-[24px] max-h-[240px] resize-none bg-transparent border-none outline-none text-text-primary font-inherit text-xs leading-relaxed p-0 box-border overflow-hidden whitespace-pre-wrap break-word"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1 rounded text-xs cursor-pointer bg-muted/20 hover:bg-muted/30 text-text-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendEdit}
              disabled={!editValue.trim() || checkingRevert}
              className={cn(
                'px-3 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5',
                editValue.trim() && !checkingRevert
                  ? 'bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer'
                  : 'bg-primary/10 text-primary/40 cursor-not-allowed opacity-60',
              )}
            >
              {checkingRevert ? (
                <>
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="animate-spin"
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Checking…
                </>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bottom toolbar */}
      {!isEditing && (
        <div className="w-full flex justify-start items-center gap-2 bg-transparent py-1 px-2">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            title="Copy content"
            className={cn(
              'bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded opacity-70 hover:opacity-100 transition-opacity duration-200',
              isCopied ? 'text-success' : 'text-text-secondary',
            )}
          >
            {isCopied ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
            )}
          </button>

          {/* Edit button */}
          <button
            onClick={handleOpenEdit}
            title="Edit message"
            className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded opacity-70 hover:opacity-100 transition-opacity duration-200 text-text-secondary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          </button>

          {/* Revert button */}
          {onRevertConversation && (
            <button
              onClick={handleRevertIconClick}
              disabled={checkingRevertIcon}
              title="Revert conversation to this point"
              className={cn(
                'bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded transition-opacity duration-200 text-text-secondary',
                checkingRevertIcon ? 'opacity-40 cursor-not-allowed' : 'opacity-70 hover:opacity-100',
              )}
            >
              {checkingRevertIcon ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" /></svg>
              )}
            </button>
          )}
        </div>
      )}

      <RevertConfirmModal
        isOpen={showRevertModal}
        onClose={() => setShowRevertModal(false)}
        onConfirm={() => {
          onRevertConversation!(message.id, message.timestamp);
        }}
      />

      {/* Modal mở khi click Send trong edit mode */}
      <RevertConfirmModal
        isOpen={showRevertModal_forEdit}
        onClose={() => {
          setShowRevertModal_forEdit(false);
          setPendingSendEdit(null);
        }}
        onConfirm={handleConfirmSendEdit}
      />
    </div>
  );
};

export default UserMessageBox;