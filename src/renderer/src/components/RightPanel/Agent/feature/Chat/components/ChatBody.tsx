import React, { useRef, useEffect, useMemo } from 'react';
import { parseAIResponse, ParsedResponse, ToolAction } from '../blocks';
import { useSettings } from '../../../context/SettingsContext';
import { useCollapseSections } from '../hooks/useCollapseSections';
import { useToolActions } from '../hooks/useToolActions';
import { useScrollBehavior } from '../hooks/useScrollBehavior';
import { getPermissionDecision } from '../blocks';
import { Message } from '../types/message';
import ProcessingIndicator from './messages/ProcessingIndicator';
import MessageBox from './messages/MessageBox';
import SearchBar from './SearchBar';
import { ChatErrorBoundary } from './ChatErrorBoundary';

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
  isSimpleMode?: boolean;
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

const ChatBody: React.FC<ExtendedChatBodyProps> = ({
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
  isSimpleMode = true,
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
}: ExtendedChatBodyProps) => {
  const { permissionMode } = useSettings();
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
    const isVisible =
      !isSimpleMode ||
      ['write_to_file', 'replace_in_file', 'run_command', 'execute_agent_action'].includes(
        firstPendingAction.type,
      );
    if (isVisible) return false;
    const decision = getPermissionDecision(permissionMode, firstPendingAction.type);
    return decision === 'allow';
  }, [messages, isRestored, toolOutputs, permissionMode, clickedActions, isSimpleMode]);

  const visibleMessages = useMemo(() => {
    return messages.filter((msg) => !msg.uiHidden && !msg.isCancelled);
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
    if (!parsedMessage) return false;
    const parsed = parsedMessage.parsed;
    const hasText = parsed.displayText && parsed.displayText.trim().length > 0;
    const hasActions = parsed.actions && parsed.actions.length > 0;
    const hasOtherBlocks =
      parsed.contentBlocks &&
      parsed.contentBlocks.some((b) => {
        switch (b.type) {
          case 'tool':
            return true;
          case 'mixed_content':
            return b.segments.length > 0;
          case 'code':
          case 'html':
          case 'file':
          case 'markdown':
            return b.content.trim().length > 0;
          default:
            return false;
        }
      });
    return !!(hasText || hasActions || hasOtherBlocks);
  }, [isProcessing, visibleMessages, parsedMessages]);

  return (
    <div
      ref={bodyRef}
      className="flex-1 overflow-y-auto flex flex-col gap-3 text-sm relative scrollbar-thin"
      style={{
        backgroundColor: 'var(--secondary-bg)',
        padding: 'var(--spacing-lg)',
        paddingBottom: visibleMessages.length > 0 ? '200px' : 'var(--spacing-lg)',
        scrollbarWidth: 'thin',
      }}
    >
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
            className="pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-[5px] rounded-[20px] text-[11px] font-semibold cursor-pointer transition-opacity duration-200"
            style={{
              border: '1px solid color-mix(in srgb, var(--primary, #007acc) 40%, transparent)',
              background: 'color-mix(in srgb, var(--background) 85%, var(--primary, #007acc))',
              color: 'var(--primary, #007acc)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <span className="codicon codicon-arrow-down text-[11px]" />
            New messages
          </button>
        </div>
      )}
      <div className="relative flex flex-col">
        {visibleMessages.map((message, index) => {
          const parsedMessage = parsedMessages.find((pm) => pm.id === message.id);
          if (!parsedMessage) return null;
          const parsedContent = parsedMessage.parsed;
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
          return (
            <ChatErrorBoundary key={message.id}>
              <MessageBox
                key={message.id}
                message={message}
                parsedContent={parsedContent}
                nextUserMessage={nextUserMessage}
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
                isLastMessage={index === visibleMessages.length - 1 || index === lastAssistantIndex}
                toolOutputs={toolOutputs}
                terminalStatus={terminalStatus}
                allMessages={messages}
                activeTerminalIds={activeTerminalIds}
                attachedTerminalIds={attachedTerminalIds}
                conversationId={conversationId}
                previousAssistantMessage={previousAssistantMessage}
                onSendMessage={onSendMessage}
                onSelectOption={onSelectOption}
                isSimpleMode={isSimpleMode}
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
              />
            </ChatErrorBoundary>
          );
        })}
      </div>

      {hasUnexecutedAutoActions && onContinue && (
        <div className="pl-[29px] mt-3 mb-3 flex">
          <button
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-1.5 h-7 px-4 rounded-md text-[11px] font-semibold uppercase tracking-[0.5px] cursor-pointer box-border transition-all duration-200 ease-in-out"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--primary, #007acc) 15%, transparent)',
              color: 'var(--primary, #007acc)',
              border: '1px solid color-mix(in srgb, var(--primary, #007acc) 30%, transparent)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                'color-mix(in srgb, var(--primary, #007acc) 25%, transparent)';
              e.currentTarget.style.borderColor =
                'color-mix(in srgb, var(--primary, #007acc) 50%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                'color-mix(in srgb, var(--primary, #007acc) 15%, transparent)';
              e.currentTarget.style.borderColor =
                'color-mix(in srgb, var(--primary, #007acc) 30%, transparent)';
            }}
          >
            <span className="codicon codicon-play text-xs inline-flex items-center justify-center" />
            <span>Continue Task</span>
          </button>
        </div>
      )}

      {isContinuing && (
        <div
          className="flex items-start gap-2.5 px-3.5 py-2 mb-1 mt-1 rounded-lg text-xs"
          style={{
            background: 'color-mix(in srgb, var(--warn, #cca700) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--warn, #cca700) 25%, transparent)',
            color: 'var(--text-primary)',
          }}
        >
          <span
            className="shrink-0 mt-0.5 inline-block w-2 h-2 rounded-full animate-[zen-pulse_1.2s_ease-in-out_infinite]"
            style={{
              background: 'var(--warn, #cca700)',
            }}
          />
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold opacity-90">Response bị ngắt — đang tiếp tục…</span>
            <span className="opacity-70 leading-relaxed">
              {incompleteHasPartialTool
                ? `AI tự động ngắt response dài. Đang ghép phần còn lại của \`${incompletePartialToolType ?? 'tool'}\` trước khi thực thi.`
                : 'AI tự động ngắt response dài. Đang lấy phần còn lại…'}
            </span>
          </div>
          <style>{`
            @keyframes zen-pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.4; transform: scale(0.75); }
            }
          `}</style>
        </div>
      )}

      {(isProcessing || hasInitialMessage) && <ProcessingIndicator isResponding={isResponding} />}

      <div ref={messagesEndRef} />
      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; height: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(128, 128, 128, 0.4);
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.6);
        }
      `}</style>
    </div>
  );
};

export default ChatBody;
