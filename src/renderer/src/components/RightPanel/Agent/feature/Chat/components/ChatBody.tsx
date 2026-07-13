import React, { useRef, useEffect, useMemo } from 'react';
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
  isLoadingConversation,
}) => {
  const { permissionMode } = useSettings();
  const bodyRef = useRef<HTMLDivElement>(null);

  const parseCacheRef = useRef<Map<string, ParsedResponse>>(new Map());

  const parsedMessages = useMemo(() => {
    const cache = parseCacheRef.current;
    return messages.map((msg) => {
      if (!cache.has(msg.content)) {
        cache.set(msg.content, parseAIResponse(msg.content));
      }
      return { ...msg, parsed: cache.get(msg.content)! };
    });
  }, [messages]);

  const { collapsedSections, toggleCollapse } = useCollapseSections();
  const { clickedActions, handleToolClick, failedActions, rejectedActions } = useToolActions({
    onSendToolRequest,
    onToolAction,
    parsedMessages,
    isProcessing,
    isRestored,
  });
  const { autoScrollPaused, scrollToBottom } = useScrollBehavior(bodyRef as React.RefObject<HTMLDivElement>, [
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
    const decision = getPermissionDecision(permissionMode, firstPendingAction.type);
    return decision === 'allow';
  }, [messages, isRestored, toolOutputs, permissionMode, clickedActions]);

  const visibleMessages = useMemo(() => {
    return messages.filter((msg) => !msg.uiHidden && !msg.isCancelled);
  }, [messages]);

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
      parsed.contentBlocks &&
      parsed.contentBlocks.some((b: any) => b.type === 'thinking');
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
      ref={bodyRef as React.RefObject<HTMLDivElement>}
      className="chat-body-scroll"
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: 'var(--spacing-lg)',
        paddingLeft: '24px',
        backgroundColor: 'var(--secondary-bg)',
        paddingBottom: visibleMessages.length > 0 ? '200px' : 'var(--spacing-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-md)',
        fontSize: '14px',
        position: 'relative',
      }}
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
              bodyRef={bodyRef as React.RefObject<HTMLDivElement>}
            />
          )}

          {/* New messages indicator */}
          {autoScrollPaused && isProcessing && (
            <div
              style={{
                position: 'sticky',
                bottom: '12px',
                zIndex: 20,
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <button
                onClick={scrollToBottom}
                style={{
                  pointerEvents: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 14px',
                  borderRadius: '20px',
                  border: '1px solid color-mix(in srgb, var(--vscode-button-background, #007acc) 40%, transparent)',
                  background: 'color-mix(in srgb, var(--vscode-editor-background) 85%, var(--vscode-button-background, #007acc))',
                  color: 'var(--vscode-button-background, #007acc)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  transition: 'opacity 0.2s',
                }}
              >
                <span className="codicon codicon-arrow-down" style={{ fontSize: '11px' }} />
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
                .slice(0, messages.findIndex((m) => m.id === message.id))
                .reverse()
                .find((m) => m.role === 'assistant');

              const nextVisibleMessage = visibleMessages[index + 1];
              const hasNextAssistantMessage =
                nextVisibleMessage?.role === 'assistant';

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
                      (index === visibleMessages.length - 1 ||
                        index === lastAssistantIndex) &&
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

            const hasSSEThinking =
              lastMessage.thinking && lastMessage.thinking.trim();

            if (hasSSEThinking) {
              return (
                <ThinkingRenderer
                  content={lastMessage.thinking!}
                  maxHeight={240}
                  isStreaming={true}
                />
              );
            }

            const parsedMessage = parsedMessages.find(
              (pm) => pm.id === lastMessage.id,
            );
            if (!parsedMessage || !parsedMessage.parsed) return null;

            const contentBlocks = parsedMessage.parsed.contentBlocks || [];
            const lastBlock = contentBlocks[contentBlocks.length - 1];
            const isLastBlockUnclosedThinking =
              lastBlock &&
              lastBlock.type === 'thinking' &&
              lastBlock.content?.trim();

            if (isLastBlockUnclosedThinking) {
              return (
                <ThinkingRenderer
                  content={lastBlock.content!}
                  maxHeight={240}
                  isStreaming={true}
                />
              );
            }

            return null;
          })()}

          {/* Processing Indicator */}
          <ProcessingIndicator isResponding={isResponding && isProcessing} />

          {/* Continuing / Partial tool warning */}
          {isContinuing && incompleteHasPartialTool && incompletePartialToolType && (
            <WarningBlock
              label="CONTINUING RESPONSE"
              message={`Assembling partial ${incompletePartialToolType} output from previous response...`}
            />
          )}

          {/* Unexecuted auto actions */}
          {hasUnexecutedAutoActions && onContinue && (
            <div
              style={{
                marginTop: '12px',
                marginBottom: '12px',
                display: 'flex',
              }}
            >
              <button
                onClick={onContinue}
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--vscode-button-background, #007acc) 15%, transparent)',
                  color: 'var(--vscode-button-background, #007acc)',
                  border: '1px solid color-mix(in srgb, var(--vscode-button-background, #007acc) 30%, transparent)',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                Continue auto-executing actions
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Wrap with React.memo to prevent unnecessary re-renders
const ChatBody = React.memo(ChatBodyInternal);

export default ChatBody;