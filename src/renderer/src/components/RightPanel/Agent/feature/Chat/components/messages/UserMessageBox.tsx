import React from 'react';
import { createPortal } from 'react-dom';
import { Message } from '../../types/message';

interface UserMessageBoxProps {
  message: Message;
  onRevertConversation?: (messageId: string, timestamp: number) => void;
}

const UserMessageBox: React.FC<UserMessageBoxProps> = ({ message, onRevertConversation }) => {
  const [showRevertModal, setShowRevertModal] = React.useState(false);
  const [isCopied, setIsCopied] = React.useState(false);

  // 🆕 FLEXIBLE FILTER: Regex to find the user message block even if not at the start
  const userMsgRegex = /## User Message\n<zen-user-content>\n([\s\S]*?)\n<\/zen-user-content>/;
  const match = message.content.match(userMsgRegex);

  if (!match && !message.content.includes('## User Message')) {
    return null;
  }

  let displayContent = match ? match[1] : message.content.replace(/^[\s\S]*?## User Message\n/, '');

  // Fallback cleanup if it didn't match the full block regex but has the header
  if (!match) {
    // Legacy: strip old ``` wrapper if present
    if (displayContent.startsWith('```') && displayContent.includes('```', 3)) {
      displayContent = displayContent.split('```')[1].trim();
    }
    // Strip new zen-user-content wrapper if partially matched
    displayContent = displayContent
      .replace(/^<zen-user-content>\n?/, '')
      .replace(/\n?<\/zen-user-content>[\s\S]*$/, '');
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1000);
  };

  const handleRegenerate = () => {
    // TODO: Implement regenerate logic - resend this message
  };

  return (
    <div
      className="user-message-container flex flex-col gap-0 mb-3 relative z-[1] transition-all duration-300"
      style={{
        opacity: message.isCancelled ? 0.4 : 1,
        filter: message.isCancelled ? 'grayscale(1) blur(0.5px)' : 'none',
        pointerEvents: message.isCancelled ? 'none' : 'auto',
      }}
    >
      <div className="flex flex-col gap-1 rounded-md bg-input-background border border-border p-3 relative">
        <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap break-words max-w-full max-h-[400px] overflow-auto">
          {displayContent}
        </div>
      </div>

      {/* Bottom toolbar - always visible, transparent background */}
      <div className="w-full flex justify-start items-center gap-2 bg-transparent px-2 py-1">
        {/* Copy button */}
        <button
          onClick={handleCopy}
          title="Copy content"
          className={`bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded transition-opacity ${
            isCopied ? 'text-success' : 'text-text-secondary'
          }`}
          style={{ opacity: 0.7 }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
        >
          {isCopied ? (
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
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
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
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          )}
        </button>

        {/* Regenerate button */}
        <button
          onClick={handleRegenerate}
          title="Regenerate response"
          className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded transition-opacity text-text-secondary"
          style={{ opacity: 0.7 }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
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
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>

        {/* Revert button - only if onRevertConversation is provided */}
        {onRevertConversation && (
          <button
            onClick={() => setShowRevertModal(true)}
            title="Revert conversation to this state"
            className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded transition-opacity text-text-secondary"
            style={{ opacity: 0.7 }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
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
              <path d="M9 14 4 9l5-5" />
              <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
            </svg>
          </button>
        )}
      </div>

      {showRevertModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center"
            onClick={() => setShowRevertModal(false)}
          >
            <div
              className="bg-card-background border border-border rounded-lg p-5 min-w-[300px] max-w-[400px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="font-semibold text-sm mb-2">Revert conversation?</div>
              <div className="text-xs text-text-secondary mb-4">
                This will restore all modified files to their state before this message. Messages
                after this point will be removed.
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowRevertModal(false)}
                  className="px-3.5 py-1.5 rounded text-xs cursor-pointer bg-transparent border border-border text-text-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowRevertModal(false);
                    onRevertConversation!(message.id, message.timestamp);
                  }}
                  className="px-3.5 py-1.5 rounded text-xs cursor-pointer bg-primary border-none text-white font-semibold"
                >
                  Revert
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default UserMessageBox;