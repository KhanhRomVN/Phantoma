import React from 'react';
import { Message } from '../../types/message';
import FileIcon from '@renderer/components/common/FileIcon';
import { isDiff, parseDiff } from '@renderer/components/RightPanel/Agent/utils/diffUtils';
import { $ } from '@renderer/utils/color';
// timeline.css removed - using simpler UI pattern
import { ParsedResponse } from '../../services/ResponseParser';
import { ToolHeader } from '../tools/ToolHeader';
import HtmlBlock from '../blocks/HtmlBlock';
import MarkdownBlock from '../blocks/MarkdownBlock';
import QuestionAnswerBlock from '../blocks/QuestionAnswerBlock';
import ErrorBlock from '../blocks/ErrorBlock';
import ToolRouter from '../tools/ToolRouter';

interface AIMessageBoxProps {
  message: Message;
  parsedContent: ParsedResponse;
  clickedActions: Set<string>;
  failedActions?: Set<string>;
  rejectedActions?: Set<string>;
  onToolClick: (
    action: any,
    message: Message,
    index: number,
    type: 'accept_all' | 'accept_once' | 'reject',
  ) => void;
  executionState?: {
    total: number;
    completed: number;
    status: 'idle' | 'running' | 'error' | 'done';
  };
  isLastMessage?: boolean;
  toolOutputs?: Record<string, { output: string; isError: boolean }>;
  terminalStatus?: Record<string, 'busy' | 'free'>;
  nextUserMessage?: Message;
  allMessages?: Message[];
  activeTerminalIds?: Set<string>;
  attachedTerminalIds?: Set<string>;
  conversationId?: string;
  previousAssistantMessage?: Message;
  /** Số thứ tự của response này */
  responseNumber?: number | null;
  isGenerating?: boolean;
  isSimpleMode?: boolean;
  onSendMessage?: (
    content: string,
    files?: any[],
    model?: any,
    account?: any,
    skipLogic?: boolean,
    actionIds?: string[],
    uiHidden?: boolean,
  ) => void;
  onSelectOption?: (messageId: string, option: string) => void;
  singleLineReviewActions?: Record<string, { action: any; actionId: string; messageId: string }>;
  onConfirmSingleLineAction?: (actionId: string) => void;
  onRejectSingleLineAction?: (actionId: string) => void;
  onGitConfirm?: (items: any[]) => void;
  onGitCancel?: () => void;
  gitStatusItems?: any[];
  gitStatusBranch?: string;
  isGitProcessing?: boolean;
  isGitStatusVisible?: boolean;
}

const MessageBoxCodeBlock: React.FC<{
  code: string;
  language?: string;
  diffStats?: { added: number; removed: number };
  isDiffBlock: boolean;
  prefix?: string;
  statusColor?: string;
}> = ({ code, language, diffStats, isDiffBlock, prefix, statusColor }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(isDiffBlock);

  return (
    <div className="flex flex-col gap-1 mb-2">
      <ToolHeader
        title={prefix || language || 'code'}
        statusColor={statusColor}
        diffStats={diffStats}
        isCollapsed={isCollapsed}
        onToggleCollapse={isDiffBlock ? () => setIsCollapsed(!isCollapsed) : undefined}
        headerActions={
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(code);
            }}
            className="bg-transparent border-none text-primary cursor-pointer opacity-70 flex items-center p-0.5"
            title="Copy Code"
          >
            <div className="codicon codicon-copy text-sm" />
          </button>
        }
      />
      {!isCollapsed && (
        <div>
          <pre className="m-0 p-2 overflow-auto font-mono text-xs bg-background rounded">
            <code className="!bg-transparent p-0">{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

const AIMessageBox: React.FC<AIMessageBoxProps> = ({
  message,
  parsedContent,
  clickedActions,
  failedActions,
  rejectedActions,
  onToolClick,
  executionState,
  isLastMessage,
  toolOutputs,
  terminalStatus,
  nextUserMessage,
  allMessages,
  activeTerminalIds,
  attachedTerminalIds,
  conversationId,
  previousAssistantMessage,
  responseNumber,
  isGenerating,
  onSendMessage,
  onSelectOption,
  isSimpleMode = true,
  singleLineReviewActions,
  onConfirmSingleLineAction,
  onRejectSingleLineAction,
  onGitConfirm,
  onGitCancel,
  gitStatusItems,
  gitStatusBranch,
  isGitProcessing,
  isGitStatusVisible = true,
}) => {
  /**
   * Map known hardcoded error strings to i18n keys.
   * Falls back to the original message if no mapping found.
   */
  const translateError = (raw: string): string => {
    const errorMap: Array<[RegExp, string]> = [
      [/provider returned empty response/i, 'Provider returned empty response'],
      [/no response body/i, 'No response body'],
      [/no workspace/i, 'No workspace'],
      [/path.*argument.*string|path.*required/i, 'Path argument required'],
      [/file.*path.*required|missing file path/i, 'File path required'],
      [/folder.*path.*required/i, 'Folder path required'],
      [/security validation failed/i, 'Security validation failed'],
      [/out of scope.*ignored/i, 'Path out of scope — ignored'],
      [/invalid diff format/i, 'Invalid diff format'],
      [/search text not found/i, 'Search text not found'],
      [/no change made/i, 'No changes made'],
      [/command validation failed/i, 'Command validation failed'],
      [/unknown upload error|upload.*failed|upload api returned/i, 'Upload failed'],
      [/no active account|no.*account.*selected/i, 'No account selected'],
      [/file not found/i, 'File not found'],
      [/invalid conversation log format/i, 'Invalid conversation format'],
    ];
    for (const [pattern, key] of errorMap) {
      if (pattern.test(raw)) return key;
    }
    return raw;
  };

  // State for toggling raw request/response display
  const [requestChecked, setRequestChecked] = React.useState(false);
  const [responseChecked, setResponseChecked] = React.useState(false);

  // Find previous user message for token usage and raw request
  const previousUserMessage = React.useMemo((): Message | null => {
    if (!allMessages || !message) return null;
    const msgIndex = allMessages.findIndex((m) => m.id === message.id);
    if (msgIndex > 0) {
      for (let i = msgIndex - 1; i >= 0; i--) {
        if (allMessages[i].role === 'user') {
          return allMessages[i];
        }
      }
    }
    return null;
  }, [allMessages, message]);

  const knownFilePaths = React.useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    if (!allMessages) return map;

    const filePathRegex = /<path>([^<]+)<\/file_path>/gi;
    const pathRegex = /<path>([^<]+)<\/path>/gi;

    for (const msg of allMessages) {
      if (!msg.content) continue;

      // Extract all <path> occurrences
      let m: RegExpExecArray | null;
      filePathRegex.lastIndex = 0;
      while ((m = filePathRegex.exec(msg.content)) !== null) {
        const fullPath = m[1].trim();
        if (!fullPath) continue;
        const basename = fullPath.split(/[/\\]/).pop() || '';
        if (basename && !map.has(basename)) {
          map.set(basename, fullPath);
        }
      }

      // Also try <path> tags (used by some search/list calls)
      pathRegex.lastIndex = 0;
      while ((m = pathRegex.exec(msg.content)) !== null) {
        const fullPath = m[1].trim();
        if (!fullPath) continue;
        const basename = fullPath.split(/[/\\]/).pop() || '';
        if (basename && !map.has(basename)) {
          map.set(basename, fullPath);
        }
      }
    }

    return map;
  }, [allMessages]);
  return (
    <div
      className="assistant-message-container flex flex-col gap-0 relative transition-all duration-300 ease mb-3 bg-transparent rounded-md border-none p-0"
      style={{
        opacity: message.isCancelled ? 0.4 : 1,
        filter: message.isCancelled ? 'grayscale(1) blur(0.5px)' : 'none',
        pointerEvents: message.isCancelled ? 'none' : 'auto',
      }}
    >
      {/* 3. Interleaved Content (Text + Tools) */}
      {(() => {
        // Prepare render groups
        const groups: Array<
          | {
              type: 'metadata';
              content: string;
              faviconUrl?: string;
              key: string;
            }
          | { type: 'code'; content: string; language: string; key: string }
          | { type: 'html'; content: string; key: string }
          | { type: 'file'; content: string; key: string }
          | { type: 'markdown'; content: string; key: string }
          | {
              type: 'mixed_content';
              segments: any[];
              key: string;
            }
          | {
              type: 'tools';
              items: { action: any; index: number }[];
              key: string;
            }
          | {
              type: 'question';
              options: string[];
              title?: string;
              optional?: boolean;
              questions?: import('../../types/message').Question[];
              key: string;
            }
          | {
              type: 'error';
              content: string;
              key: string;
            }
          | {
              type: 'thinking';
              content: string;
              key: string;
            }
          | {
              type: 'response_number';
              content: string;
              key: string;
            }
        > = [];

        // --- 🆕 METADATA DOT CHECK ---
        // Skip metadata dot for commit messages (they should continue the timeline without a new dot)
        const isCommitMessage =
          message.content?.includes('[COMMIT_MESSAGE_REQUEST]') ||
          message.content?.includes('<commit_message>');

        const metaChanged =
          !previousAssistantMessage ||
          message.conversationId !== previousAssistantMessage.conversationId ||
          message.providerId !== previousAssistantMessage.providerId ||
          message.modelId !== previousAssistantMessage.modelId ||
          message.accountId !== previousAssistantMessage.accountId ||
          message.email !== previousAssistantMessage.email;

        // If metadata changed, inject the Metadata group (skip for commit messages)
        if (
          !isCommitMessage &&
          metaChanged &&
          (message.providerId || message.modelId || message.email)
        ) {
          const providerStr = message.providerId ? `${message.providerId}/` : '';
          const modelStr = message.modelId || 'unknown-model';
          const emailStr = message.email ? ` by ${message.email}` : '';

          let faviconUrl: string | undefined = undefined;
          if (message.websiteUrl) {
            try {
              const url = new URL(message.websiteUrl);
              faviconUrl = `${url.origin}/favicon.ico`;
            } catch (e) {
              // Ignore invalid url
            }
          }

          groups.push({
            type: 'metadata',
            content: `Used ${providerStr}${modelStr}${emailStr}`,
            faviconUrl,
            key: 'metadata-info',
          });
        }

        // ------------------------------
        // Response number with token badges
        if (responseNumber !== null && responseNumber !== undefined && !message.isError) {
          groups.push({
            type: 'response_number',
            content: String(responseNumber),
            key: 'response-number',
          });
        }

        if (message.thinking && message.thinking.trim()) {
          groups.push({
            type: 'thinking',
            content: message.thinking,
            key: 'thinking-block',
          });
        }

        let currentToolGroup: { action: any; index: number }[] = [];

        // Use contentBlocks from parser
        const blocks = parsedContent.contentBlocks || [];

        // Helper to flush tool group
        const flushTools = () => {
          if (currentToolGroup.length > 0) {
            const firstIndex = currentToolGroup[0].index;
            groups.push({
              type: 'tools',
              items: [...currentToolGroup],
              key: `tools-${firstIndex}`,
            });
            currentToolGroup = [];
          }
        };

        if (message.isError) {
          groups.push({
            type: 'error',
            content: message.content,
            key: 'error-block',
          });
        } else if (blocks.length > 0) {
          blocks.forEach((block, idx) => {
            if (block.type === 'tool') {
              const actionIndex = parsedContent.actions.indexOf(block.action);
              currentToolGroup.push({
                action: block.action,
                index: actionIndex !== -1 ? actionIndex : idx,
              });
            } else if (block.type === 'file') {
              flushTools();
              groups.push({
                type: 'file',
                content: block.content,
                key: `file-${idx}`,
              });
            } else if (block.type === 'markdown') {
              flushTools();
              groups.push({
                type: 'markdown',
                content: block.content,
                key: `markdown-${idx}`,
              });
            } else if (block.type === 'question') {
              flushTools();
              groups.push({
                type: 'question',
                options: block.options,
                title: block.title,
                optional: block.optional,
                questions: block.questions,
                key: `question-${idx}`,
              });
            } else if (block.type === 'mixed_content') {
              flushTools();
              groups.push({
                type: 'mixed_content',
                segments: block.segments,
                key: `mixed_content-${idx}`,
              });
            } else {
              // Flush tools before adding non-tool block
              flushTools();

              if (block.type === 'code') {
                groups.push({
                  type: 'code',
                  content: block.content,
                  language: block.language || 'text',
                  key: `code-${groups.length}`,
                });
              }
            }
          });
          // Flush any remaining tools
          flushTools();
        } else {
          // Legacy Fallback
          // 1. Text (Legacy Fallback)
          if (parsedContent.displayText) {
            groups.push({
              type: 'markdown',
              content: parsedContent.displayText,
              key: 'markdown-legacy',
            });
          }
          // 2. Tools
          if (parsedContent.actions && parsedContent.actions.length > 0) {
            currentToolGroup = parsedContent.actions.map((action, index) => ({
              action,
              index,
            }));
            flushTools();
          }
        }

        // let isInteractionBlocked = false; // Removed - unused variable

        // In simple mode, filter out tool groups where all items are invisible
        const SIMPLE_MODE_VISIBLE = new Set([
          'write_to_file',
          'replace_in_file',
          'run_command',
          'execute_agent_action',
          'git_status',
        ]);
        const renderGroups = isSimpleMode
          ? groups.filter(
              (g) =>
                g.type !== 'tools' ||
                (g as any).items.some((item: any) => SIMPLE_MODE_VISIBLE.has(item.action.type)),
            )
          : groups;

        return renderGroups.map((group, index) => {
          const isLast = index === renderGroups.length - 1 && isLastMessage;

          let content = null;

          if (group.type === 'metadata') {
            content = (
              <div className="pb-2">
                <div className="flex items-center justify-center w-5 h-5">
                  {group.faviconUrl ? (
                    <img
                      src={group.faviconUrl}
                      alt="favicon"
                      className="w-4 h-4 rounded-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          const icon = document.createElement('span');
                          icon.className = 'codicon codicon-server-process';
                          icon.style.color = $('--secondary-text');
                          icon.style.fontSize = '14px';
                          parent.appendChild(icon);
                        }
                      }}
                    />
                  ) : (
                    <span
                      className="codicon codicon-server-process text-text-secondary"
                      style={{ fontSize: '14px' }}
                    />
                  )}
                </div>
                <div className="pt-1 text-sm text-text-secondary leading-relaxed italic flex items-center gap-1.5">
                  {group.content}
                </div>
              </div>
            );
          } else if (group.type === 'thinking') {
            // Thinking is hidden — do not render anything
            content = null;
          } else if (group.type === 'code') {
            const isDiffBlock = isDiff(group.content, group.language);
            let displayCode = group.content;
            let diffStats: { added: number; removed: number } | undefined = undefined;
            let prefix: string | undefined = undefined;
            let statusColor: string | undefined = $('--secondary-text, #6a737d');

            if (isDiffBlock) {
              const diffResult = parseDiff(group.content);
              displayCode = diffResult.code;
              diffStats = diffResult.stats;
              prefix = 'Edit';
              statusColor = $('--success, #3fb950');
            }

            content = (
              <MessageBoxCodeBlock
                code={displayCode}
                language={isDiffBlock ? 'python' : group.language}
                diffStats={diffStats}
                isDiffBlock={isDiffBlock}
                prefix={prefix}
                statusColor={statusColor}
              />
            );
          } else if (group.type === 'html') {
            content = <HtmlBlock content={group.content} />;
          } else if (group.type === 'file') {
            content = (
              <div
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer text-xs"
                style={{
                  backgroundColor: $('--primary, #4d4d4d'),
                  color: $('--text-foreground, #ffffff'),
                }}
                onClick={() => {
                  const vscodeApi = (window as any).vscodeApi;
                  if (vscodeApi) {
                    vscodeApi.postMessage({
                      command: 'openFile',
                      path: group.content,
                    });
                  }
                }}
              >
                <FileIcon path={group.content} className="w-[14px] h-[14px]" />
                <span>{group.content}</span>
              </div>
            );
          } else if (group.type === 'markdown') {
            const dotColor = message.isError ? $('--error, #ff4d4f') : $('--success, #3fb950');
            content = (
              <div>
                <div className="flex items-center justify-center w-5 h-5">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: dotColor }}
                  />
                </div>
                <div className="pt-1 text-sm text-text-primary">
                  <MarkdownBlock content={group.content} knownFilePaths={knownFilePaths} />
                </div>
              </div>
            );
          } else if (group.type === 'mixed_content') {
            const dotColor = message.isError ? $('--error, #ff4d4f') : $('--success, #3fb950');
            content = (
              <div>
                <div className="flex items-center justify-center w-5 h-5">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: dotColor }}
                  />
                </div>
                <div className="pt-1">
                  {group.segments.map((seg: any, i: number) => {
                    if (seg.type === 'code') {
                      return (
                        <div key={i} className="mb-2 mt-1">
                          <pre className="m-0 p-2 overflow-auto font-mono text-xs bg-background rounded">
                            <code className="!bg-transparent p-0">{seg.content}</code>
                          </pre>
                        </div>
                      );
                    } else if (seg.type === 'markdown') {
                      return (
                        <MarkdownBlock
                          key={i}
                          content={seg.content}
                          className="markdown-content-inline"
                          knownFilePaths={knownFilePaths}
                        />
                      );
                    } else {
                      return (
                        <MarkdownBlock
                          key={i}
                          content={seg.content}
                          className="markdown-content-inline"
                          knownFilePaths={knownFilePaths}
                        />
                      );
                    }
                  })}
                </div>
              </div>
            );
          } else if (group.type === 'question') {
            const hasQuestions = group.questions && group.questions.length > 0;

            // Render QuestionAnswerBlock - it now manages its own summary mode internally
            content = (
              <QuestionAnswerBlock
                questions={hasQuestions ? group.questions : undefined}
                options={!hasQuestions ? group.options : undefined}
                title={group.title}
                optional={group.optional}
                selectedOption={!hasQuestions ? message.selectedOption : undefined}
                initialAnswers={hasQuestions ? message.questionAnswers || {} : undefined}
                disabled={!!nextUserMessage || isGenerating}
                onAnswer={(questionId, value) => {
                  if (!hasQuestions) return;
                  if (onSelectOption) {
                    const answerStr = JSON.stringify({ questionId, value });
                    onSelectOption(message.id, answerStr);
                  }
                }}
                onAllAnswered={(answers) => {
                  if (!hasQuestions) return;
                  if (onSelectOption) {
                    // Include questions in payload so handleSelectOption can format and auto-submit
                    const allAnsweredStr = JSON.stringify({
                      allAnswered: true,
                      answers,
                      questions: group.questions || [],
                    });
                    onSelectOption(message.id, allAnsweredStr);
                  }
                  // Auto-submit is now handled inside useChatLLM.handleSelectOption
                }}
                onOptionSelect={(option: string) => {
                  if (hasQuestions) return;
                  if (onSelectOption) {
                    onSelectOption(message.id, option);
                  }
                  const hasTools = (parsedContent.actions?.length || 0) > 0;
                  if (onSendMessage && !hasTools) {
                    const questionTitle = group.title || 'Question';
                    onSendMessage(
                      `[question: "${questionTitle}"] Answer: ${option}`,
                      undefined,
                      undefined,
                      undefined,
                      true,
                    );
                  }
                }}
              />
            );

            // Update blocking state (removed - variable was unused)
          } else if (group.type === 'error') {
            const errorText = group.content.replace(/^Error:\s*/i, '');
            // Parse error code from "[CODE] message" format
            const codeMatch = errorText.match(/^\[([^\]]+)\]\s*(.*)/s);
            const errorCode = codeMatch ? codeMatch[1] : null;
            const rawMessage = codeMatch ? codeMatch[2] : errorText;
            const translatedMessage = translateError(rawMessage);
            content = (
              <ErrorBlock
                content={translatedMessage}
                errorCode={errorCode || undefined}
                isLast={isLast}
                isLastMessage={isLastMessage}
              />
            );
            // Error renders its own timeline-item wrapper like tool groups
            return <React.Fragment key={group.key}>{content}</React.Fragment>;
          } else if (group.type === 'response_number') {
            content = (
              <div className="pb-2 text-sm text-text-secondary">
                <span className="codicon codicon-number" style={{ marginRight: 8 }} />
                {group.content}
              </div>
            );
          } else {
            content = (
              <ToolRouter
                group={group.items}
                messageId={message.id}
                clickedActions={clickedActions}
                failedActions={failedActions}
                rejectedActions={rejectedActions}
                onToolClick={(action, _msgId, idx, type) => onToolClick(action, message, idx, type)}
                executionState={executionState}
                isLastMessage={isLastMessage}
                toolOutputs={toolOutputs}
                terminalStatus={terminalStatus}
                nextUserMessage={nextUserMessage}
                allMessages={allMessages}
                activeTerminalIds={activeTerminalIds}
                attachedTerminalIds={attachedTerminalIds}
                conversationId={conversationId}
                allActions={parsedContent.actions}
                singleLineReviewActions={singleLineReviewActions}
                onConfirmSingleLineAction={onConfirmSingleLineAction}
                onRejectSingleLineAction={onRejectSingleLineAction}
                onGitConfirm={onGitConfirm}
                onGitCancel={onGitCancel}
                gitStatusItems={gitStatusItems}
                gitStatusBranch={gitStatusBranch}
                isGitProcessing={isGitProcessing}
                isGitStatusVisible={isGitStatusVisible}
              />
            );
          }

          if (group.type === 'tools') {
            return <React.Fragment key={group.key}>{content}</React.Fragment>;
          }

          return (
            <div key={group.key} className="relative ml-0 pb-2">
              {content}
            </div>
          );
        });
      })()}
      <style>{`
        @keyframes timeline-dot-fade-in {
          from {
            opacity: 0;
            transform: translateX(-50%) scale(0.5);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default AIMessageBox;
