import React, { useRef, useEffect, useMemo } from 'react';
import { cn } from '@renderer/shared/lib/utils';
import { useSettings } from '../../../context/SettingsContext';
import { Message } from '../types/message';
import ProcessingIndicator from './messages/ProcessingIndicator';
import { ThinkingRenderer } from './blocks/thinking/ThinkingBlock';
import MessageBox from './messages/MessageBox';
import SearchBar from './SearchBar';
import { ChatErrorBoundary } from './ChatErrorBoundary';
import { getPermissionDecision } from '../utils/permissionUtils';
import ChatBodySkeleton from './ChatBodySkeleton';
import { WarningBlock } from './blocks/warning/WarningBlock';
import { parseAIResponse, ParsedResponse, ToolAction } from '../services/ResponseParser';
import { useCollapseSections } from '../hooks/ui/useCollapseSections';
import { useToolActions } from '../hooks/tools/useToolActions';
import { useScrollBehavior } from '../hooks/ui/useScrollBehavior';
import { $ } from '@renderer/utils/color';

interface ChatBodyProps {
  messages: Message[];
  isProcessing: boolean;
  onSendToolRequest?: (
    action: ToolAction | ToolAction[],
    message: Message,
    isAutoTrigger?: boolean,
    actionType?: 'accept_all' | 'accept_once' | 'reject',
  ) => void;
  onToolAction?: (
    actionId: string,
    actionType: 'accept_all' | 'accept_once' | 'reject',
    toolName?: string,
  ) => void;
  onSendMessage?: (
    content: string,
    files?: any[],
    model?: any,
    account?: any,
    skipFirstRequestLogic?: boolean,
    actionIds?: string[],
    uiHidden?: boolean,
  ) => void | Promise<void>;
  onSelectOption?: (messageId: string, option: string) => void;
  firstRequestMessageId?: string;
  executionState?: {
    total: number;
    completed: number;
    status: 'idle' | 'running' | 'error' | 'done';
  };
  toolOutputs?: Record<string, { output: string; isError: boolean }>;
  terminalStatus?: Record<string, 'busy' | 'free'>;
  onLoadConversation?: (conversationId: string, tabId: number, folderPath: string | null) => void;
  onRevertConversation?: (messageId: string, timestamp: number) => void;
  onAutoScrollPausedChange?: (paused: boolean) => void;
  scrollToBottomRef?: React.MutableRefObject<(() => void) | null>;
  isContinuing?: boolean;
  incompleteHasPartialTool?: boolean;
  incompletePartialToolType?: string | null;
  onGitConfirm?: (items: any[]) => void;
  onGitCancel?: () => void;
  gitStatusItems?: any[];
  gitStatusBranch?: string;
  isGitProcessing?: boolean;
  isGitStatusVisible?: boolean;
  onBackToHome?: (summary: string) => void;
  isLoadingConversation?: boolean;
}

export interface ExtendedChatBodyProps extends ChatBodyProps {
  executionState?: {
    total: number;
    completed: number;
    status: 'idle' | 'running' | 'error' | 'done';
  };
  toolOutputs?: Record<string, { output: string; isError: boolean }>;
  terminalStatus?: Record<string, 'busy' | 'free'>;
  activeTerminalIds?: Set<string>;
  attachedTerminalIds?: Set<string>;
  conversationId?: string;
  previousAssistantMessage?: Message;
  isRestored?: boolean;
  onContinue?: () => void;
  hasInitialMessage?: boolean;
  singleLineReviewActions?: Record<string, { action: any; actionId: string; messageId: string }>;
  onConfirmSingleLineAction?: (actionId: string) => void;
  onRejectSingleLineAction?: (actionId: string) => void;
  isSearchOpen?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  onCloseSearch?: () => void;
}

const ChatBodyInternal: React.FC<ExtendedChatBodyProps> = ({
  messages,
  isProcessing,
  onSendToolRequest,
  onSendMessage,
  executionState,
  toolOutputs,
  terminalStatus,
  firstRequestMessageId,
  onLoadConversation,
  activeTerminalIds,
  attachedTerminalIds,
  conversationId,
  onToolAction,
  onSelectOption,
  isRestored = false,
  isContinuing = false,
  incompleteHasPartialTool = false,
  incompletePartialToolType = null,
  onContinue,
  hasInitialMessage = false,
  onRevertConversation,
  onAutoScrollPausedChange,
  scrollToBottomRef,
  singleLineReviewActions,
  onConfirmSingleLineAction,
  onRejectSingleLineAction,
  isSearchOpen = false,
  searchQuery = '',
  onSearchQueryChange,
  onCloseSearch,
  onGitConfirm,
  onGitCancel,
  gitStatusItems,
  gitStatusBranch,
  isGitProcessing,
  isGitStatusVisible = true,
  onBackToHome,
  isLoadingConversation = false,
}) => {
  const { permissionMode } = useSettings();
  const messagesEndRef = useRef<HTMLDivElement>(null!);
  const bodyRef = useRef<HTMLDivElement>(null!);

  const parseCacheRef = useRef<Map<string, ParsedResponse>>(new Map());
  const lastParsedMessagesRef = useRef<any[]>([]);

  const parsedMessages = useMemo(() => {
    const startTime = performance.now();
    // Check if messages are already parsed (from ChatPanel)
    if (messages.length > 0 && messages[0].parsed !== undefined) {
      const messagesUnchanged =
        lastParsedMessagesRef.current.length === messages.length &&
        messages.every(
          (msg, i) =>
            msg.id === lastParsedMessagesRef.current[i]?.id &&
            msg.content === lastParsedMessagesRef.current[i]?.content,
        );

      if (messagesUnchanged) {
        return lastParsedMessagesRef.current;
      }

      lastParsedMessagesRef.current = messages;
      return messages;
    }

    // Fallback: parse messages if not already parsed
    const cache = parseCacheRef.current;

    const result = messages.map((msg) => {
      const cached = cache.get(msg.content);
      if (!cached || cached === undefined) {
        const parsed = parseAIResponse(msg.content);
        cache.set(msg.content, parsed);
      }
      return { ...msg, parsed: cache.get(msg.content)! };
    });

    lastParsedMessagesRef.current = result;
    return result;
  }, [messages]);

  const { collapsedSections, toggleCollapse } = useCollapseSections();
  const { clickedActions, handleToolClick, failedActions, rejectedActions } = useToolActions({
    onSendToolRequest,
    onToolAction,
    parsedMessages,
    isProcessing,
    isRestored,
  });
  const { autoScrollPaused, scrollToBottom } = useScrollBehavior(messagesEndRef, [
    messages,
    isProcessing,
  ]);

  const prevPausedRef = useRef(false);
  useEffect(() => {
    if (autoScrollPaused !== prevPausedRef.current) {
      prevPausedRef.current = autoScrollPaused;
      onAutoScrollPausedChange?.(autoScrollPaused);
    }
  }, [autoScrollPaused, onAutoScrollPausedChange]);

  useEffect(() => {
    if (scrollToBottomRef) scrollToBottomRef.current = scrollToBottom;
  }, [scrollToBottom, scrollToBottomRef]);

  const hasUnexecutedAutoActions = useMemo(() => {
    if (!isRestored || messages.length === 0) return false;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant') return false;
    const parsed = parseAIResponse(lastMessage.content);
    if (!parsed.actions || parsed.actions.length === 0) return false;
    const firstPendingAction = parsed.actions.find((action: any, idx: number) => {
      if (action.isPartial) return false;
      const actionId = `${lastMessage.id}-action-${idx}`;
      const hasOutput = toolOutputs && toolOutputs[actionId];
      const isClicked = clickedActions.has(actionId);
      return !hasOutput && !isClicked;
    });
    if (!firstPendingAction) return false;
    // Complex mode: always show all tools, never auto-approve
    return false;
  }, [messages, isRestored, toolOutputs, permissionMode, clickedActions]);

  const visibleMessages = useMemo(() => {
    const filtered = messages.filter((msg) => !msg.uiHidden && !msg.isCancelled);
    return filtered;
  }, [messages, firstRequestMessageId]);

  const lastAssistantIndex = useMemo(() => {
    for (let i = visibleMessages.length - 1; i >= 0; i--) {
      if (visibleMessages[i].role === 'assistant') return i;
    }
    return -1;
  }, [visibleMessages]);

  const isResponding = useMemo(() => {
    if (!isProcessing || visibleMessages.length === 0) return false;
    const lastMessage = visibleMessages[visibleMessages.length - 1];
    if (lastMessage.role !== 'assistant') return false;
    const parsedMessage = parsedMessages.find((pm) => pm.id === lastMessage.id);
    if (!parsedMessage || !parsedMessage.parsed) return false;
    const parsed = parsedMessage.parsed;

    // Hide ProcessingIndicator if there's any content (including thinking blocks)
    if (lastMessage.thinking && lastMessage.thinking.trim().length > 0) {
      return false;
    }

    const hasThinkingBlock =
      parsed.contentBlocks && parsed.contentBlocks.some((b: any) => b.type === 'thinking');
    if (hasThinkingBlock) {
      return false;
    }

    const hasText = parsed.displayText && parsed.displayText.trim().length > 0;
    if (hasText) return false;

    const hasActions = parsed.actions && parsed.actions.length > 0;
    if (hasActions) return false;

    const hasOtherBlocks =
      parsed.contentBlocks &&
      parsed.contentBlocks.some((b: any) => {
        if (b.type === 'thinking') return false;
        switch (b.type) {
          case 'tool':
            return true;
          case 'code':
          case 'file':
          case 'markdown':
            return (b as any).content?.trim().length > 0;
          case 'mixed_content':
            return (b as any).segments?.length > 0;
          default:
            return false;
        }
      });

    if (hasOtherBlocks) return false;

    return true;
  }, [isProcessing, visibleMessages, parsedMessages]);

  return (
    <div
      ref={bodyRef}
      className={cn(
        'chat-body-scroll flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col p-4 pl-4 text-sm',
        visibleMessages.length > 0 ? 'pb-[200px]' : 'pb-6',
        'gap-4',
      )}
    >
      {/* Show skeleton when loading conversation */}
      {isLoadingConversation ? (
        <ChatBodySkeleton />
      ) : (
        <>
          {isSearchOpen && (
            <SearchBar
              searchQuery={searchQuery}
              onSearchQueryChange={onSearchQueryChange}
              onCloseSearch={onCloseSearch}
              bodyRef={bodyRef}
            />
          )}

          {/* New messages indicator */}
          {autoScrollPaused && isProcessing && (
            <div className="sticky bottom-3 z-20 flex justify-center pointer-events-none">
              <button
                onClick={scrollToBottom}
                className="pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full cursor-pointer"
                style={{
                  border:
                    '1px solid color-mix(in srgb, ' +
                    $('--vscode-button-background') +
                    ' 40%, transparent)',
                  background:
                    'color-mix(in srgb, ' +
                    $('--vscode-editor-background') +
                    ' 85%, ' +
                    $('--vscode-button-background') +
                    ')',
                  color: $('--vscode-button-background'),
                  fontSize: '11px',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  transition: 'opacity 0.2s',
                }}
              >
                <span className="codicon codicon-arrow-down text-[11px]" />
                New messages
              </button>
            </div>
          )}

          {(() => {
            let assistantResponseCount = 0;
            return visibleMessages.map((message, index) => {
              const parsedMessage = parsedMessages.find((pm) => pm.id === message.id);
              if (!parsedMessage || !parsedMessage.parsed) return null;
              const parsedContent = parsedMessage.parsed;

              if (message.role === 'assistant') {
                assistantResponseCount++;
              }
              const currentResponseNumber =
                message.role === 'assistant' ? assistantResponseCount : null;

              const nextUserMessage = messages
                .slice(messages.findIndex((m) => m.id === message.id) + 1)
                .find((m) => m.role === 'user');
              const previousAssistantMessage = messages
                .slice(
                  0,
                  messages.findIndex((m) => m.id === message.id),
                )
                .reverse()
                .find((m) => m.role === 'assistant');

              const nextVisibleMessage = visibleMessages[index + 1];
              const hasNextAssistantMessage = nextVisibleMessage?.role === 'assistant';

              return (
                <ChatErrorBoundary key={message.id}>
                  <MessageBox
                    key={message.id}
                    message={message}
                    parsedContent={parsedContent}
                    nextUserMessage={nextUserMessage}
                    responseNumber={currentResponseNumber}
                    isGenerating={isProcessing && index === visibleMessages.length - 1}
                    isCollapsed={
                      message.role === 'user'
                        ? collapsedSections.has(`prompt-${message.id}`)
                        : false
                    }
                    onToggleCollapse={() => toggleCollapse(`prompt-${message.id}`)}
                    clickedActions={clickedActions}
                    failedActions={failedActions}
                    rejectedActions={rejectedActions}
                    onToolClick={handleToolClick}
                    executionState={executionState}
                    isLastMessage={
                      message.role === 'assistant' &&
                      (index === visibleMessages.length - 1 || index === lastAssistantIndex) &&
                      hasNextAssistantMessage === false
                    }
                    hasNextAssistantMessage={hasNextAssistantMessage}
                    toolOutputs={toolOutputs}
                    terminalStatus={terminalStatus}
                    allMessages={messages}
                    activeTerminalIds={activeTerminalIds}
                    attachedTerminalIds={attachedTerminalIds}
                    conversationId={conversationId}
                    previousAssistantMessage={previousAssistantMessage}
                    onSendMessage={onSendMessage}
                    onSelectOption={onSelectOption}
                    onRevertConversation={onRevertConversation}
                    singleLineReviewActions={singleLineReviewActions}
                    onConfirmSingleLineAction={onConfirmSingleLineAction}
                    onRejectSingleLineAction={onRejectSingleLineAction}
                    onGitConfirm={onGitConfirm}
                    onGitCancel={onGitCancel}
                    gitStatusItems={gitStatusItems}
                    gitStatusBranch={gitStatusBranch}
                    isGitProcessing={isGitProcessing}
                    isGitStatusVisible={isGitStatusVisible}
                    onBackToHome={onBackToHome}
                  />
                </ChatErrorBoundary>
              );
            });
          })()}

          {/* Thinking Block - render before ProcessingIndicator */}
          {(() => {
            const lastMessage = visibleMessages[visibleMessages.length - 1];
            const isRenderingThinking =
              lastMessage && lastMessage.role === 'assistant' && isProcessing;

            if (!isRenderingThinking) return null;

            const hasSSEThinking = lastMessage.thinking && lastMessage.thinking.trim();

            if (hasSSEThinking) {
              return (
                <ThinkingRenderer
                  content={lastMessage.thinking!}
                  maxHeight={240}
                  isStreaming={true}
                />
              );
            }

            const parsedMessage = parsedMessages.find((pm) => pm.id === lastMessage.id);
            if (!parsedMessage || !parsedMessage.parsed) return null;

            const contentBlocks = parsedMessage.parsed.contentBlocks || [];
            const lastBlock = contentBlocks[contentBlocks.length - 1];
            const isLastBlockUnclosedThinking =
              lastBlock && lastBlock.type === 'thinking' && lastBlock.content?.trim();

            if (isLastBlockUnclosedThinking) {
              return (
                <ThinkingRenderer content={lastBlock.content!} maxHeight={240} isStreaming={true} />
              );
            }

            return null;
          })()}

          {/* Unexecuted auto actions */}
          {hasUnexecutedAutoActions && onContinue && (
            <div className="mt-3 mb-3 flex">
              <button
                onClick={onContinue}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md cursor-pointer uppercase tracking-wide"
                style={{
                  backgroundColor:
                    'color-mix(in srgb, ' + $('--vscode-button-background') + ' 15%, transparent)',
                  color: $('--vscode-button-background'),
                  border:
                    '1px solid color-mix(in srgb, ' +
                    $('--vscode-button-background') +
                    ' 30%, transparent)',
                  fontSize: '11px',
                  fontWeight: 600,
                  height: '28px',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'color-mix(in srgb, ' + $('--vscode-button-background') + ' 25%, transparent)';
                  e.currentTarget.style.borderColor =
                    'color-mix(in srgb, ' + $('--vscode-button-background') + ' 50%, transparent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'color-mix(in srgb, ' + $('--vscode-button-background') + ' 15%, transparent)';
                  e.currentTarget.style.borderColor =
                    'color-mix(in srgb, ' + $('--vscode-button-background') + ' 30%, transparent)';
                }}
              >
                <span className="codicon codicon-play text-xs inline-flex items-center justify-center" />
                <span>Continue Task</span>
              </button>
            </div>
          )}

          {/* Continuing / Partial tool warning */}
          {isContinuing && (
            <WarningBlock
              label="CONTINUING RESPONSE"
              message={
                incompleteHasPartialTool
                  ? `AI response was interrupted. Assembling remaining parts of \`${incompletePartialToolType ?? 'tool'}\` before execution.`
                  : 'AI response was interrupted. Fetching the remaining content…'
              }
              isPulsing={true}
            />
          )}

          {/* Processing Indicator */}
          {(isProcessing || hasInitialMessage) && (
            <ProcessingIndicator isResponding={isResponding} />
          )}

          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
};

// Memoize ChatBody to prevent unnecessary re-renders
const ChatBody = React.memo(ChatBodyInternal, (prevProps, nextProps) => {
  // Quick reference comparison for arrays/objects
  const sameMessages = prevProps.messages === nextProps.messages;
  const sameProcessing = prevProps.isProcessing === nextProps.isProcessing;
  const sameExecutionState = prevProps.executionState === nextProps.executionState;
  const sameToolOutputs = prevProps.toolOutputs === nextProps.toolOutputs;
  const sameTerminalStatus = prevProps.terminalStatus === nextProps.terminalStatus;
  const sameSearchOpen = prevProps.isSearchOpen === nextProps.isSearchOpen;
  const sameSearchQuery = prevProps.searchQuery === nextProps.searchQuery;
  const sameLoadingConversation =
    prevProps.isLoadingConversation === nextProps.isLoadingConversation;

  // Skip re-render if nothing changed
  return (
    sameMessages &&
    sameProcessing &&
    sameExecutionState &&
    sameToolOutputs &&
    sameTerminalStatus &&
    sameSearchOpen &&
    sameSearchQuery &&
    sameLoadingConversation
  );
});

export default ChatBody;
