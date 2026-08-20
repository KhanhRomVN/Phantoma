import React from 'react';
/**
 * ------------------------------------------------------------------
 * ResponseMetadataBar
 * ------------------------------------------------------------------
 * Hiển thị thống kê sử dụng token và số phản hồi.
 * Hỗ trợ xem nội dung thô (request/response) và parse debug info.
 *
 * Main features:
 * - Hiển thị token usage thống kê
 * - Xem raw request/response content
 * - Retry và revert conversation
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ── Types ──
import { Message } from '../../../types/message';

// ── Components ──
import CodeBlock from '@renderer/components/common/CodeBlock';
import RevertConfirmModal from '../RevertConfirmModal';

// ─── Types ──────────────────────────────────────────────────────────────
interface ResponseMetadataBarProps {
  responseNumber: number;
  message: Message;
  previousUserMessage: Message | null;
  onRetryRequest?: () => void;
  onRevertConversation?: (messageId: string, timestamp: number) => void;
}

/**
 * ResponseMetadataBar hiển thị thống kê sử dụng token và số phản hồi.
 * Hiển thị số lượng token request/response với chế độ xem nội dung thô có thể mở rộng.
 */
export const ResponseMetadataBar: React.FC<ResponseMetadataBarProps> = ({
  responseNumber,
  message,
  previousUserMessage,
  onRetryRequest,
  onRevertConversation,
}) => {
  const [requestChecked, setRequestChecked] = React.useState(false);
  const [responseChecked, setResponseChecked] = React.useState(false);
  const [parseDebugChecked, setParseDebugChecked] = React.useState(false);
  const [showRetryModal, setShowRetryModal] = React.useState(false);
  const [showRevertModal, setShowRevertModal] = React.useState(false);
  const [isRetryHovered, setIsRetryHovered] = React.useState(false);
  const [isRevertHovered, setIsRevertHovered] = React.useState(false);

  const showRaw = requestChecked || responseChecked || parseDebugChecked;
  const reqTokens =
    previousUserMessage?.token_usage ?? previousUserMessage?.usage?.prompt_tokens ?? 0;
  const resTokens = message.usage?.completion_tokens ?? message.token_usage ?? 0;

  // Request/Response icons
  const RequestIcon = (
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
      className="shrink-0"
    >
      <path d="M12 3v12" />
      <path d="m17 8-5-5-5 5" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    </svg>
  );

  const ResponseIcon = (
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
      className="shrink-0"
    >
      <path d="M12 15V3" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
    </svg>
  );

  const RetryIcon = (
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
      className="shrink-0"
    >
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );

  const RevertIcon = (
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
      className="shrink-0"
    >
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
    </svg>
  );

  const DebugIcon = (
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
      className="shrink-0"
    >
      <path d="m8 2 1.88 1.88" />
      <path d="M14.12 3.88 16 2" />
      <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
      <path d="M12 20v-9" />
      <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
      <path d="M6 13H2" />
      <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
      <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
      <path d="M22 13h-4" />
      <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
    </svg>
  );

  const handleRetryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRetryModal(true);
  };

  const handleRevertClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRevertModal(true);
  };

  const handleConfirmRetry = () => {
    if (onRetryRequest) {
      onRetryRequest();
    }
  };

  const handleConfirmRevert = () => {
    if (onRevertConversation) {
      onRevertConversation(message.id, message.timestamp);
    }
  };

  return (
    <div>
      <div className="relative py-1.5 text-[11px] font-mono leading-[1.6] flex justify-end items-center gap-3 select-none flex-wrap">
        {/* Request Badge */}
        <div className="inline-flex items-center gap-1.5">
          <div
            onClick={() => setRequestChecked(!requestChecked)}
            className={cn(
              'inline-flex items-center gap-1.5 cursor-pointer transition-opacity duration-200',
              requestChecked
                ? 'underline underline-offset-[3px] opacity-100'
                : 'no-underline opacity-80',
            )}
          >
            <span className="text-success inline-flex items-center">{RequestIcon}</span>
            <span className="text-text-primary font-semibold">{reqTokens.toLocaleString()}</span>
          </div>

          {/* Retry Icon */}
          {onRetryRequest && previousUserMessage && requestChecked && (
            <div
              onClick={handleRetryClick}
              onMouseEnter={() => setIsRetryHovered(true)}
              onMouseLeave={() => setIsRetryHovered(false)}
              className={cn(
                'inline-flex items-center cursor-pointer text-warn transition-opacity duration-200',
                isRetryHovered
                  ? 'underline underline-offset-[3px] opacity-100'
                  : 'no-underline opacity-70',
              )}
              title="Retry this request"
            >
              {RetryIcon}
            </div>
          )}

          {/* Revert Icon */}
          {onRevertConversation && requestChecked && (
            <div
              onClick={handleRevertClick}
              onMouseEnter={() => setIsRevertHovered(true)}
              onMouseLeave={() => setIsRevertHovered(false)}
              className={cn(
                'inline-flex items-center cursor-pointer text-warn transition-opacity duration-200',
                isRevertHovered
                  ? 'underline underline-offset-[3px] opacity-100'
                  : 'no-underline opacity-70',
              )}
              title="Revert conversation to this point"
            >
              {RevertIcon}
            </div>
          )}
        </div>

        {/* Response Badge */}
        <div className="inline-flex items-center gap-1.5">
          <div
            onClick={() => setResponseChecked(!responseChecked)}
            className={cn(
              'inline-flex items-center gap-1.5 cursor-pointer transition-opacity duration-200',
              responseChecked
                ? 'underline underline-offset-[3px] opacity-100'
                : 'no-underline opacity-80',
            )}
          >
            <span className="text-error inline-flex items-center">{ResponseIcon}</span>
            <span className="text-text-primary font-semibold">{resTokens.toLocaleString()}</span>
          </div>
        </div>

        {/* Parse Debug Badge */}
        {message.parseDebugInfo && (
          <div className="inline-flex items-center gap-1.5">
            <div
              onClick={() => setParseDebugChecked(!parseDebugChecked)}
              className={cn(
                'inline-flex items-center gap-1.5 cursor-pointer transition-opacity duration-200 py-0.5 px-1.5 rounded-[3px]',
                parseDebugChecked
                  ? 'underline underline-offset-[3px] opacity-100'
                  : 'no-underline opacity-80',
                message.parseDebugInfo.failedActions > 0
                  ? 'bg-error/20'
                  : message.parseDebugInfo.parseError
                    ? 'bg-warn/20'
                    : 'bg-transparent',
              )}
              title={
                message.parseDebugInfo.parseError
                  ? `Parse Error: ${message.parseDebugInfo.parseError.message}`
                  : `Parse Debug Info: ${message.parseDebugInfo.successfulActions}/${message.parseDebugInfo.totalActions} successful`
              }
            >
              <span
                className={cn(
                  'inline-flex items-center',
                  message.parseDebugInfo.failedActions > 0
                    ? 'text-error'
                    : message.parseDebugInfo.parseError
                      ? 'text-warn'
                      : 'text-info',
                )}
              >
                {DebugIcon}
              </span>
              <span className="text-text-primary font-semibold text-[11px]">
                {message.parseDebugInfo.parseError
                  ? 'Parse Error'
                  : `${message.parseDebugInfo.successfulActions}/${message.parseDebugInfo.totalActions}`}
              </span>
            </div>
          </div>
        )}

        {/* Response Number */}
        <span className="text-text-secondary text-[11px] font-semibold">[{responseNumber}]</span>
      </div>

      {showRaw && (
        <div className="mt-1 mb-2 flex flex-col gap-2">
          {requestChecked && previousUserMessage?.rawRequest && (
            <div>
              <div className="text-[11px] font-semibold text-text-secondary mb-1 uppercase tracking-[0.5px]">
                Request (User Content)
              </div>
              <div className="max-h-[400px] overflow-auto">
                <CodeBlock code={previousUserMessage.rawRequest} language="text" />
              </div>
            </div>
          )}
          {responseChecked && message.rawResponse && (
            <div>
              <div className="text-[11px] font-semibold text-text-secondary mb-1 uppercase tracking-[0.5px]">
                Response (Assistant Content)
              </div>
              <div className="max-h-[400px] overflow-auto">
                <CodeBlock code={message.rawResponse} language="text" />
              </div>
            </div>
          )}
          {parseDebugChecked && message.parseDebugInfo && (
            <div>
              <div className="text-[11px] font-semibold text-text-secondary mb-1 uppercase tracking-[0.5px]">
                Parse Debug Log
              </div>
              <div className="max-h-[400px] overflow-auto">
                <CodeBlock
                  code={(() => {
                    const info = message.parseDebugInfo!;
                    const lines: string[] = [];

                    lines.push('='.repeat(60));
                    lines.push('RESPONSE PARSE DEBUG LOG');
                    lines.push('='.repeat(60));
                    lines.push('');

                    lines.push('📊 SUMMARY');
                    lines.push('-'.repeat(60));
                    lines.push(`Total Tool Actions: ${info.totalActions}`);
                    lines.push(`Successful: ${info.successfulActions}`);
                    lines.push(`Failed: ${info.failedActions}`);

                    if (info.contentBlocks && info.contentBlocks.length > 0) {
                      lines.push('');
                      lines.push(`Total Content Blocks: ${info.contentBlocks.length}`);
                      if (info.contentBlockStats) {
                        lines.push('Block Types:');
                        Object.entries(info.contentBlockStats).forEach(([type, count]) => {
                          lines.push(`  - ${type}: ${count}`);
                        });
                      }
                    }
                    lines.push('');

                    if (info.parseError) {
                      lines.push('❌ PARSE ERROR');
                      lines.push('-'.repeat(60));
                      lines.push(`Message: ${info.parseError.message}`);
                      lines.push('');
                      lines.push('Raw Content (first 500 chars):');
                      lines.push(info.parseError.rawContent);
                      lines.push('');
                    }

                    if (info.contentBlocks && info.contentBlocks.length > 0) {
                      lines.push('📄 CONTENT BLOCKS');
                      lines.push('-'.repeat(60));

                      info.contentBlocks.forEach((block) => {
                        const typeIcon =
                          block.type === 'thinking'
                            ? '💭'
                            : block.type === 'markdown'
                              ? '📝'
                              : block.type === 'code'
                                ? '💻'
                                : block.type === 'tool'
                                  ? '🔧'
                                  : block.type === 'question'
                                    ? '❓'
                                    : '📦';

                        lines.push('');
                        lines.push(`[${block.index + 1}] ${typeIcon} ${block.type.toUpperCase()}`);
                        lines.push(`    Content Length: ${block.contentLength} chars`);

                        if (block.language) {
                          lines.push(`    Language: ${block.language}`);
                        }

                        if (block.actionIndex !== undefined) {
                          lines.push(`    Linked to Action: #${block.actionIndex + 1}`);
                        }
                      });

                      lines.push('');
                    }

                    if (info.actions.length > 0) {
                      lines.push('🔧 TOOL ACTION DETAILS');
                      lines.push('-'.repeat(60));

                      info.actions.forEach((action, idx) => {
                        const statusIcon = action.status === 'success' ? '✅' : '❌';
                        lines.push('');
                        lines.push(`[${idx + 1}] ${statusIcon} ${action.type.toUpperCase()}`);
                        lines.push(`    Status: ${action.status}`);

                        if (action.errorMessage) {
                          lines.push(`    Error: ${action.errorMessage}`);
                        }

                        if (action.errorCode) {
                          lines.push(`    Error Code: ${action.errorCode}`);
                        }

                        if (action.extractedParams && action.extractedParams.length > 0) {
                          lines.push('    Parameters:');
                          action.extractedParams.forEach((param) => {
                            const paramIcon = param.found ? '✓' : '✗';
                            const lengthInfo =
                              param.length !== undefined ? ` (${param.length} chars)` : '';
                            lines.push(`      ${paramIcon} ${param.name}${lengthInfo}`);
                          });
                        }

                        const paramEntries = Object.entries(action.params);
                        if (paramEntries.length > 0) {
                          lines.push('    Values:');
                          paramEntries.forEach(([key, value]) => {
                            if (value === null || value === undefined || value === '') {
                              lines.push(`      ${key}: <empty>`);
                            } else if (typeof value === 'string') {
                              const preview =
                                value.length > 100
                                  ? `${value.substring(0, 100)}... (${value.length} chars total)`
                                  : value;
                              lines.push(`      ${key}: ${preview}`);
                            } else {
                              lines.push(`      ${key}: ${JSON.stringify(value)}`);
                            }
                          });
                        }
                      });
                    }

                    lines.push('');
                    lines.push('='.repeat(60));
                    lines.push(`Generated at: ${new Date().toISOString()}`);
                    lines.push('='.repeat(60));

                    return lines.join('\n');
                  })()}
                  language="log"
                />
              </div>
            </div>
          )}
          {showRaw && !previousUserMessage?.rawRequest && !message.rawResponse && (
            <div className="text-[11px] text-text-secondary italic p-2">
              Raw data not available for this response (may have been loaded from history before
              this feature was added).
            </div>
          )}
        </div>
      )}

      {/* Retry Confirmation Modal */}
      <RevertConfirmModal
        isOpen={showRetryModal}
        onClose={() => setShowRetryModal(false)}
        onConfirm={handleConfirmRetry}
        title="Retry this request?"
        description="This will resend the request from this point. If there are messages after this one, they will be removed and any file changes from those messages will be reverted."
      />

      {/* Revert Confirmation Modal */}
      <RevertConfirmModal
        isOpen={showRevertModal}
        onClose={() => setShowRevertModal(false)}
        onConfirm={handleConfirmRevert}
        title="Revert conversation to this point?"
        description="This will remove all messages after this response and revert any file changes from those messages."
      />
    </div>
  );
};

export default ResponseMetadataBar;
