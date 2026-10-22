import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
/**
 * ------------------------------------------------------------------
 * useChatLLM
 * ------------------------------------------------------------------
 * Hook chính quản lý toàn bộ chat LLM flow.
 * Xử lý send message, streaming response, và tool execution.
 *
 * Main features:
 * - sendMessage          : Gửi message và xử lý streaming response
 * - stopGeneration       : Dừng generation đang chạy
 * - Tool auto-execution  : Tự động thực thi tool sau khi AI response
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Types ──
import { Message, QuestionAnswer } from '../../types/message';
import { ToolAction, parseAIResponse } from '../../services/ResponseParser';
import { ChatSession } from '../../types/chat';
import { AgentFeature } from '@renderer/components/RightPanel/Zen/context/FeatureContext';

// ── Context ──
import { useSettings } from '../../../../context/SettingsContext';
import { useProject } from '../../../../context/ProjectContext';

// ── Hooks ──
import { useFileUpload } from '../workspace/useFileUpload';
import {
  getLastScreenshotFileId,
  clearLastScreenshotFileId,
} from '../../services/tool-executors/ReconExecutor';
import { useStreamingState } from './useStreamingState';
import { useConversationRefs } from './useConversationRefs';
import { useMessageHandlers } from './useMessageHandlers';

// ── Services ──
import {
  logChatToWorkspace,
  saveConversation,
  calculateTokens,
  deleteConversation,
} from '../../services/ConversationService';
import { PromptBuilder } from '../../services/PromptBuilder';
import { StreamingService } from '../../services/StreamingService';
import { extensionService } from '@renderer/components/RightPanel/Zen/services/ExtensionService';

// ── Constants ──
import { TOOL_ACTION_TYPES } from '../../constants/constants';

// ── Utils ──
import {
  isBlockedNow,
  isDeepSeekProvider,
  getBlockedRangeLabel,
  getBlockedHoursDescription,
} from '@renderer/utils/timeBlock';

// ── Controllers ──
import { EmulateController } from '@renderer/controller/EmulateController';

// ── Prompts ──
import {
  buildTrafficContext,
  buildEmptyTrafficContext,
  buildFilterContext,
  buildEmptyFilterContext,
} from '../../prompts/emulate';

// ─── Types ──────────────────────────────────────────────────────────────
interface ConversationOverrides {
  useSkillEnabled?: boolean;
  memoryEnabled?: boolean;
  toolFormat?: 'xml' | 'json';
}

interface UseChatLLMProps {
  apiUrl: string;
  selectedTab: ChatSession | null;
  feature?: string | null;
  /** Per-conversation feature overrides from Home panel */
  conversationOverrides?: ConversationOverrides;
  /** Blocked time ranges từ provider config — sync với deepseek.constant.ts qua API */
  providerBlockedRanges?: Array<{ startTime: number; endTime: number }> | null;
  /** Cờ anti_system_prompt_injection từ provider config — thay cho hardcode providerId === "claude" */
  antiSystemPromptInjection?: boolean;
  onConversationIdChange?: (id: string) => void;
  onToolRequest?: (
    actions: ToolAction[],
    assistantMessage: Message,
    isAutoTrigger?: boolean,
    actionType?: (typeof TOOL_ACTION_TYPES)[keyof typeof TOOL_ACTION_TYPES],
  ) => void;
  /**
   * Callback thông báo toàn bộ lượt trả lời đã kết thúc (markdown-only xong,
   * hoặc chuỗi tool execution dừng hẳn).
   */
  onTurnComplete?: () => void;
  onMalformedTool?: (
    actionId: string,
    toolName: string,
    errorMessage: string,
    errorCode: string,
  ) => void;
}
export const parseQuestionAnswerTag = (content: string): Record<string, QuestionAnswer> | null => {
  const regex = /<question-answer>([\s\S]*?)<\/question-answer>/i;
  const match = regex.exec(content);
  if (!match) return null;

  const innerContent = match[1].trim();
  const answers: Record<string, QuestionAnswer> = {};

  const lines = innerContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'No answer') continue;

    const lineMatch = /^\d+\.\s+([^:]+):\s+(.+)$/i.exec(trimmed);
    if (!lineMatch) continue;

    const questionId = lineMatch[1].trim();
    const answerValue = lineMatch[2].trim();

    let parsedValue: string | string[] | boolean = answerValue;

    if (answerValue.toLowerCase() === 'true') {
      parsedValue = true;
    } else if (answerValue.toLowerCase() === 'false') {
      parsedValue = false;
    } else if (answerValue.includes(',')) {
      parsedValue = answerValue.split(',').map((v) => v.trim());
    }

    answers[questionId] = {
      questionId,
      value: parsedValue,
    };
  }

  return Object.keys(answers).length > 0 ? answers : null;
};

export const useChatLLM = ({
  apiUrl,
  selectedTab,
  feature,
  conversationOverrides,
  providerBlockedRanges,
  onConversationIdChange,
  onToolRequest,
  onTurnComplete,
  onMalformedTool,
}: UseChatLLMProps) => {
  // Ref to hold per-conversation overrides (from Home panel or restored from metadata).
  const conversationOverridesRef = useRef<ConversationOverrides | undefined>(conversationOverrides);
  const prevSelectedTabIdRef = useRef<string | number | undefined>(selectedTab?.sessionId);
  useEffect(() => {
    const currentTabId = selectedTab?.sessionId;
    const tabChanged = currentTabId !== prevSelectedTabIdRef.current;
    prevSelectedTabIdRef.current = currentTabId;

    if (tabChanged) {
      conversationOverridesRef.current = conversationOverrides;
    } else if (conversationOverrides !== undefined) {
      conversationOverridesRef.current = conversationOverrides;
    }
  }, [conversationOverrides, selectedTab?.sessionId]);

  // Ref giữ onTurnComplete luôn mới nhất (tránh stale closure trong sendMessage async)
  const onTurnCompleteRef = useRef(onTurnComplete);
  useEffect(() => {
    onTurnCompleteRef.current = onTurnComplete;
  }, [onTurnComplete]);

  const {
    streamingState,
    dispatchStreaming,
    isProcessingRef,
    setIsProcessingSync,
    setIsContinuingSync,
  } = useStreamingState();

  const {
    messagesRef,
    currentConversationIdRef,
    backendConversationIdRef,
    lastUsedModelRef,
    lastUsedAccountRef,
    abortControllerRef,
    qwenParentIdRef,
    userRequestCountRef,
    renderCountRef,
  } = useConversationRefs();

  renderCountRef.current++;

  // NOTE: useSkillEnabled & memoryEnabled are not yet in SettingsContext for Phantoma.
  // We rely solely on conversationOverridesRef for now. Default to false if no override provided.
  const { aiLanguage, promptLengthMode } = useSettings();
  const { workspace, treeView } = useProject();
  const { uploadFiles } = useFileUpload(apiUrl);

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>('');
  const [conversationToolOverrides, setConversationToolOverrides] = useState<
    Record<string, 'auto'>
  >({});

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (
      !currentConversationIdRef.current ||
      currentConversationIdRef.current === currentConversationId
    ) {
      currentConversationIdRef.current = currentConversationId;
    }
    onConversationIdChange?.(currentConversationId);
  }, [currentConversationId, onConversationIdChange]);

  useMessageHandlers({
    selectedTab,
    setMessages,
    currentConversationIdRef,
    backendConversationIdRef,
  });

  const resetSession = useCallback(() => {
    // Abort any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    currentConversationIdRef.current = '';
    backendConversationIdRef.current = '';
    messagesRef.current = [];
    lastUsedModelRef.current = null;
    lastUsedAccountRef.current = null;
    qwenParentIdRef.current = undefined;
    userRequestCountRef.current = 0;
    setCurrentConversationId('');
    setMessages([]);
    setIsProcessingSync(false);
    setIsContinuingSync(false);
    dispatchStreaming({ type: 'STOP_ALL' });
    setConversationToolOverrides({});

    // Clear sessionStorage
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach((key) => {
        if (key.startsWith('zen-backend-conv:') || key.startsWith('zen-revert-parent:')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (err) {
      console.warn('[useChatLLM] Failed to clear sessionStorage:', err);
    }
  }, [setIsProcessingSync, setIsContinuingSync, dispatchStreaming]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (isProcessingRef.current && messagesRef.current.length <= 2) {
      const chatId = currentConversationIdRef.current;
      if (chatId) {
        deleteConversation(chatId);
        setCurrentConversationId('');
        setMessages([]);
        userRequestCountRef.current = 0;
      }
    }

    dispatchStreaming({ type: 'STOP_ALL' });

    extensionService.postMessage({
      command: 'stopCommand',
      actionId: 'all',
      kill: true,
    });
  }, [dispatchStreaming]);

  const sendMessage = useCallback(
    async (
      content: string,
      files?: any[],
      model?: any,
      account?: any,
      skipFirstRequestLogic?: boolean,
      actionIds?: string[],
      uiHidden?: boolean,
      parentMessageId?: string,
      extraOptions?: {
        user_action?: string;
        edit_message_id?: string;
        parent_message_id?: string;
      },
    ) => {
      if (isProcessingRef.current && !skipFirstRequestLogic) {
        return;
      }

      // ── Time Block Check (DeepSeek) ────────────────────────────────────
      const timeBlockProviderId = model?.providerId ?? lastUsedModelRef.current?.providerId;
      if (
        !skipFirstRequestLogic &&
        isDeepSeekProvider(timeBlockProviderId) &&
        isBlockedNow(providerBlockedRanges)
      ) {
        const rangeLabel = getBlockedRangeLabel(providerBlockedRanges);
        const allRanges = getBlockedHoursDescription(providerBlockedRanges);
        const errorMsg =
          `DeepSeek bị chặn trong khung giờ ${allRanges}. ` +
          `Hiện tại đang trong khung ${rangeLabel}. Vui lòng thử lại sau.`;

        const convIdToDelete = currentConversationIdRef.current;
        if (convIdToDelete) {
          deleteConversation(convIdToDelete);
          extensionService.postMessage({
            command: 'deleteConversation',
            conversationId: convIdToDelete,
            requestId: `time-block-${Date.now()}`,
          });
          currentConversationIdRef.current = '';
          backendConversationIdRef.current = '';
          messagesRef.current = [];
          setCurrentConversationId('');
          setMessages([]);
        }

        const blockErrorMessage: Message = {
          id: `msg-${Date.now()}-time-block-error`,
          role: 'assistant',
          content: errorMsg,
          timestamp: Date.now(),
          isError: true,
        };
        setMessages([blockErrorMessage]);
        messagesRef.current = [blockErrorMessage];
        onTurnCompleteRef.current?.();
        return;
      }
      // ────────────────────────────────────────────────────────────────────

      const sessionId = selectedTab?.sessionId || -1;
      const folderPath = selectedTab?.folderPath || null;

      // Filter cancelled messages
      const currentMessages = messagesRef.current;
      let filteredMessages = currentMessages.filter((m) => !m.isCancelled);

      // For Qwen edit/regenerate: trim UI messages so only history up to (and including)
      // the edited user message is kept. Qwen handles server-side deletion of children.
      if (extraOptions?.user_action === 'edit' && extraOptions.edit_message_id) {
        const editFid = extraOptions.edit_message_id;
        const editIdx = filteredMessages.findIndex(
          (m) => m.role === 'user' && m.providerFid === editFid,
        );

        if (editIdx !== -1) {
          filteredMessages = filteredMessages.slice(0, editIdx + 1);
          messagesRef.current = filteredMessages;
          setMessages(filteredMessages);
        }
      }

      // Check if last message pair is complete; clean up incomplete pairs before sending
      const isEditFlow = extraOptions?.user_action === 'edit';
      if (!skipFirstRequestLogic && !isEditFlow && filteredMessages.length > 0) {
        const lastMsg = filteredMessages[filteredMessages.length - 1];

        if (lastMsg.role === 'user') {
          // Last message is a user request without assistant response → remove it
          filteredMessages = filteredMessages.slice(0, -1);
          messagesRef.current = filteredMessages;
          setMessages(filteredMessages);
        } else if (lastMsg.role === 'assistant' && lastMsg.isError) {
          // Last message is an error assistant → remove both the error + preceding user request
          filteredMessages = filteredMessages.slice(0, -2);
          messagesRef.current = filteredMessages;
          setMessages(filteredMessages);
        }
        // If last message is assistant (success) → pair is complete, proceed normally
      }

      let effectiveChatUuid = currentConversationIdRef.current;
      const isNewSession = !effectiveChatUuid;

      // Guard: tool results must never create new session
      if (skipFirstRequestLogic && isNewSession) {
        return;
      }

      if (isNewSession) {
        effectiveChatUuid = crypto.randomUUID?.() || Date.now().toString();
        currentConversationIdRef.current = effectiveChatUuid;
        setCurrentConversationId(effectiveChatUuid);
        backendConversationIdRef.current = '';

        if (model) lastUsedModelRef.current = model;
        if (account) lastUsedAccountRef.current = account;
        setConversationToolOverrides({});
      }

      const isReq1 = filteredMessages.length === 0 && !skipFirstRequestLogic;

      // Increment user request counter
      if (!skipFirstRequestLogic) {
        userRequestCountRef.current += 1;
      }

      // Build traffic context for emulate feature
      let trafficContext: string | undefined;
      if (feature === 'emulate') {
        try {
          const summary = EmulateController.getInstance().getTrafficSummary();
          const isEmpty =
            summary.hosts.length === 0 &&
            summary.methods.length === 0 &&
            summary.statuses.length === 0 &&
            summary.types.length === 0;

          trafficContext = isEmpty ? buildEmptyTrafficContext() : buildTrafficContext(summary);
        } catch (err) {
          trafficContext = undefined;
        }
      }

      // Build filter context for emulate feature
      let filterContext: string | undefined;
      if (feature === 'emulate') {
        try {
          const ctrl = EmulateController.getInstance();
          const filter = ctrl.getFilter();
          if (filter) {
            filterContext = buildFilterContext(ctrl.getFilterText());
          } else {
            filterContext = buildEmptyFilterContext();
          }
        } catch (err) {
          filterContext = undefined;
        }
      }

      // Calculate effective settings with per-conversation overrides taking priority.
      // Since Phantoma's SettingsContext does not yet expose global toggles for Skill/Memory,
      // we default to false if no explicit override is provided in the current conversation.
      const effectiveUseSkill = conversationOverridesRef.current?.useSkillEnabled ?? false;

      const effectiveMemory = conversationOverridesRef.current?.memoryEnabled ?? false;

      const effectiveToolFormat = conversationOverridesRef.current?.toolFormat ?? 'xml';

      // [DEBUG] Log effective settings for verification
      console.log('[Phantoma][ChatLLM] Effective Settings:', {
        useSkill: effectiveUseSkill,
        memory: effectiveMemory,
        toolFormat: effectiveToolFormat,
        promptLengthMode,
        rawOverrides: conversationOverridesRef.current,
      });

      // Determine model/account before building prompt to resolve providerId correctly
      const oldModel = lastUsedModelRef.current;
      const oldAccount = lastUsedAccountRef.current;
      let finalModel = model || oldModel;
      let finalAccount = account || oldAccount;

      if (!finalModel && !oldModel) {
        const lastMetadataMsg = [...filteredMessages]
          .reverse()
          .find((m) => m.role === 'assistant' && m.providerId && m.modelId);
        if (lastMetadataMsg) {
          finalModel = {
            id: lastMetadataMsg.modelId!,
            providerId: lastMetadataMsg.providerId!,
          };
        }
      }

      if (!finalAccount && !oldAccount) {
        const lastMetadataMsg = [...filteredMessages]
          .reverse()
          .find((m) => m.role === 'assistant' && m.accountId);
        if (lastMetadataMsg?.accountId) {
          finalAccount = { id: lastMetadataMsg.accountId };
        }
      }

      if (finalModel) lastUsedModelRef.current = finalModel;
      if (finalAccount) lastUsedAccountRef.current = finalAccount;

      const modelSwitched =
        !skipFirstRequestLogic &&
        oldModel &&
        finalModel &&
        (oldModel.id !== finalModel.id || oldModel.providerId !== finalModel.providerId);
      const accountSwitched =
        !skipFirstRequestLogic && oldAccount && finalAccount && oldAccount.id !== finalAccount.id;

      if (modelSwitched || accountSwitched) {
        console.warn(`[Zen] Model/account switched — resetting backend conversationId`);
        backendConversationIdRef.current = '';
        qwenParentIdRef.current = undefined;
        try {
          sessionStorage.removeItem(`zen-backend-conv:${effectiveChatUuid}`);
        } catch {
          console.warn('[useChatLLM] Failed to remove backend conversation from sessionStorage');
        }
      }

      // Build prompt using PromptBuilder with per-conversation overrides applied
      const promptProviderId = finalModel?.providerId ?? lastUsedModelRef.current?.providerId;

      const promptPayload = await PromptBuilder.buildPrompt({
        content,
        isReq1,
        skipFirstRequestLogic: skipFirstRequestLogic || false,
        aiLanguage,
        treeView,
        workspace,
        files,
        userRequestCount: userRequestCountRef.current,
        feature: feature as AgentFeature,
        trafficContext,
        filterContext,
        useSkillEnabled: effectiveUseSkill,
        memoryEnabled: effectiveMemory,
        toolFormat: effectiveToolFormat,
        providerId: promptProviderId,
        promptLengthMode,
      });

      const userMessage: Message = {
        id: `msg-${Date.now()}-${skipFirstRequestLogic ? 'tool' : 'user'}`,
        role: 'user',
        content: promptPayload,
        timestamp: Date.now(),
        token_usage: calculateTokens(promptPayload),
        actionIds: actionIds,
        uiHidden: uiHidden,
        conversationId: backendConversationIdRef.current || undefined,
        uploadedFiles: files
          ?.filter((f: any) => f.type?.startsWith('image/') || f.file_id)
          .map((f: any) => ({
            id: f.id,
            name: f.name,
            size: f.size,
            type: f.type,
            content: f.content,
            file_id: f.file_id,
          })),
        attachedItems: files
          ?.filter(
            (f: any) =>
              f.type === 'file' ||
              f.type === 'folder' ||
              f.type === 'external' ||
              f.type === 'text-snippet',
          )
          .map((f: any) => ({
            id: f.id,
            path: f.path,
            type: f.type,
            content: f.content,
            lineCount: f.lineCount,
          })),
      };

      const updatedMessages = [...filteredMessages, userMessage];

      // Parse question answers
      const parsedAnswers = parseQuestionAnswerTag(content);
      if (parsedAnswers) {
        for (let i = updatedMessages.length - 2; i >= 0; i--) {
          const msg = updatedMessages[i];
          if (msg.role === 'assistant') {
            const effectiveToolFormat = conversationOverridesRef.current?.toolFormat ?? 'xml';
            const parsed = parseAIResponse(msg.content, effectiveToolFormat, feature);
            if (
              parsed.question &&
              parsed.question.type === 'question' &&
              'questions' in parsed.question &&
              parsed.question.questions &&
              parsed.question.questions.length > 0
            ) {
              updatedMessages[i] = {
                ...msg,
                questionAnswers: parsedAnswers,
              };
              break;
            }
          }
        }
      }

      setMessages(updatedMessages);
      setIsProcessingSync(true);

      saveConversation(
        sessionId,
        folderPath,
        updatedMessages,
        effectiveChatUuid,
        false,
        backendConversationIdRef.current,
        undefined,
        undefined,
        undefined,
        conversationOverridesRef.current,
      );

      try {
        const ref_file_ids: string[] = [];
        const localFiles = files
          ? files.filter(
              (f: any) =>
                !f.id?.startsWith('attached-') &&
                !f.id?.startsWith('rule-') &&
                !f.id?.startsWith('terminal-') &&
                !f.id?.startsWith('snippet-') &&
                !f.id?.startsWith('external-'),
            )
          : [];

        if (localFiles.length > 0) {
          if (!finalAccount?.id) {
            throw new Error('No active account selected for file upload');
          }
          const uploadedIds = await uploadFiles(localFiles, finalAccount.id);
          ref_file_ids.push(...uploadedIds);
        }

        // [DEBUG] Thêm file_id từ screenshot nếu có
        const screenshotFileId = getLastScreenshotFileId();
        if (screenshotFileId && !ref_file_ids.includes(screenshotFileId)) {
          ref_file_ids.push(screenshotFileId);
          clearLastScreenshotFileId();
        }

        let payloadMessages = updatedMessages
          .filter((m) => !m.isError)
          .map((m) => ({
            role: m.role,
            content: m.content,
          }));

        const effectiveParentMessageId = qwenParentIdRef.current ?? parentMessageId;

        const convIdToSend =
          backendConversationIdRef.current ||
          (effectiveChatUuid
            ? sessionStorage.getItem(`zen-backend-conv:${effectiveChatUuid}`) || undefined
            : undefined);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        dispatchStreaming({ type: 'SET_STREAMING', payload: true });

        updatedMessages[updatedMessages.length - 1].rawRequest = userMessage.content;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMessage.id ? { ...m, rawRequest: userMessage.content } : m,
          ),
        );

        // For Qwen regenerate support: save the fid and parentId used for this message
        // so that handleRegenerateRequest can pass them back as edit_message_id / parent_message_id.
        const isQwenProvider = (finalModel?.providerId ?? '').toLowerCase() === 'qwen';
        // Pre-generate fid for Qwen messages (both normal chat and edit).
        // This fid is passed to the provider so the server stores the exact same UUID,
        // allowing us to reference it later for regenerate/edit.
        const qwenMessageFid =
          isQwenProvider && !skipFirstRequestLogic ? crypto.randomUUID() : undefined;

        if (qwenMessageFid) {
          userMessage.providerFid = qwenMessageFid;
          userMessage.providerParentId = effectiveParentMessageId ?? undefined;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === userMessage.id
                ? {
                    ...m,
                    providerFid: qwenMessageFid,
                    providerParentId: effectiveParentMessageId ?? undefined,
                  }
                : m,
            ),
          );
        }

        // Create placeholder assistant message
        const assistantMessageId = `msg-${Date.now()}-assistant`;
        const placeholderAssistant: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, placeholderAssistant]);

        // Stream the response using StreamingService
        const { message: assistantMessage, backendConversationId } =
          await StreamingService.streamChat(
            {
              apiUrl,
              model: finalModel,
              account: finalAccount,
              messages: payloadMessages,
              conversationId: convIdToSend,
              parentMessageId: effectiveParentMessageId,
              refFileIds: ref_file_ids,
              abortSignal: abortController.signal,
              // Pass the pre-generated fid so the provider stores the exact UUID we saved.
              ...(qwenMessageFid ? { messageFid: qwenMessageFid } : {}),
              ...(extraOptions?.user_action ? { userAction: extraOptions.user_action } : {}),
              ...(extraOptions?.edit_message_id
                ? { editMessageId: extraOptions.edit_message_id }
                : {}),
            },
            {
              onMetadata: (meta) => {
                if (meta.parent_id) {
                  qwenParentIdRef.current = meta.parent_id;
                }

                if (meta.providerId || meta.modelId) {
                  const serverModelId = meta.modelId || lastUsedModelRef.current?.id;
                  const serverProviderId = meta.providerId || lastUsedModelRef.current?.providerId;
                  const sentModelId = finalModel?.id;
                  const sentProviderId = finalModel?.providerId;

                  if (
                    !lastUsedModelRef.current ||
                    (serverModelId === sentModelId && serverProviderId === sentProviderId)
                  ) {
                    lastUsedModelRef.current = {
                      id: serverModelId,
                      providerId: serverProviderId,
                    };
                  }
                }

                if (meta.accountId) {
                  lastUsedAccountRef.current = { id: meta.accountId };
                }
              },
              onContinuing: (isContinuing) => {
                setIsContinuingSync(isContinuing);
              },
              // PERF: Khong goi setMessages trong streaming nua
              // Thay vao do chi tich luy vao ref, ProcessingIndicator tu hien thi timer
              // Tranh 130+ lan re-render toan bo UI moi khi stream
              onRawContent: (_content) => {
                // PERF: Khong goi setMessages trong streaming nua
                // Thay vao do chi tich luy vao ref, ProcessingIndicator tu hien thi timer
                // Tranh 130+ lan re-render toan bo UI moi khi stream
              },
              onContent: (content) => {
                // Update UI with parsed content (called ONCE at the end with full content)
                setMessages((prev) => {
                  const targetIndex = prev.findIndex((m) => m.id === assistantMessageId);
                  if (targetIndex === -1) return prev;

                  const currentMessage = prev[targetIndex];

                  // Replace content and clear thinking
                  const updatedMessage = {
                    ...currentMessage,
                    content: content,
                    thinking: undefined,
                  };
                  const newArray = prev.slice();
                  newArray[targetIndex] = updatedMessage;
                  return newArray;
                });
              },
            },
          );

        assistantMessage.id = assistantMessageId;

        if (backendConversationId) {
          backendConversationIdRef.current = backendConversationId;
          try {
            sessionStorage.setItem(`zen-backend-conv:${effectiveChatUuid}`, backendConversationId);
          } catch {
            console.warn('[useChatLLM] Failed to save backend conversation to sessionStorage');
          }
        }

        try {
          const userMsgToLog = updatedMessages[updatedMessages.length - 1];
          const finalConversationId = backendConversationId || backendConversationIdRef.current;

          userMsgToLog.providerId = assistantMessage.providerId || finalModel?.providerId;
          userMsgToLog.modelId = assistantMessage.modelId || finalModel?.id;
          userMsgToLog.accountId = assistantMessage.accountId || finalAccount?.id;
          if (assistantMessage.websiteUrl) userMsgToLog.websiteUrl = assistantMessage.websiteUrl;
          if (assistantMessage.email) userMsgToLog.email = assistantMessage.email;

          assistantMessage.providerId = userMsgToLog.providerId;
          assistantMessage.modelId = userMsgToLog.modelId;
          assistantMessage.accountId = userMsgToLog.accountId;
          if (userMsgToLog.websiteUrl) assistantMessage.websiteUrl = userMsgToLog.websiteUrl;
          if (userMsgToLog.email) assistantMessage.email = userMsgToLog.email;

          logChatToWorkspace(effectiveChatUuid, {
            ...userMsgToLog,
            conversationId: finalConversationId,
          });

          logChatToWorkspace(effectiveChatUuid, {
            ...assistantMessage,
            conversationId: finalConversationId,
          });
        } catch (logErr) {
          console.warn('[useChatLLM] Failed to log chat to workspace:', logErr);
        }

        setMessages([...updatedMessages, assistantMessage]);
        setIsProcessingSync(false);
        dispatchStreaming({ type: 'RESET_STREAMING' });
        abortControllerRef.current = null;

        // Parse response to extract tool sequence with error handling
        const { parseAIResponse } = await import('../../services/ResponseParser');
        let parsed: any = null;
        let hasParsingError = false;

        try {
          // 🔧 FIX: Parse rawResponse (includes thinking) instead of content
          const contentToParse = assistantMessage.rawResponse || assistantMessage.content;

          const effectiveToolFormat = conversationOverridesRef.current?.toolFormat ?? 'xml';
          parsed = parseAIResponse(contentToParse, effectiveToolFormat, feature);

          // Attach parsed data to assistantMessage
          assistantMessage.parsed = parsed;

          // 📊 Create parseDebugInfo with detailed action parsing info
          const parseDebugActions = parsed.actions.map((action: any, index: number) => {
            // Check if action has error markers
            const hasError = action.isError || action.errorMessage;
            const status = hasError ? 'error' : 'success';

            // Extract parameter info for debugging
            const extractedParams = Object.entries(action.params).map(([name, value]) => ({
              name,
              found: value !== undefined && value !== null && value !== '',
              length: typeof value === 'string' ? value.length : undefined,
            }));

            return {
              index,
              type: action.type,
              params: action.params,
              status,
              errorMessage: action.errorMessage,
              errorCode: action.errorCode,
              extractedParams,
            };
          });

          const successfulActions = parseDebugActions.filter(
            (a: any) => a.status === 'success',
          ).length;
          const failedActions = parseDebugActions.filter((a: any) => a.status === 'error').length;

          // Count content blocks by type for debugging
          const contentBlockStats = parsed.contentBlocks.reduce((acc: any, block: any) => {
            acc[block.type] = (acc[block.type] || 0) + 1;
            return acc;
          }, {});

          assistantMessage.parseDebugInfo = {
            totalActions: parsed.actions.length,
            successfulActions,
            failedActions,
            actions: parseDebugActions,
            contentBlocks: parsed.contentBlocks.map((block: any, index: number) => ({
              index,
              type: block.type,
              contentLength: block.content?.length || 0,
              language: block.language,
              actionIndex: block.actionIndex,
            })),
            contentBlockStats,
          };

          // Update React state with the parsed data and debug info
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    parsed: assistantMessage.parsed,
                    parseDebugInfo: assistantMessage.parseDebugInfo,
                  }
                : m,
            ),
          );
        } catch (parseError) {
          hasParsingError = true;
          const errorDetails =
            parseError instanceof Error ? parseError.message : 'Unknown parsing error';

          // Create error message with details
          const errorContent = `Error: Failed to parse response\n\nDetails: ${errorDetails}\n\n**Note:** The response was received but could not be displayed due to malformed content. This usually happens when tool calls are missing closing tags.\n\nYou can try:\n- Regenerating the response\n- Asking the assistant to fix the issue`;

          // Update the assistant message to error state
          assistantMessage.content = errorContent;
          assistantMessage.isError = true;

          // 📊 Create parseDebugInfo for parse errors
          assistantMessage.parseDebugInfo = {
            totalActions: 0,
            successfulActions: 0,
            failedActions: 0,
            actions: [],
            parseError: {
              message: errorDetails,
              rawContent: assistantMessage.content?.substring(0, 500) || '(empty)',
            },
          };

          // Update messages array with error state
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: errorContent,
                    isError: true,
                    parseDebugInfo: assistantMessage.parseDebugInfo,
                  }
                : m,
            ),
          );
        }

        saveConversation(
          sessionId,
          folderPath,
          [...updatedMessages, assistantMessage],
          effectiveChatUuid,
          false,
          backendConversationId || backendConversationIdRef.current,
          undefined,
          undefined,
          undefined,
          conversationOverridesRef.current,
        );

        // 🚨 DETECT ONLY-THINKING RESPONSE
        if (!hasParsingError && parsed && parsed.onlyThinkingDetected) {
          console.warn(
            '[Phantoma][sendMessage] ⚠️ Only-thinking response detected - skipping tool execution',
          );
          onTurnCompleteRef.current?.();
          return;
        }

        if (!hasParsingError && parsed && onMalformedTool) {
          parsed.actions.forEach((action: any, index: number) => {
            if (action.isError) {
              onMalformedTool(
                `${assistantMessageId}-action-${index}`,
                action.type,
                action.errorMessage ?? '',
                action.errorCode ?? '',
              );
            }
          });
        }

        if (!hasParsingError && parsed && onToolRequest && parsed.actions?.length > 0) {
          onToolRequest(parsed.actions, assistantMessage, false, TOOL_ACTION_TYPES.ACCEPT);
        } else {
          // Notify turn complete if no tools were executed or parsing failed
          onTurnCompleteRef.current?.();
        }
      } catch (error) {
        dispatchStreaming({ type: 'RESET_STREAMING' });
        abortControllerRef.current = null;

        if (error instanceof Error && error.name === 'AbortError') {
          setIsProcessingSync(false);
          onTurnCompleteRef.current?.();
          return;
        }

        // Fallback: notify turn complete on unexpected errors
        onTurnCompleteRef.current?.();

        console.error('[Zen sendMessage] error:', error);
        const errorMessage: Message = {
          id: `msg-${Date.now()}-error`,
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
          timestamp: Date.now(),
          isError: true,
        };

        const messagesWithError = [
          ...messagesRef.current.filter((m) => !m.isCancelled),
          errorMessage,
        ];
        setMessages(messagesWithError);
        messagesRef.current = messagesWithError;

        if (effectiveChatUuid) {
          try {
            saveConversation(
              sessionId,
              folderPath,
              messagesWithError,
              effectiveChatUuid,
              false,
              backendConversationIdRef.current,
              undefined,
              undefined,
              undefined,
              conversationOverridesRef.current,
            );
          } catch (saveErr) {
            console.warn('[useChatLLM] Failed to save conversation:', saveErr);
          }
        }

        setIsProcessingSync(false);
      }
    },
    [
      apiUrl,
      selectedTab,
      aiLanguage,
      treeView,
      workspace,
      uploadFiles,
      setIsProcessingSync,
      setIsContinuingSync,
      dispatchStreaming,
      providerBlockedRanges,
      onTurnCompleteRef,
    ],
  );

  const handleSelectOption = useCallback(
    (messageId: string, option: string) => {
      if (isProcessingRef.current) {
        console.warn(
          `[Zen][handleSelectOption] BLOCKED - already processing, skipping option selection`,
        );
        return;
      }

      setMessages((currentMessages) => {
        let updatedMessages = currentMessages.map((m) =>
          m.id === messageId ? { ...m, selectedOption: option } : m,
        );

        let parsedPayload: {
          allAnswered?: boolean;
          answers?: Record<string, any>;
          questions?: any[];
        } | null = null;

        try {
          const parsed = JSON.parse(option);
          if (parsed.allAnswered === true && parsed.answers) {
            parsedPayload = parsed;
            updatedMessages = currentMessages.map((m) =>
              m.id === messageId ? { ...m, selectedOption: option } : m,
            );
          }
        } catch (e) {
          console.warn('[useChatLLM] Failed to parse option:', e);
        }

        let convId = currentConversationIdRef.current;
        if (!convId) {
          convId = crypto.randomUUID?.() || Date.now().toString();
          currentConversationIdRef.current = convId;
          setCurrentConversationId(convId);
        }

        const sessionId = selectedTab?.sessionId || -1;
        const folderPath = selectedTab?.folderPath || null;

        saveConversation(
          sessionId,
          folderPath,
          updatedMessages,
          convId,
          true,
          backendConversationIdRef.current,
          undefined,
          undefined,
          undefined,
          conversationOverridesRef.current,
        );

        if (parsedPayload && parsedPayload.answers) {
          if (isProcessingRef.current) {
            return updatedMessages;
          }

          setTimeout(() => {
            if (isProcessingRef.current) {
              console.warn(`[Zen][handleSelectOption] Timeout guard: still processing, canceling`);
              return;
            }

            const questions = parsedPayload.questions || [];
            const answers = parsedPayload.answers || {};

            const formattedAnswers = questions
              .map((question: any, index: number) => {
                const qId = question.id;
                const answer = answers[qId];
                const number = index + 1;

                if (!answer || !answer.value) {
                  return `${number}. No answer`;
                }

                const value = Array.isArray(answer.value)
                  ? answer.value.join(', ')
                  : String(answer.value);
                return `${number}. ${qId}: ${value}`;
              })
              .join('\n');

            const promptText = `<question-answer>\n${formattedAnswers}\n</question-answer>`;
            sendMessage(promptText, undefined, undefined, undefined, true, undefined, true);
          }, 100);
        }

        return updatedMessages;
      });
    },
    [selectedTab, sendMessage],
  );

  const returnValue = useMemo(
    () => ({
      messages,
      setMessages,
      messagesRef,
      isProcessing: streamingState.isProcessing,
      setIsProcessing: setIsProcessingSync,
      isStreaming: streamingState.isStreaming,
      isContinuing: streamingState.isContinuing,
      currentConversationId,
      setCurrentConversationId,
      currentConversationIdRef,
      sendMessage,
      stopGeneration,
      resetSession,
      isProcessingRef,
      setBackendConversationId: (
        id: string,
        meta?: { providerId?: string; modelId?: string; accountId?: string },
      ) => {
        backendConversationIdRef.current = id;
        if (meta) {
          if (meta.providerId && meta.modelId) {
            lastUsedModelRef.current = {
              id: meta.modelId,
              providerId: meta.providerId,
            };
          }
          if (meta.accountId) {
            lastUsedAccountRef.current = { id: meta.accountId };
          }
        }
      },
      conversationToolOverrides,
      setConversationToolOverrides,
      handleSelectOption,
    }),
    [
      messages,
      streamingState,
      currentConversationId,
      sendMessage,
      stopGeneration,
      resetSession,
      setIsProcessingSync,
      conversationToolOverrides,
      handleSelectOption,
    ],
  );

  return returnValue;
};
