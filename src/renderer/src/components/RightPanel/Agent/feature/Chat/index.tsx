/**
 * ------------------------------------------------------------------
 * ChatPanel
 * ------------------------------------------------------------------
 * Panel chat chính của Agent, quản lý gửi/nhận message, streaming,
 * tool execution, git operations và browser session.
 *
 * Main features:
 * - Gửi message với streaming response
 * - Tích hợp tool execution và git operations
 * - Quản lý browser session cho ZAI Browser model
 * - Restore conversation từ history
 * - Quản lý draft và file upload
 * ------------------------------------------------------------------
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';

// Core chat hooks
import { useChatLLM } from './hooks/llm/useChatLLM';
import { useToolExecution } from './hooks/tools/useToolExecution';
import { useWorkspaceData } from './hooks/workspace/useWorkspaceData';
import { useGitOperations } from './hooks/workspace/useGitOperations';
import { useConversationRestore } from './hooks/conversation/useConversationRestore';
import { useFileHandling } from '../../hooks/useFileHandling';
import { useBrowserSession } from './hooks/llm/useBrowserSession';
import { useDraftManagement } from './hooks/conversation/useDraftManagement';
import { useModelAccount } from '../../hooks/useModelAccount';

// New modular hooks
import { useApiConfiguration } from './hooks/api/useApiConfiguration';
import { useUIState } from './hooks/ui/useUIState';
import { useMessageParsing } from './hooks/messages/useMessageParsing';
import { useContextUsage } from './hooks/messages/useContextUsage';
import { useFileStats } from './hooks/messages/useFileStats';
import { useMessageHandlers } from './hooks/handlers/useMessageHandlers';
import { useTextareaHandlers } from './hooks/handlers/useTextareaHandlers';
import { useExternalMessages } from './hooks/events/useExternalMessages';
import { useConversationCache } from './hooks/cache/useConversationCache';
import { useConversationPersistence } from './hooks/persistence/useConversationPersistence';

// Types
import { ChatSession } from './types/chat';

// Components
import ChatHeader from './components/ChatHeader';
import ChatBody from './components/ChatBody';
import ChatFooter from './components/ChatFooter';

interface ChatPanelProps {
  currentChat: ChatSession | null;
  onBack: (contentToReturn?: string) => void;
  feature?: string | null;
  onLoadConversation?: (
    conversationId: string,
    sessionId: number,
    folderPath: string | null,
  ) => void;
  initialMessageData?: {
    content: string;
    files: any[];
    model: any;
    account: any;
  } | null;
  onClearInitialData?: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  currentChat,
  onBack,
  feature,
  onLoadConversation,
  initialMessageData,
  onClearInitialData,
}: ChatPanelProps) => {
  // Track render count for performance monitoring
  const renderCountRef = useRef(0);
  const prevPropsRef = useRef<any>({});
  renderCountRef.current++;

  // DEBUG: Log what caused this render
  useEffect(() => {
    const changedProps: string[] = [];
    const prev = prevPropsRef.current;

    if (prev.currentChat !== currentChat) changedProps.push('currentChat');
    if (prev.onBack !== onBack) changedProps.push('onBack');
    if (prev.onLoadConversation !== onLoadConversation) changedProps.push('onLoadConversation');
    if (prev.initialMessageData !== initialMessageData) changedProps.push('initialMessageData');
    if (prev.onClearInitialData !== onClearInitialData) changedProps.push('onClearInitialData');

    prevPropsRef.current = {
      currentChat,
      onBack,
      onLoadConversation,
      initialMessageData,
      onClearInitialData,
    };
  });

  // DEBUG: Track all state changes that could cause re-renders
  const prevStateRef = useRef<any>({});
  useEffect(() => {
    const prev = prevStateRef.current;
    const changes: string[] = [];

    // Track what changed
    if (prev.apiUrl !== apiUrl) changes.push(`apiUrl`);
    if (prev.isApiUrlReady !== isApiUrlReady) changes.push(`isApiUrlReady`);
    if (prev.currentModel !== currentModel) changes.push(`currentModel`);
    if (prev.currentAccount !== currentAccount) changes.push(`currentAccount`);
    if (prev.isSearchOpen !== isSearchOpen) changes.push(`isSearchOpen`);
    if (prev.searchQuery !== searchQuery) changes.push(`searchQuery`);
    if (prev.autoScrollPaused !== autoScrollPaused) changes.push(`autoScrollPaused`);
    if (prev.showProjectStructureDrawer !== showProjectStructureDrawer)
      changes.push(`showProjectStructureDrawer`);
    if (prev.showChangesDropdown !== showChangesDropdown) changes.push(`showChangesDropdown`);
    if (prev.showProjectContextModal !== showProjectContextModal)
      changes.push(`showProjectContextModal`);
    if (prev.revertInput !== revertInput) changes.push(`revertInput`);
    if (prev.loadedConversationFileStats !== loadedConversationFileStats)
      changes.push(`loadedConversationFileStats`);

    prevStateRef.current = {
      apiUrl,
      isApiUrlReady,
      currentModel,
      currentAccount,
      isSearchOpen,
      searchQuery,
      autoScrollPaused,
      showProjectStructureDrawer,
      showChangesDropdown,
      showProjectContextModal,
      revertInput,
      loadedConversationFileStats,
    };
  });

  // --- API & Configuration ---
  const { apiUrl, isApiUrlReady, providers } = useApiConfiguration();

  // --- Model & Account Selection ---
  const { currentModel, setCurrentModel, currentAccount, setCurrentAccount } = useModelAccount(
    currentChat?.folderPath,
    {
      initialModel: initialMessageData?.model,
      initialAccount: initialMessageData?.account,
    },
  );

  // Refs to always access the latest model/account values inside callbacks
  const currentModelRef = useRef<any>(null);
  const currentAccountRef = useRef<any>(null);
  currentModelRef.current = currentModel;
  currentAccountRef.current = currentAccount;

  const { commitMessageLanguage } = useSettings();

  // --- UI State Management ---
  const {
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    autoScrollPaused,
    setAutoScrollPaused,
    showProjectStructureDrawer,
    setShowProjectStructureDrawer,
    showChangesDropdown,
    setShowChangesDropdown,
    showProjectContextModal,
    setShowProjectContextModal,
    projectContext,
    setProjectContext,
  } = useUIState();

  // --- Refs ---
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollToBottomRef = useRef<(() => void) | null>(null);
  const hasProcessedInitial = useRef(false);
  const isStoppedRef = useRef(false);

  // --- Mention helpers (simplified - no mention system in Electron) ---
  const [, setShowAtMenu] = useState(false);
  const checkMentions = useCallback((_value: string) => {}, []);

  // Revert state
  const [revertInput, setRevertInput] = useState<{
    value: string;
    nonce: number;
  } | null>(null);
  const revertParentMessageIdRef = useRef<string | null>(null);

  // Loaded conversation file stats from history
  const [loadedConversationFileStats, setLoadedConversationFileStats] = useState<{
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
  } | null>(null);

  // --- Chat LLM Hook ---
  const {
    messages,
    setMessages,
    messagesRef,
    isProcessing,
    setIsProcessing,
    isStreaming,
    isContinuing,
    currentConversationId,
    setCurrentConversationId,
    currentConversationIdRef,
    sendMessage,
    stopGeneration,
    resetSession,
    setBackendConversationId,
    conversationToolOverrides,
    handleSelectOption,
  } = useChatLLM({
    apiUrl,
    selectedTab: currentChat,
    feature,
    onToolRequest: (actions, assistantMessage, isAutoTrigger, actionType) =>
      handleToolRequest(
        actions,
        assistantMessage,
        isAutoTrigger,
        conversationToolOverrides,
        actionType,
      ),
    onMalformedTool: (actionId, _toolName, errorMessage, errorCode) => {
      setToolOutputs((prev: any) => ({
        ...prev,
        [actionId]: {
          output: `${errorCode}: ${errorMessage}`,
          isError: true,
          originalError: `${errorCode}: ${errorMessage}`,
        },
      }));
    },
  });

  // DEBUG: Track messages and streaming state changes
  const prevChatStateRef = useRef<any>({});
  useEffect(() => {
    const prev = prevChatStateRef.current;
    const changes: string[] = [];

    if (prev.messages !== messages) changes.push(`messages (length: ${messages.length})`);
    if (prev.isProcessing !== isProcessing) changes.push(`isProcessing: ${isProcessing}`);
    if (prev.isStreaming !== isStreaming) changes.push(`isStreaming: ${isStreaming}`);
    if (prev.currentConversationId !== currentConversationId) changes.push(`currentConversationId`);
    if (prev.isContinuing !== isContinuing) changes.push(`isContinuing: ${isContinuing}`);

    prevChatStateRef.current = {
      messages,
      isProcessing,
      isStreaming,
      currentConversationId,
      isContinuing,
    };
  });

  // --- Workspace Data ---
  useWorkspaceData();

  // --- Draft Management ---
  const {
    message,
    setMessage,
    clearDraft,
    handleKeyDown: handleDraftKeyDown,
    undoStackRef,
    undoIndexRef,
  } = useDraftManagement(currentConversationId, revertInput);

  // --- Attached Items ---
  const [attachedItems, setAttachedItems] = React.useState<any[]>([]);

  const removeAttachedItem = useCallback((itemId: string) => {
    setAttachedItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const clearAttachedItems = useCallback(() => {
    setAttachedItems([]);
  }, []);

  const addAttachedItem = useCallback((item: any) => {
    setAttachedItems((prev) => [...prev, item]);
  }, []);

  // --- File Handling ---
  const {
    uploadedFiles,
    invalidExternalFiles,
    fileInputRef,
    externalFileInputRef,
    handlePaste,
    handleFileSelect,
    handleFileInputChange,
    removeFile,
    handleExternalFileInputChange,
    handleDragOver,
    handleDrop,
    clearFiles,
    clearInvalidExternalFiles,
  } = useFileHandling({
    accountId: currentAccount?.id,
    onAddAttachedItem: (item) => {
      addAttachedItem(item);
    },
  });

  // --- Browser Session ---
  const { showBrowserWarning, isLaunchingBrowser, launchBrowserSession } = useBrowserSession(
    currentModel,
    currentAccount,
    apiUrl,
  );

  // --- Wrapped Send Message ---
  const wrappedSendMessage = useCallback(
    async (
      content: string,
      files?: any[],
      model?: any,
      account?: any,
      skipFirstRequestLogic?: boolean,
      actionIds?: string[],
      uiHidden?: boolean,
    ) => {
      if (!skipFirstRequestLogic) {
        isStoppedRef.current = false;
      }
      setIsRestored(false);
      const parentMsgId = revertParentMessageIdRef.current || undefined;
      revertParentMessageIdRef.current = null;
      if (parentMsgId && currentConversationId) {
        sessionStorage.removeItem(`zen-revert-parent:${currentConversationId}`);
      }
      return sendMessage(
        content,
        files,
        model,
        account,
        skipFirstRequestLogic,
        actionIds,
        uiHidden,
        parentMsgId,
      );
    },
    [sendMessage, currentConversationId],
  );

  // --- Tool Execution ---
  const {
    executionState,
    toolOutputs,
    setToolOutputs,
    terminalStatus,
    handleToolRequest,
    singleLineReviewActions,
    confirmSingleLineAction,
    rejectSingleLineAction,
  } = useToolExecution({
    conversationIdRef: currentConversationIdRef,
    messagesRef: messagesRef,
    isStoppedRef: isStoppedRef,
    sendMessage: (
      content: string,
      files: any[] | undefined,
      model: any,
      account: any,
      skipLogic: boolean | undefined,
      actionIds: string[] | undefined,
      uiHidden: boolean | undefined,
    ) => wrappedSendMessage(content, files, model, account, skipLogic, actionIds, uiHidden),
  });

  // --- Git Operations ---
  const {
    gitStatus,
    gitLoading,
    showGitStatusBlock,
    gitCommitLoading,
    setShowGitStatusBlock,
    enrichedModel,
    handleGitPullRequest,
    handleGitConfirm,
    handleGitCancel,
    handleGitCommitMessageDetected,
  } = useGitOperations({
    currentModel,
    currentAccount,
    providers,
    commitMessageLanguage,
    currentConversationId,
    wrappedSendMessage,
    setMessages,
    setToolOutputs,
  });

  // --- Conversation Restore ---
  const { isLoadingConversation, isRestored, setIsRestored, handleRevertConversation } =
    useConversationRestore({
      currentChat,
      currentConversationId,
      currentConversationIdRef,
      messagesRef,
      setMessages,
      setIsProcessing,
      setToolOutputs,
      setBackendConversationId,
      setCurrentConversationId,
      setCurrentModel,
      setCurrentAccount,
      onBack,
      revertParentMessageIdRef,
      setRevertInput,
      setLoadedConversationFileStats,
    });

  // --- Message Parsing (with caching) ---
  const parsedMessages = useMessageParsing(messages, isStreaming);

  // --- Context Usage ---
  const contextUsage = useContextUsage(messages);

  // --- File Stats ---
  const conversationFileStats = useFileStats(messages, loadedConversationFileStats);

  // --- Current Task Name ---
  const currentTaskName = useMemo(() => {
    for (let i = parsedMessages.length - 1; i >= 0; i--) {
      const msg = parsedMessages[i];
      if (msg.isCancelled) continue;
      if (msg.role === 'user') break;
      if (msg.role === 'assistant' && msg.parsed.taskName) return msg.parsed.taskName;
    }
    return null;
  }, [parsedMessages]);

  // --- Message Handlers ---
  const { handleSend, handleStopGeneration } = useMessageHandlers({
    message,
    setMessage,
    uploadedFiles,
    attachedItems,
    invalidExternalFiles,
    currentModelRef,
    currentAccountRef,
    textareaRef: textareaRef as any,
    clearDraft,
    clearFiles,
    clearAttachedItems,
    clearInvalidExternalFiles,
    undoStackRef,
    undoIndexRef,
    wrappedSendMessage,
    currentConversationId,
    currentChat,
    stopGeneration,
    setIsProcessing,
    setMessages,
    isStoppedRef,
  });

  // --- Textarea Handlers ---
  const { handleTextareaChange, handleKeyDown, handleOpenImage } = useTextareaHandlers({
    setMessage,
    checkMentions,
    handleDraftKeyDown,
  });

  // --- Handle Back to Home ---
  const handleBackToHome = useCallback(
    (summary: string) => {
      onBack(summary);
    },
    [onBack],
  );

  // --- External Messages ---
  useExternalMessages({
    currentChat,
    currentConversationId,
    messages,
    setMessages,
    setProjectContext,
    addAttachedItem,
  });

  const memoizedMessages = useMemo(
    () => messages,
    [messages.length, messages[messages.length - 1]?.content?.length],
  );
  const memoizedCurrentModel = useMemo(() => currentModel, [currentModel?.id, currentModel?.name]);
  const memoizedCurrentAccount = useMemo(
    () => currentAccount,
    [currentAccount?.id, currentAccount?.name],
  );
  const memoizedToolOutputs = useMemo(() => toolOutputs, [Object.keys(toolOutputs).length]);

  const memoizedHandleToolRequest = useCallback(
    (actions: any, msg: any, isAuto?: boolean, type?: any) => {
      handleToolRequest(actions, msg, isAuto, conversationToolOverrides, type);
    },
    [handleToolRequest, conversationToolOverrides],
  );

  const memoizedWrappedSendMessage = useCallback(
    (c: string, f?: any, m?: any, a?: any, skip?: boolean, ids?: string[], hidden?: boolean) => {
      wrappedSendMessage(c, f, m, a, skip, ids, hidden);
    },
    [wrappedSendMessage],
  );

  // --- Conversation Cache ---
  useConversationCache({
    currentConversationId,
    messages: memoizedMessages,
    isStreaming,
    currentModel: memoizedCurrentModel,
    currentAccount: memoizedCurrentAccount,
    toolOutputs: memoizedToolOutputs,
    conversationFileStats,
  });

  // --- Conversation Persistence ---
  useConversationPersistence({
    currentConversationId,
    currentChat,
    messages,
    toolOutputs,
    singleLineReviewActions,
    conversationFileStats,
  });

  // --- Effects ---

  // Reset hasProcessedInitial when new tab/chat starts
  useEffect(() => {
    hasProcessedInitial.current = false;
    resetSession();
    setLoadedConversationFileStats(null);
  }, [currentChat?.sessionId, resetSession]);

  // Sync currentModel/currentAccount from initialMessageData
  useEffect(() => {
    if (initialMessageData?.model) {
      setCurrentModel(initialMessageData.model);
    }
    if (initialMessageData?.account) {
      setCurrentAccount(initialMessageData.account);
    }
  }, [initialMessageData, setCurrentModel, setCurrentAccount]);

  // Process initial message
  useEffect(() => {
    if (initialMessageData && !hasProcessedInitial.current && isApiUrlReady) {
      hasProcessedInitial.current = true;
      const modelToSend = initialMessageData.model ?? null;
      const accountToSend = initialMessageData.account ?? null;
      sendMessage(
        initialMessageData.content,
        initialMessageData.files,
        modelToSend,
        accountToSend,
        false,
        undefined,
        undefined,
      );
      onClearInitialData?.();
    }
  }, [initialMessageData, sendMessage, onClearInitialData, isApiUrlReady]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
    }
  }, [message]);

  // Listen for Git commit message detection
  useEffect(() => {
    handleGitCommitMessageDetected(messages);
  }, [messages, handleGitCommitMessageDetected]);

  // --- Computed Values ---
  const isHistoryMode = useMemo(() => {
    return !!(currentChat as any)?.conversationId && !currentChat?.canAccept;
  }, [currentChat]);

  const firstRequestMessage = messages.find((m) => m.role === 'user');
  const displayedModel = enrichedModel ?? currentModel;
  const footerPaddingBottom =
    showBrowserWarning && currentModel?.providerId === 'zai-browser' ? '20px' : '8px';

  // --- Render ---
  return (
    <div className="flex flex-col h-full bg-background text-text-primary">
      {/* ─── ChatHeader ─── */}
      <ChatHeader
        displayedModel={displayedModel}
        currentAccount={currentAccount}
        currentTaskName={currentTaskName}
        contextUsage={contextUsage}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* ─── ChatBody ─── */}
      <ChatBody
        messages={parsedMessages}
        isProcessing={isProcessing}
        isContinuing={isContinuing}
        onSendToolRequest={memoizedHandleToolRequest}
        onSendMessage={memoizedWrappedSendMessage}
        executionState={executionState}
        toolOutputs={toolOutputs}
        terminalStatus={terminalStatus}
        firstRequestMessageId={firstRequestMessage?.id}
        onLoadConversation={onLoadConversation}
        conversationId={currentConversationId}
        onSelectOption={handleSelectOption}
        isRestored={isRestored}
        onContinue={() => setIsRestored(false)}
        hasInitialMessage={!!initialMessageData}
        onRevertConversation={handleRevertConversation}
        onAutoScrollPausedChange={setAutoScrollPaused}
        scrollToBottomRef={scrollToBottomRef}
        singleLineReviewActions={singleLineReviewActions}
        onConfirmSingleLineAction={confirmSingleLineAction}
        onRejectSingleLineAction={rejectSingleLineAction}
        isSearchOpen={isSearchOpen}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onCloseSearch={() => {
          setIsSearchOpen(false);
          setSearchQuery('');
        }}
        onGitConfirm={handleGitConfirm}
        onGitCancel={handleGitCancel}
        gitStatusItems={gitStatus?.items || []}
        gitStatusBranch={gitStatus?.branch || ''}
        isGitProcessing={gitCommitLoading}
        isGitStatusVisible={showGitStatusBlock}
        onBackToHome={handleBackToHome}
        isLoadingConversation={isLoadingConversation}
      />
      {/* ─── ChatFooter ─── */}
      <ChatFooter
        message={message}
        setMessage={setMessage}
        isHistoryMode={isHistoryMode}
        uploadedFiles={uploadedFiles}
        attachedItems={attachedItems}
        textareaRef={textareaRef}
        handleTextareaChange={handleTextareaChange}
        handleKeyDown={handleKeyDown}
        handlePaste={handlePaste}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
        setShowAtMenu={setShowAtMenu}
        handleFileSelect={handleFileSelect}
        fileInputRef={fileInputRef}
        onOpenProjectStructure={() => setShowProjectStructureDrawer(true)}
        showChangesDropdown={showChangesDropdown}
        setShowChangesDropdown={setShowChangesDropdown}
        messages={messages}
        handleSend={handleSend}
        hasProjectContext={!!projectContext}
        onOpenProjectContext={() => setShowProjectContextModal(true)}
        folderPath={currentChat?.folderPath || null}
        isConversationStarted={messages.length > 0 || !!initialMessageData}
        currentModel={enrichedModel ?? currentModel}
        setCurrentModel={setCurrentModel}
        currentAccount={currentAccount}
        setCurrentAccount={setCurrentAccount}
        isProcessing={isProcessing || executionState.status === 'running'}
        isStreaming={isStreaming}
        onStopGeneration={handleStopGeneration}
        showBrowserWarning={showBrowserWarning}
        isLaunchingBrowser={isLaunchingBrowser}
        onLaunchBrowserSession={launchBrowserSession}
        onGitPullRequest={handleGitPullRequest}
        gitLoading={gitLoading}
        isGitStatusVisible={showGitStatusBlock}
        removeAttachedItem={removeAttachedItem}
        onOpenImage={handleOpenImage}
        removeFile={removeFile}
        externalFileInputRef={externalFileInputRef}
        handleExternalFileInputChange={handleExternalFileInputChange}
        handleFileInputChange={handleFileInputChange}
        gitStatus={gitStatus}
        onOpenGitStatus={() => setShowGitStatusBlock(true)}
        loadedConversationFileStats={loadedConversationFileStats}
        footerPaddingBottom={footerPaddingBottom}
      />
    </div>
  );
};

export default ChatPanel;
