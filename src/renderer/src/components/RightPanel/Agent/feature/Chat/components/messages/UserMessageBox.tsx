import React from 'react';
import { createPortal } from 'react-dom';
import { Message } from '../../types/message';
import { $ } from '@renderer/utils/color';

interface UserMessageBoxProps {
  message: Message;
  onRevertConversation?: (messageId: string, timestamp: number) => void;
}

const UserMessageBox: React.FC<UserMessageBoxProps> = ({ message, onRevertConversation }) => {
  const [isMessageCollapsed, setIsMessageCollapsed] = React.useState(false);
  const [showRevertModal, setShowRevertModal] = React.useState(false);

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

  // 🆕 Collapsible long messages
  const lineCount = displayContent.split('\n').length;
  const charCount = displayContent.length;
  const isLongMessage = lineCount > 10 || charCount > 500;

  // Auto-collapse on mount if message is long
  React.useEffect(() => {
    if (isLongMessage && !isMessageCollapsed) {
      setIsMessageCollapsed(true);
    }
  }, [isLongMessage]);

  const truncatedContent =
    isLongMessage && isMessageCollapsed
      ? '...' + displayContent.split('\n').slice(-5).join('\n')
      : displayContent;

  return (
    <div
      className="group flex flex-col gap-4 mb-4 transition-all duration-300 ease relative z-[1]"
      style={{
        opacity: message.isCancelled ? 0.4 : 1,
        filter: message.isCancelled ? 'grayscale(1) blur(0.5px)' : 'none',
        pointerEvents: message.isCancelled ? 'none' : 'auto',
      }}
    >
      <div className="flex flex-col gap-1 rounded-lg bg-card-background border border-border py-2 px-3 m-1 relative">
        <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
          {truncatedContent}
        </div>
        {isLongMessage && (
          <div
            onClick={() => setIsMessageCollapsed(!isMessageCollapsed)}
            className="text-xs text-blue cursor-pointer mt-1 font-semibold select-none underline"
          >
            {isMessageCollapsed ? 'Show more' : 'Show less'}
          </div>
        )}
      </div>
      {onRevertConversation && (
        <button
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded cursor-pointer z-10 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-[0.15s]"
          style={{
            background: `color-mix(in srgb, ${$('--input-bg') || 'transparent'} 60%, ${$('--background') || 'transparent'})`,
            border: `1px solid color-mix(in srgb, ${$('--input-bg') || 'transparent'} 40%, ${$('--background') || 'transparent'})`,
            color: `color-mix(in srgb, ${$('--primary-text') || 'currentColor'} 90%, ${$('--primary-text') || 'currentColor'})`,
          }}
          onClick={() => setShowRevertModal(true)}
          title="Revert conversation to this state"
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              `color-mix(in srgb, ${$('--input-bg') || 'transparent'} 40%, ${$('--background') || 'transparent'})`;
            e.currentTarget.style.color = $('--text-primary') || 'currentColor';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              `color-mix(in srgb, ${$('--input-bg') || 'transparent'} 60%, ${$('--background') || 'transparent'})`;
            e.currentTarget.style.color =
              `color-mix(in srgb, ${$('--primary-text') || 'currentColor'} 90%, ${$('--primary-text') || 'currentColor'})`;
          }}
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
      {showRevertModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center"
            onClick={() => setShowRevertModal(false)}
          >
            <div
              className="bg-background border border-border rounded-lg py-5 px-6 min-w-80 max-w-96"
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
                  className="py-1.5 px-3.5 rounded text-xs cursor-pointer bg-transparent border border-border text-text-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowRevertModal(false);
                    onRevertConversation!(message.id, message.timestamp);
                  }}
                  className="py-1.5 px-3.5 rounded text-xs cursor-pointer bg-button-solid-background border-none text-button-solid-text font-semibold"
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
