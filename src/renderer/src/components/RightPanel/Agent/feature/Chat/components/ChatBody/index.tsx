import React, { useRef, useEffect, useMemo } from 'react';
import { cn } from '@renderer/shared/lib/utils';
import { parseAIResponse, ParsedResponse, ToolAction } from '../../services/ResponseParser';
import { Message } from '../../types/message';
import { EXECUTION_STATUS, TOOL_ACTION_TYPES, TERMINAL_STATUS } from '../../constants/constants';
import { useCollapseSections } from '../../hooks/ui/useCollapseSections';
import { useToolActions } from '../../hooks/tools/useToolActions';
import { useScrollBehavior } from '../../hooks/ui/useScrollBehavior';
import { useMessagePagination } from '../../hooks/ui/useMessagePagination';
import ChatBodySkeleton from './ChatBodySkeleton';
import { LoadMoreButton } from './LoadMoreButton';
import ModelInfoBar from './ModelInfoBar';
import SearchBar from './SearchBar';
import { ThinkingRenderer } from './AIMessageBox/renderers/ThinkingRenderer';
import ContinuingIndicator from './ContinuingIndicatorBox';
import ProcessingIndicator from './ProcessingIndicator';
import UserMessageBox from './UserMessageBox';
import AIMessageBox from './AIMessageBox';
import { useSettings } from '@renderer/components/RightPanel/Agent/context/SettingsContext';

interface ChatBodyProps {
  messages: Message[];
  isProcessing: boolean;
  onSendToolRequest?: (
    action: ToolAction | ToolAction[],
    message: Message,
    isAutoTrigger?: boolean,
    actionType?: (typeof TOOL_ACTION_TYPES)[keyof typeof TOOL_ACTION_TYPES],
  ) => void;
  onToolAction?: (
    actionId: string,
    actionType: (typeof TOOL_ACTION_TYPES)[keyof typeof TOOL_ACTION_TYPES],
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
    status: (typeof EXECUTION_STATUS)[keyof typeof EXECUTION_STATUS];
  };
  toolOutputs?: Record<string, { output: string; isError: boolean }>;
  terminalStatus?: Record<string, (typeof TERMINAL_STATUS)[keyof typeof TERMINAL_STATUS]>;
  onLoadConversation?: (conversationId: string, tabId: number, folderPath: string | null) => void;
  onRevertConversation?: (messageId: string, timestamp: number) => void;
  onAutoScrollPausedChange?: (paused: boolean) => void;
  scrollToBottomRef?: React.MutableRefObject<(() => void) | null>;
  isContinuing?: boolean;
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
    status: (typeof EXECUTION_STATUS)[keyof typeof EXECUTION_STATUS];
  };
  toolOutputs?: Record<string, { output: string; isError: boolean }>;
  terminalStatus?: Record<string, (typeof TERMINAL_STATUS)[keyof typeof TERMINAL_STATUS]>;
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

// ─────────────────────────────────────────────────────────────────────────────
// Error Boundary for Message Rendering
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class MessageBoxErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[MessageBox] Render error caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-3 px-4 flex flex-col gap-2">
          <div className="flex items-start justify-between w-full">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <div
                className="relative w-4 h-4 shrink-0 flex items-center justify-center mt-0.5"
                title="Error - Render failed"
              >
                <div className="w-2 h-2 rounded-full bg-error" />
              </div>
            </div>

            <div className="shrink-0 ml-2">
              <span className="text-[11px] font-semibold text-error uppercase tracking-[0.5px]">
                ERROR
              </span>
            </div>
          </div>

          {this.state.error && (
            <div className="py-3 px-4 rounded-md border border-error/30 bg-error/5">
              <pre className="text-[11px] text-text-secondary m-0 whitespace-pre-wrap break-words max-h-[120px] overflow-y-auto font-mono">
                {this.state.error.message}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return <>{this.props.children}</>;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MessageBox Props Interface
// ─────────────────────────────────────────────────────────────────────────────

interface MessageBoxProps {
  message: Message;
  parsedContent: ParsedResponse;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  clickedActions: Set<string>;
  failedActions?: Set<string>;
  rejectedActions?: Set<string>;
  onToolClick: (
    action: any,
    message: Message,
    index: number,
    type: (typeof TOOL_ACTION_TYPES)[keyof typeof TOOL_ACTION_TYPES],
  ) => void;
  requestNumber?: number | null;
  executionState?: {
    total: number;
    completed: number;
    status: (typeof EXECUTION_STATUS)[keyof typeof EXECUTION_STATUS];
  };
  isLastMessage?: boolean;
  hasNextAssistantMessage?: boolean;
  toolOutputs?: Record<string, { output: string; isError: boolean }>;
  terminalStatus?: Record<string, 'busy' | 'free'>;
  nextUserMessage?: Message;
  allMessages?: Message[];
  activeTerminalIds?: Set<string>;
  attachedTerminalIds?: Set<string>;
  conversationId?: string;
  previousAssistantMessage?: Message;
  isGenerating?: boolean;
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
  onRevertConversation?: (messageId: string, timestamp: number) => void;
  singleLineReviewActions?: Record<string, { action: any; actionId: string; messageId: string }>;
  onConfirmSingleLineAction?: (actionId: string) => void;
  onRejectSingleLineAction?: (actionId: string) => void;
  onGitConfirm?: (items: any[]) => void;
  onGitCancel?: () => void;
  gitStatusItems?: any[];
  gitStatusBranch?: string;
  isGitProcessing?: boolean;
  isGitStatusVisible?: boolean;
  onBackToHome?: (summary: string) => void;
  responseNumber?: number | null;
  onRetryRequest?: (messageId: string) => void;
  isRestored?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// MessageBox Component (Inline - previously in MessageBox.tsx)
// ─────────────────────────────────────────────────────────────────────────────

const MessageBoxComponent: React.FC<MessageBoxProps> = (props) => {
  const { message, onRevertConversation } = props;

  if (message.role === 'user') {
    return <UserMessageBox message={message} onRevertConversation={onRevertConversation} />;
  }

  return <AIMessageBox {...props} />;
};

// Memoize to prevent unnecessary re-renders
const MessageBox = React.memo(MessageBoxComponent, (prevProps, nextProps) => {
  const isStreaming = prevProps.isGenerating === true && nextProps.isGenerating === true;

  if (isStreaming) {
    const streamingPropsEqual =
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.thinking === nextProps.message.thinking &&
      prevProps.clickedActions === nextProps.clickedActions &&
      prevProps.failedActions === nextProps.failedActions &&
      prevProps.rejectedActions === nextProps.rejectedActions;
    return streamingPropsEqual;
  }

  const propsAreEqual =
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.thinking === nextProps.message.thinking &&
    prevProps.clickedActions === nextProps.clickedActions &&
    prevProps.failedActions === nextProps.failedActions &&
    prevProps.rejectedActions === nextProps.rejectedActions &&
    prevProps.isGenerating === nextProps.isGenerating &&
    prevProps.toolOutputs === nextProps.toolOutputs;
  return propsAreEqual;
});

// Wrap with error boundary
const MessageBoxWithErrorBoundary: React.FC<MessageBoxProps> = (props) => (
  <MessageBoxErrorBoundary>
    <MessageBox {...props} />
  </MessageBoxErrorBoundary>
);

// ─────────────────────────────────────────────────────────────────────────────
// ChatBody Component
// ─────────────────────────────────────────────────────────────────────────────

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
}: ExtendedChatBodyProps) => {
  const { permissionMode } = useSettings();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const {
    visibleMessages: paginatedMessages,
    hiddenCount,
    loadMore,
    loadAll,
    hasHiddenMessages,
  } = useMessagePagination({
    messages,
    messagesPerPage: 10,
  });

  const parseCacheRef = useRef<Map<string, ParsedResponse>>(new Map());
  const lastParsedMessagesRef = useRef<any[]>([]);

  const parsedMessages = useMemo(() => {
    const startTime = performance.now();

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

    const cache = parseCacheRef.current;

    const result = messages.map((msg) => {
      const cached = cache.get(msg.content);
      if (!cached || cached === undefined) {
        const parsed = parseAIResponse(msg.content);
        cache.set(msg.content, parsed);
      }
      return { ...msg, parsed: cache.get(msg.content)! };
    });

    const elapsed = performance.now() - startTime;
    if (elapsed > 10 || messages.length > 10) {
      console.warn(
        `[ChatBody] parsedMessages recalculated - messages: ${messages.length}, cacheSize: ${cache.size}, time: ${elapsed.toFixed(1)}ms`,
      );
    }
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
  const { autoScrollPaused, scrollToBottom } = useScrollBehavior(
    messagesEndRef as any,
    bodyRef as any,
    messages,
    isProcessing,
  );

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
    const firstPendingAction = parsed.actions.find((_action: any, idx: number) => {
      const actionId = `${lastMessage.id}-action-${idx}`;
      const hasOutput = toolOutputs && toolOutputs[actionId];
      const isClicked = clickedActions.has(actionId);
      return !hasOutput && !isClicked;
    });
    if (!firstPendingAction) return false;
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

    if (lastMessage.thinking && lastMessage.thinking.trim().length > 0) {
      return false;
    }

    const hasThinkingBlock =
      parsed.contentBlocks && parsed.contentBlocks.some((b: any) => b.type === 'thinking');
    if (hasThinkingBlock) {
      return false;
    }

    const hasText = parsed.displayText && parsed.displayText.trim().length > 0;
    if (hasText) {
      return false;
    }

    const hasActions = parsed.actions && parsed.actions.length > 0;
    if (hasActions) {
      return false;
    }

    const hasOtherBlocks =
      parsed.contentBlocks &&
      parsed.contentBlocks.some((b: any) => {
        if (b.type === 'thinking') {
          return false;
        }
        switch (b.type) {
          case 'tool':
            return true;
          case 'code':
          case 'file':
          case 'markdown':
            return (b as any).content?.trim().length > 0;
          default:
            return false;
        }
      });

    if (hasOtherBlocks) {
      return false;
    }

    return true;
  }, [isProcessing, visibleMessages, parsedMessages]);

  return (
    <div
      ref={bodyRef}
      className={cn(
        'chat-body-scroll bg-background flex-1 overflow-y-auto overflow-x-hidden p-4 pl-6 flex flex-col gap-2 text-sm relative',
        visibleMessages.length > 0 ? 'pb-[200px]' : 'pb-4'
      )}
    >
      {isLoadingConversation ? (
        <ChatBodySkeleton />
      ) : (
        <>
          {isSearchOpen && (
            <SearchBar
              searchQuery={searchQuery}
              onSearchQueryChange={onSearchQueryChange}
              onCloseSearch={onCloseSearch}
              bodyRef={bodyRef as any}
            />
          )}

          {hasHiddenMessages && (
            <LoadMoreButton
              hiddenCount={hiddenCount}
              onLoadMore={loadMore}
              onLoadAll={loadAll}
            />
          )}

          {(() => {
            let assistantResponseCount = 0;
            return visibleMessages.map((message, index) => {
              if (message.content?.startsWith('__MODEL_SWITCH__::')) {
                return <ModelInfoBar key={message.id} message={message} />;
              }

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
                <MessageBoxWithErrorBoundary
                  key={message.id}
                  message={message}
                  parsedContent={parsedContent}
                  nextUserMessage={nextUserMessage}
                  responseNumber={currentResponseNumber}
                  isGenerating={isProcessing && index === visibleMessages.length - 1}
                  isCollapsed={
                    message.role === 'user' ? collapsedSections.has(`prompt-${message.id}`) : false
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
                  isRestored={isRestored}
                  onRetryRequest={(messageId: string) => {
                    const msgIndex = messages.findIndex((m) => m.id === messageId);
                    if (msgIndex <= 0) return;

                    let prevUserMsg: Message | null = null;
                    for (let i = msgIndex - 1; i >= 0; i--) {
                      if (messages[i].role === 'user') {
                        prevUserMsg = messages[i];
                        break;
                      }
                    }

                    if (!prevUserMsg) return;

                    if (onRevertConversation) {
                      onRevertConversation(messageId, message.timestamp);
                    }

                    if (onSendMessage && prevUserMsg.rawRequest) {
                      setTimeout(() => {
                        const rawReq = prevUserMsg!.rawRequest || '';
                        const userContentMatch = rawReq.match(/<zen-user-content>\n?([\s\S]*?)\n?<\/zen-user-content>/);

                        let contentToSend: string;
                        let shouldSkipLogic: boolean;

                        if (userContentMatch) {
                          contentToSend = userContentMatch[1];
                          shouldSkipLogic = false;
                        } else {
                          contentToSend = rawReq;
                          shouldSkipLogic = true;
                        }

                        onSendMessage(
                          contentToSend,
                          prevUserMsg!.uploadedFiles,
                          undefined,
                          undefined,
                          shouldSkipLogic,
                        );
                      }, 100);
                    }
                  }}
                />
              );
            });
          })()}

          {(() => {
            const lastMessage = visibleMessages[visibleMessages.length - 1];
            const isRenderingThinking =
              lastMessage && lastMessage.role === 'assistant' && isProcessing;

            if (!isRenderingThinking) {
              return null;
            }

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
            if (!parsedMessage || !parsedMessage.parsed) {
              return null;
            }

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

          {hasUnexecutedAutoActions && onContinue && (
            <div className="my-3 flex">
              <button
                onClick={onContinue}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md cursor-pointer text-[11px] font-semibold uppercase tracking-[0.5px] h-7 box-border transition-all duration-200',
                  'bg-primary/15 text-primary border border-primary/30'
                )}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, rgb(10, 132, 255) 25%, transparent)';
                  e.currentTarget.style.borderColor = 'color-mix(in srgb, rgb(10, 132, 255) 50%, transparent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, rgb(10, 132, 255) 15%, transparent)';
                  e.currentTarget.style.borderColor = 'color-mix(in srgb, rgb(10, 132, 255) 30%, transparent)';
                }}
              >
                <span className="codicon codicon-play text-xs inline-flex items-center justify-center" />
                <span>Continue Task</span>
              </button>
            </div>
          )}

          {isContinuing && <ContinuingIndicator />}

          {(isProcessing || hasInitialMessage) && (
            <ProcessingIndicator isResponding={isResponding} />
          )}

          <div ref={messagesEndRef} />
          <style>{`
        .chat-body-scroll::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .chat-body-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-body-scroll::-webkit-scrollbar-thumb {
          background: rgb(106, 122, 154, 0.4);
          border-radius: 4px;
        }
        .chat-body-scroll::-webkit-scrollbar-thumb:hover {
          background: rgb(106, 122, 154, 0.6);
        }
        .chat-body-scroll {
          scrollbar-width: thin;
        }
      `}</style>
        </>
      )}
    </div>
  );
};

// PERF: React.memo with custom comparator
const ChatBody = React.memo(ChatBodyInternal, (prevProps, nextProps) => {
  return (
    prevProps.messages === nextProps.messages &&
    prevProps.isProcessing === nextProps.isProcessing &&
    prevProps.isContinuing === nextProps.isContinuing &&
    prevProps.executionState === nextProps.executionState &&
    prevProps.toolOutputs === nextProps.toolOutputs &&
    prevProps.terminalStatus === nextProps.terminalStatus &&
    prevProps.conversationId === nextProps.conversationId &&
    prevProps.isRestored === nextProps.isRestored &&
    prevProps.isSearchOpen === nextProps.isSearchOpen &&
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.isLoadingConversation === nextProps.isLoadingConversation &&
    prevProps.isGitProcessing === nextProps.isGitProcessing &&
    prevProps.isGitStatusVisible === nextProps.isGitStatusVisible &&
    prevProps.singleLineReviewActions === nextProps.singleLineReviewActions
  );
});
export default ChatBody;