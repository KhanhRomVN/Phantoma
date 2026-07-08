import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';

import { extensionService } from '../../services/ExtensionService';
import { saveConversation } from './services/ConversationService';

import { useFileHandling } from '../../hooks/useFileHandling';
import { ChatSession } from './types/chat';
import { Message } from './types/message';
import { ConversationCache } from './services/ConversationCache';
import ChatHeader from './components/ChatHeader';
import ChatBody from './components/ChatBody';
import ChatFooter from './components/ChatFooter';
import { ChatErrorBoundary } from './components/ChatErrorBoundary';
import { $ } from '@renderer/utils/color';
import { parseAIResponse } from './services/ResponseParser';
import { useTerminalPolling } from './hooks/tools/useTerminalPolling';
import { useDraftManagement } from './hooks/conversation/useDraftManagement';
import { useWorkspaceData } from './hooks/workspace/useWorkspaceData';
import { useMentionSystem } from './hooks/ui/useMentionSystem';
import { useBrowserSession } from './hooks/llm/useBrowserSession';
import { useToolExecution } from './hooks/tools/useToolExecution';
import { useGitOperations } from './hooks/workspace/useGitOperations';
import { useConversationRestore } from './hooks/conversation/useConversationRestore';
import { useChatLLM } from './hooks/llm/useChatLLM';

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
}) => {
  console.log('[DEBUG][ReRender] ChatPanel rendered', { currentChat: currentChat?.sessionId, feature, hasInitialData: !!initialMessageData });
  // --- States ---
  const [apiUrl, setApiUrl] = useState('http://localhost:8888');
  const [isApiUrlReady, setIsApiUrlReady] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);

  const { activeTerminalIds, attachedTerminalIds } = useTerminalPolling();
  const [currentModel, setCurrentModel] = useState<any>(() => {
    if (initialMessageData?.model) return initialMessageData.model;
    try {
      const saved = localStorage.getItem('zen_last_model');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });
  const [currentAccount, setCurrentAccount] = useState<any>(() => {
    if (initialMessageData?.account) return initialMessageData.account;
    try {
      const saved = localStorage.getItem('zen_last_account');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const currentModelRef = useRef<any>(null);
  const currentAccountRef = useRef<any>(null);

  currentModelRef.current = currentModel;
  currentAccountRef.current = currentAccount;

  useEffect(() => {
    if (currentModel) {
      localStorage.setItem('zen_last_model', JSON.stringify(currentModel));
    }
  }, [currentModel]);

  useEffect(() => {
    if (currentAccount) {
      localStorage.setItem('zen_last_account', JSON.stringify(currentAccount));
    }
  }, [currentAccount]);

  const { isSimpleMode, commitMessageLanguage } = useSettings();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [, setAutoScrollPaused] = useState(false);
  const scrollToBottomRef = useRef<(() => void) | null>(null);

  // --- ChatFooter local state ---
  const [, setShowProjectStructureDrawer] = useState(false);
  const [showChangesDropdown, setShowChangesDropdown] = useState(false);
  const [, setShowProjectContextModal] = useState(false);
  const [projectContext, setProjectContext] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { apiUrl: backendApiUrl } = useSettings();

  const [revertInput, setRevertInput] = useState<{ value: string; nonce: number } | null>(null);
  const revertParentMessageIdRef = useRef<string | null>(null);

  // --- Hooks ---
  const {
    messages,
    setMessages,
    messagesRef,
    isProcessing,
    setIsProcessing,
    isStreaming,
    isContinuing,
    incompleteHasPartialTool,
    incompletePartialToolType,
    currentConversationId,
    setCurrentConversationId,
    currentConversationIdRef,
    sendMessage,
    stopGeneration,
    resetSession,
    setBackendConversationId,
    conversationToolOverrides,
    handleToolAction,
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
  });

  const { availableFiles, availableFolders } = useWorkspaceData();

  const {
    message,
    setMessage,
    clearDraft,
    handleKeyDown: handleDraftKeyDown,
    undoStackRef,
    undoIndexRef,
  } = useDraftManagement(currentConversationId, revertInput);

  const {
    showAtMenu,
    setShowAtMenu,
    showMentionDropdown,
    setShowMentionDropdown,
    setMentionType,
    attachedItems,
    checkMentions,
    removeAttachedItem,
    clearAttachedItems,
    addAttachedItem,
  } = useMentionSystem({
    message,
    setMessage,
    textareaRef,
    availableFiles,
    availableFolders,
    onRequestWorkspaceFiles: () => {
      const vscodeApi = (window as any).vscodeApi;
      if (vscodeApi) {
        vscodeApi.postMessage({ command: 'getWorkspaceFiles' });
      }
    },
    onRequestWorkspaceFolders: () => {
      const vscodeApi = (window as any).vscodeApi;
      if (vscodeApi) {
        vscodeApi.postMessage({ command: 'getWorkspaceFolders' });
      }
    },
  });

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
      setShowAtMenu(false);
    },
  });

  const { showBrowserWarning, isLaunchingBrowser, launchBrowserSession } = useBrowserSession(
    currentModel,
    currentAccount,
    backendApiUrl,
  );

  // --- Refs ---
  const hasProcessedInitial = useRef(false);
  const isStoppedRef = useRef(false);

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
      let finalContent = content;
      const parentMsgId = revertParentMessageIdRef.current || undefined;
      revertParentMessageIdRef.current = null;
      if (parentMsgId && currentConversationId) {
        sessionStorage.removeItem(`zen-revert-parent:${currentConversationId}`);
      }
      return sendMessage(
        finalContent,
        files,
        model,
        account,
        skipFirstRequestLogic,
        actionIds,
        uiHidden,
        parentMsgId,
      );
    },
    [sendMessage, currentChat],
  );

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
    sendMessage: (content, files, model, account, skipLogic, actionIds, uiHidden) =>
      wrappedSendMessage(content, files, model, account, skipLogic, actionIds, uiHidden),
  });

  // Git operations
  const {
    gitStatus,
    gitLoading,
    showGitStatusBlock,
    gitCommitLoading,
    enrichedModel,
    handleGitPullRequest,
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

  // Conversation restore
  const { isRestored, setIsRestored, handleRevertConversation } = useConversationRestore({
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
  });

  useEffect(() => {
    hasProcessedInitial.current = false;
    resetSession();
  }, [currentChat?.sessionId]);

  // --- Memoized Values ---
  const isHistoryMode = useMemo(() => {
    return !!(currentChat as any)?.conversationId && !currentChat?.canAccept;
  }, [currentChat]);

  const parseCacheRef = useRef<Map<string, ReturnType<typeof parseAIResponse>>>(new Map());

  const parsedMessages = useMemo(() => {
    const cache = parseCacheRef.current;
    return messages.map((msg: Message) => {
      if (!cache.has(msg.content)) {
        cache.set(msg.content, parseAIResponse(msg.content));
      }
      return { ...msg, parsed: cache.get(msg.content)! };
    });
  }, [messages]);

  const contextUsage = useMemo(() => {
    return messages.reduce(
      (acc, msg) => {
        if (msg.isCancelled) return acc;
        if (msg.token_usage) {
          acc.total += msg.token_usage;
          if (msg.usage) {
            acc.prompt += msg.usage.prompt_tokens || 0;
            acc.completion += msg.usage.completion_tokens || 0;
          } else if (msg.role === 'user') {
            acc.prompt += msg.token_usage;
          } else {
            acc.completion += msg.token_usage;
          }
        } else if (msg.usage) {
          acc.prompt += msg.usage.prompt_tokens || 0;
          acc.completion += msg.usage.completion_tokens || 0;
          acc.total += msg.usage.total_tokens || 0;
        }
        return acc;
      },
      { prompt: 0, completion: 0, total: 0 },
    );
  }, [messages]);

  const currentTaskName = useMemo(() => {
    for (let i = parsedMessages.length - 1; i >= 0; i--) {
      const msg = parsedMessages[i];
      if (msg.isCancelled) continue;
      if (msg.role === 'user') break;
      if (msg.role === 'assistant' && msg.parsed.taskName) return msg.parsed.taskName;
    }
    return null;
  }, [parsedMessages]);

  // --- Effects ---
  useEffect(() => {
    const storage = extensionService.getStorage();
    storage
      .get('backend-api-url')
      .then((res: any) => {
        if (res?.value?.startsWith('http')) {
          const url = res.value.endsWith('/') ? res.value.slice(0, -1) : res.value;
          setApiUrl(url);
        }
        setIsApiUrlReady(true);
      })
      .catch((err: any) => {
        console.warn('[Zen] ChatPanel failed to load apiUrl from storage:', err);
        setIsApiUrlReady(true);
      });
  }, []);

  useEffect(() => {
    if (!apiUrl) return;
    fetch(`${apiUrl}/v1/providers`)
      .then((r) => r.json())
      .then((res: any) => {
        const data = Array.isArray(res) ? res : res?.data;
        if (Array.isArray(data)) setProviders(data);
      })
      .catch(() => {});
  }, [apiUrl]);

  useEffect(() => {
    if (initialMessageData?.model) {
      setCurrentModel(initialMessageData.model);
    }
    if (initialMessageData?.account) {
      setCurrentAccount(initialMessageData.account);
    }
  }, [initialMessageData]);

  useEffect(() => {
    console.log('[DEBUG][ReRender] ChatPanel initialMessageData useEffect triggered', { hasInitialData: !!initialMessageData, isApiUrlReady, hasProcessed: hasProcessedInitial.current });
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

  useEffect(() => {
    if (currentConversationId && messages.length > 0) {
      const existing = ConversationCache.get(currentConversationId);
      ConversationCache.set(currentConversationId, {
        messages,
        conversationId: currentConversationId,
        backendConversationId: existing?.backendConversationId,
        currentModel: currentModel || existing?.currentModel,
        currentAccount: currentAccount || existing?.currentAccount,
        toolOutputs: Object.keys(toolOutputs).length > 0 ? toolOutputs : existing?.toolOutputs,
      });
    }
  }, [messages, currentConversationId, currentModel, currentAccount, toolOutputs]);

  useEffect(() => {
    if (!currentConversationId || Object.keys(toolOutputs).length === 0) return;
    const sessionId = currentChat?.sessionId || -1;
    const folderPath = currentChat?.folderPath || null;
    saveConversation(
      sessionId,
      folderPath,
      messages,
      currentConversationId,
      currentChat || undefined,
      true,
      undefined,
      undefined,
      toolOutputs,
    );
  }, [toolOutputs, currentConversationId, currentChat]);

  useEffect(() => {
    if (!currentConversationId || Object.keys(singleLineReviewActions).length === 0) return;
    const sessionId = currentChat?.sessionId || -1;
    const folderPath = currentChat?.folderPath || null;
    saveConversation(
      sessionId,
      folderPath,
      messages,
      currentConversationId,
      currentChat || undefined,
      true,
      undefined,
      undefined,
      undefined,
      singleLineReviewActions,
    );
  }, [singleLineReviewActions, currentConversationId, currentChat]);

  const handleSend = (model: any, account: any) => {
    if (invalidExternalFiles && invalidExternalFiles.length > 0) {
      const vscodeApi = (window as any).vscodeApi;
      const message = `Cannot send message due to invalid file(s):\n${invalidExternalFiles.map((f) => `• ${f.name}: ${f.reason}`).join('\n')}\n\nPlease remove these files and try again.`;
      if (vscodeApi) {
        vscodeApi.postMessage({
          command: 'showError',
          message: message,
        });
      } else {
        alert(message);
      }
      return;
    }

    if (message.trim() || uploadedFiles.length > 0 || attachedItems.length > 0) {
      const latestModel = model || currentModelRef.current;
      const latestAccount = account || currentAccountRef.current;
      wrappedSendMessage(
        message,
        [...uploadedFiles, ...attachedItems],
        latestModel,
        latestAccount,
        undefined,
        undefined,
        undefined,
      );
      setMessage('');
      clearDraft();
      clearFiles();
      clearAttachedItems();
      clearInvalidExternalFiles();
      undoStackRef.current = [];
      undoIndexRef.current = -1;
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    checkMentions(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    handleDraftKeyDown(e, checkMentions);
  };

  const handleOpenImage = (file: any) => {
    const vscodeApi = (window as any).vscodeApi;
    if (vscodeApi) {
      vscodeApi.postMessage({
        command: 'openTempImage',
        content: file.content,
        filename: file.name,
      });
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
    }
  }, [message]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showAtMenu) {
        const menu = document.querySelector('[data-at-menu="true"]');
        if (menu && !menu.contains(target) && target !== textareaRef.current) {
          setShowAtMenu(false);
        }
      }
      if (showMentionDropdown) {
        const dropdown = document.querySelector('[data-mention-dropdown="true"]');
        if (dropdown && !dropdown.contains(target)) {
          setShowMentionDropdown(false);
          setMentionType(null);
        }
      }
    };
    if (showAtMenu || showMentionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAtMenu, showMentionDropdown]);

  useEffect(() => {
    const vscodeApi = (window as any).vscodeApi;
    if (vscodeApi) {
      vscodeApi.postMessage({ command: 'loadProjectContext' });
    }
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'projectContextResponse') {
        setProjectContext(message.context);
      } else if (message.command === 'addAttachedItem') {
        const isFolder =
          message.itemType === 'folder' || (!message.uri.includes('.') && !message.itemType);
        addAttachedItem({
          id: Math.random().toString(36).substring(7),
          path: message.uri,
          type: isFolder ? 'folder' : 'file',
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleStopGeneration = useCallback(() => {
    isStoppedRef.current = true;
    stopGeneration();
    setIsProcessing(false);
    setMessages((prev) => {
      const lastAssistantIdx = [...prev].reduceRight(
        (found, m, i) => (found === -1 && m.role === 'assistant' && !m.isCancelled ? i : found),
        -1,
      );
      if (lastAssistantIdx === -1) return prev;
      const updated = [...prev];
      updated[lastAssistantIdx] = {
        ...updated[lastAssistantIdx],
        isCancelled: true,
      };
      const sessionId = currentChat?.sessionId || -1;
      const folderPath = currentChat?.folderPath || null;
      saveConversation(
        sessionId,
        folderPath,
        updated,
        currentConversationId,
        currentChat || undefined,
        true,
      );
      return updated;
    });
  }, [stopGeneration, setIsProcessing, setMessages, currentChat, currentConversationId]);

  useEffect(() => {
    handleGitCommitMessageDetected(messages);
  }, [messages, handleGitCommitMessageDetected]);

  const firstRequestMessage = messages.find((m) => m.role === 'user');

  const displayedModel = enrichedModel ?? currentModel;

  const footerPaddingBottom =
    showBrowserWarning && currentModel?.providerId === 'zai-browser' ? '20px' : '8px';

  return (
    <div
      className="chat-panel flex flex-col h-full"
      style={{
        backgroundColor: $('--secondary-bg'),
        color: $('--text-primary'),
      }}
    >
      {/* ChatHeader */}
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

      {/* ChatBody */}
      <ChatErrorBoundary>
        <ChatBody
          messages={messages}
          isProcessing={isProcessing}
          isContinuing={isContinuing}
          incompleteHasPartialTool={incompleteHasPartialTool}
          incompletePartialToolType={incompletePartialToolType}
          isSimpleMode={isSimpleMode}
          onSendToolRequest={(actions, msg, isAuto, type) =>
            handleToolRequest(actions, msg, isAuto, conversationToolOverrides, type)
          }
          onSendMessage={(c, f, m, a, skip, ids, hidden) =>
            wrappedSendMessage(c, f, m, a, skip, ids, hidden)
          }
          executionState={executionState}
          toolOutputs={toolOutputs}
          terminalStatus={terminalStatus}
          firstRequestMessageId={firstRequestMessage?.id}
          onLoadConversation={onLoadConversation}
          activeTerminalIds={activeTerminalIds}
          attachedTerminalIds={attachedTerminalIds}
          conversationId={currentConversationId}
          onToolAction={handleToolAction}
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
          onGitCancel={handleGitCancel}
          gitStatusItems={gitStatus?.items || []}
          gitStatusBranch={gitStatus?.branch || ''}
          isGitProcessing={gitCommitLoading}
          isGitStatusVisible={showGitStatusBlock}
        />
      </ChatErrorBoundary>

      {/* ChatFooter */}
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
        footerPaddingBottom={footerPaddingBottom}
      />
    </div>
  );
};

export default ChatPanel;
