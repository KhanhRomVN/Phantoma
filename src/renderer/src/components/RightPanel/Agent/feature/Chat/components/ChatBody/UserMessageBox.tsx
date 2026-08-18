import React from 'react';
import { cn } from '@renderer/shared/utils/cn';
import FilesPreviews from '../../../../components/common/MessageInput/FilesPreviews';
import { Message } from '../../types/message';
import RevertConfirmModal from './RevertConfirmModal';

/**
 * Parse <question-answer> tag from user message content
 * Returns: { answers: Record<string, string>, cleanedContent: string }
 */
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

  // Parse each line: "N. answer"
  const lines = innerContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const lineMatch = /^(\d+)\.\s*(.*)$/i.exec(trimmed);
    if (!lineMatch) continue;

    const questionNumber = lineMatch[1];
    const answerText = lineMatch[2].trim();

    // Store answer (even if empty)
    answers[`q${questionNumber}`] = answerText || '(no answer)';
  }

  // Remove <question-answer> block from content
  const cleanedContent = content.replace(regex, '').trim();

  return { answers, cleanedContent };
};

interface UserMessageBoxProps {
  message: Message;
  onRevertConversation?: (messageId: string, timestamp: number) => void;
}

const UserMessageBox: React.FC<UserMessageBoxProps> = ({ message, onRevertConversation }) => {
  const [showRevertModal, setShowRevertModal] = React.useState(false);
  const [isCopied, setIsCopied] = React.useState(false);

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

  // Parse <question-answer> tag from content
  const { answers: questionAnswers, cleanedContent } =
    parseQuestionAnswerFromContent(displayContent);
  const hasQuestionAnswers = Object.keys(questionAnswers).length > 0;

  // Use cleaned content (without <question-answer> tag) for display
  if (hasQuestionAnswers) {
    displayContent = cleanedContent;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1000);
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

      <div className="flex flex-col gap-1 rounded-md p-3 ml-0 relative bg-input-background border border-border">
        {/* Question Answers Summary - Show if parsed from content */}
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

      {/* Bottom toolbar - always visible, transparent background */}
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

        {/* Revert button */}
        {onRevertConversation && (
          <button
            onClick={() => {
              setShowRevertModal(true);
            }}
            title="Revert conversation to this point"
            className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded opacity-70 hover:opacity-100 transition-opacity duration-200 text-text-secondary"
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

        {/* Regenerate button */}
        <button
          onClick={() => {}}
          title="Regenerate response"
          className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded opacity-70 hover:opacity-100 transition-opacity duration-200 text-text-secondary"
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
      </div>

      <RevertConfirmModal
        isOpen={showRevertModal}
        onClose={() => {
          setShowRevertModal(false);
        }}
        onConfirm={() => {
          onRevertConversation!(message.id, message.timestamp);
        }}
      />
    </div>
  );
};

export default UserMessageBox;
