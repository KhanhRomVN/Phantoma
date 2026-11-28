import { useState, useRef, useCallback, useEffect } from 'react';
/**
 * ------------------------------------------------------------------
 * useToolExecution
 * ------------------------------------------------------------------
 * Hook thực thi tool actions với permission check và quản lý state.
 * Xử lý execute, approve, reject, và auto-trigger cho mọi tool.
 *
 * Main features:
 * - Thực thi tool với permission decision
 * - Quản lý tool outputs và terminal status
 * - Xử lý single-line review actions
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────────
// ── Types ──
import { Message } from '../../types/message.types';
import { parseAIResponse } from '../../processing/parsers/response/response.parser';
import type { ToolFormatId } from '../../types/tool_format.types';

import type { ExecutorContext } from '../../types/executor.types';
import { DISPLAY_ONLY_RESULT } from '../../constants/tool_execution';

// ── Context ──

import { useAgentFeature } from '../../../../context/FeatureContext';

// ── Services ──
import { getModuleIdFromContext } from '../../services/conversation_context.service';

// ── Utils ──
import { needsSingleLineReview, extractFilePath } from '../../registries/tool_mutation.registry';
import { checkToolDanger, transformToolOutput } from '../../registries/tool_behavior.registry';

// ── Utils ──
import { buildUnparsedSegmentsWarning } from '../../processing/validators/response.validator';
import { formatToolOutput } from '../../registries/tool_output.registry';
import { isStreamingTool } from '../../registries/tool_streaming.registry';

// ── Constants ──
import { getToolTimeout } from '../../registries/tag.registry';
import { EXECUTION_STATUS } from '../../constants/tool_execution';

// ── Services ──
import { getExecutor } from '../../registries/module.registry';
import {
  TERMINAL_STATUS,
  TOOL_ACTION_TYPES,
} from '@renderer/components/Widgets/Zen/shared/types/tool-constants';
import {
  extensionService,
  messageDispatcher,
} from '@renderer/components/Widgets/Zen/shared/services/ExtensionService';

// ─── Types ──────────────────────────────────────────────────────────────
interface UseToolExecutionProps {
  sendMessage: (
    content: string,
    files?: any[],
    model?: any,
    account?: any,
    skipFirstRequestLogic?: boolean,
    actionIds?: string[],
    uiHidden?: boolean,
  ) => Promise<void>;
  conversationIdRef?: React.MutableRefObject<string>;
  messagesRef?: React.MutableRefObject<Message[]>;
  /** When true, all pending auto-flush sends are suppressed (set by stop button) */
  isStoppedRef?: React.MutableRefObject<boolean>;
  toolFormat?: ToolFormatId;
  /** Session ID for computing moduleId (required for conversation_title) */
  workflowAgentId?: string | null;
  sessionId?: number;
  /** Folder path for computing moduleId (required for conversation_title) */
  folderPath?: string | null;
}

export const useToolExecution = ({
  sendMessage,
  conversationIdRef,
  messagesRef,
  isStoppedRef,
  toolFormat = 'xml',
  workflowAgentId,
  sessionId,
  folderPath,
}: UseToolExecutionProps) => {
  const { emulateState, activeFeature } = useAgentFeature();

  const [executionState, setExecutionState] = useState<{
    total: number;
    completed: number;
    status: (typeof EXECUTION_STATUS)[keyof typeof EXECUTION_STATUS];
  }>({ total: 0, completed: 0, status: EXECUTION_STATUS.IDLE });

  const [toolOutputs, setToolOutputs] = useState<
    Record<
      string,
      {
        output: string;
        isError: boolean;
        terminalId?: string;
      }
    >
  >({});

  const [terminalStatus, setTerminalStatus] = useState<
    Record<string, (typeof TERMINAL_STATUS)[keyof typeof TERMINAL_STATUS]>
  >({});

  const [clickedActions, setClickedActions] = useState<Set<string>>(new Set());
  const [, setRejectedActions] = useState<Set<string>>(new Set());

  const [singleLineReviewActions, setSingleLineReviewActions] = useState<
    Record<string, { action: any; actionId: string; messageId: string; messageObj: Message }>
  >({});

  const clickedActionsRef = useRef<Set<string>>(new Set());
  // actionId của các dangerous command đã được user approve — bỏ qua warning ở lần execute
  const approvedDangerousRef = useRef<Set<string>>(new Set());
  const pendingToolResolvers = useRef<Map<string, (result: string | null) => void>>(new Map());
  const commandStartTimes = useRef<Map<string, number>>(new Map());
  const earlyCommandResults = useRef<Map<string, any>>(new Map());
  const handleSendMessageRef = useRef(sendMessage);

  const toolResultsBufferRef = useRef<Record<string, string[]>>({});

  const terminalToActionMap = useRef<Map<string, string>>(new Map());
  const actionToToolTypeMap = useRef<Map<string, string>>(new Map());
  const flushedMessageIdsRef = useRef<Set<string>>(new Set());
  const partialFlushedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    handleSendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    clickedActionsRef.current = clickedActions;
  }, [clickedActions]);

  // Gộp kết quả mới vào buffer của message; chỉ gửi follow-up khi mọi action (và question) đã hoàn tất.
  const flushWhenMessageComplete = useCallback(
    (
      messageObj: { id: string; content: string },
      newResults: string[],
      options: { completedActionId?: string; includeUnparsedWarning?: boolean } = {},
    ) => {
      const messageId = messageObj.id;
      const buffer = [...(toolResultsBufferRef.current[messageId] || []), ...newResults];

      const parsed = parseAIResponse(messageObj.content, toolFormat, activeFeature);
      const allActionIds = parsed.actions.map(
        (_: any, idx: number) => `${messageId}-action-${idx}`,
      );
      const currentMessage = messagesRef?.current.find((m) => m.id === messageId);
      const selectedOption = currentMessage?.selectedOption;
      const isQuestionAnswered = parsed.question ? !!selectedOption : true;

      const isAllComplete =
        allActionIds.every(
          (id: string) => clickedActionsRef.current.has(id) || id === options.completedActionId,
        ) && isQuestionAnswered;

      if (isAllComplete && !flushedMessageIdsRef.current.has(messageId)) {
        if (handleSendMessageRef.current && !isStoppedRef?.current) {
          flushedMessageIdsRef.current.add(messageId);
          let finalContent = buffer.join('\n\n');
          if (selectedOption) {
            const questionTitle =
              parsed.question?.type === 'question' ? (parsed.question as any).title : 'Question';
            finalContent = `[question: "${questionTitle || 'Question'}"] Answer: ${selectedOption}\n\n${finalContent}`;
          }

          if (options.includeUnparsedWarning) {
            const unparsedWarning = buildUnparsedSegmentsWarning(parsed);
            if (unparsedWarning) {
              finalContent = `${finalContent}\n\n${unparsedWarning}`;
            }
          }

          handleSendMessageRef.current(
            finalContent,
            undefined,
            undefined,
            undefined,
            true,
            allActionIds,
            true,
          );
        }
        toolResultsBufferRef.current[messageId] = [];
      } else if (flushedMessageIdsRef.current.has(messageId)) {
        toolResultsBufferRef.current[messageId] = [];
      } else {
        toolResultsBufferRef.current[messageId] = buffer;
      }
    },
    [messagesRef, isStoppedRef, toolFormat, activeFeature],
  );

  // Listen for tool execution events from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.command === 'commandExecuted') {
        if (message.actionId) {
          setToolOutputs((prev) => {
            const existing = prev[message.actionId];
            let finalOutput = message.output || '';
            if (existing?.output && existing.output.length > finalOutput.length) {
              finalOutput = existing.output;
            }
            return {
              ...prev,
              [message.actionId]: {
                output: finalOutput,
                isError: !!message.error,
                terminalId: message.terminalId,
              },
            };
          });

          if (pendingToolResolvers.current.has(message.actionId)) {
            const resolver = pendingToolResolvers.current.get(message.actionId)!;
            if (message.terminalId) {
              terminalToActionMap.current.delete(message.terminalId);
              extensionService.postMessage({
                command: 'removeTerminal',
                terminalId: message.terminalId,
              });
            }
            commandStartTimes.current.delete(message.actionId);
            const cmdText = message.commandText || message.commandTextRaw || 'command';
            const outputContent = (message.output || '').trim();
            const toolType = actionToToolTypeMap.current.get(message.actionId) || 'unknown';
            const resultMsg = formatToolOutput({
              toolType,
              commandText: cmdText,
              output: outputContent,
              error: message.error,
            });
            actionToToolTypeMap.current.delete(message.actionId);
            resolver(resultMsg);
            pendingToolResolvers.current.delete(message.actionId);
          } else {
            earlyCommandResults.current.set(message.actionId, message);
          }
        }
      } else if (message.command === 'terminalOutput') {
        const actionId = terminalToActionMap.current.get(message.terminalId);
        if (actionId) {
          setToolOutputs((prev) => {
            const existing = prev[actionId] || { output: '', isError: false };
            return {
              ...prev,
              [actionId]: {
                ...existing,
                output: existing.output + message.data,
                terminalId: message.terminalId,
              },
            };
          });
        }
      } else if (message.command === 'terminalFinished') {
        setTerminalStatus((prev) => {
          const { [message.terminalId]: _finished, ...rest } = prev;
          return rest;
        });
      } else if (message.command === 'restoreSingleLineReviewActions') {
        if (message.actions && Object.keys(message.actions).length > 0) {
          setSingleLineReviewActions(message.actions);
        }
      } else if (message.command === 'runCommandResult') {
        if (message.terminalId && message.actionId) {
          terminalToActionMap.current.set(message.terminalId, message.actionId);
          setToolOutputs((prev) => ({
            ...prev,
            [message.actionId]: {
              ...(prev[message.actionId] || { output: '', isError: false }),
              terminalId: message.terminalId,
            },
          }));
          setTerminalStatus((prev) => ({
            ...prev,
            [message.terminalId]: TERMINAL_STATUS.RUNNING,
          }));
        }
      } else if (message.command === 'gitStatusResult') {
        if (message.actionId && message.output !== undefined) {
          setToolOutputs((prev) => ({
            ...prev,
            [message.actionId]: {
              output: message.output || '',
              isError: !!message.error,
            },
          }));
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Build executor context for tool execution
  const buildExecutorContext = useCallback(
    (responseNumber?: number): ExecutorContext => {
      const moduleId =
        sessionId !== undefined && folderPath !== undefined
          ? getModuleIdFromContext(sessionId, folderPath)
          : undefined;

      return {
        setToolOutputs,
        conversationIdRef,
        getToolTimeout,
        extensionService,
        messageDispatcher,
        pendingToolResolvers: pendingToolResolvers.current,
        commandStartTimes: commandStartTimes.current,
        earlyCommandResults: earlyCommandResults.current,
        responseNumber,
        activeTargetId: emulateState.activeTargetId,
        moduleId,
        folderPath: folderPath ?? null,
        workflowAgentId: workflowAgentId ?? null,
      };
    },
    [
      setToolOutputs,
      conversationIdRef,
      emulateState.activeTargetId,
      sessionId,
      folderPath,
      workflowAgentId,
    ],
  );

  const executeSingleAction = useCallback(
    async (action: any, bypassIgnore: boolean = false): Promise<string | null> => {
      const executor = getExecutor(action.type);
      if (!executor) {
        console.warn(`[Zen][tool] No executor for type: "${action.type}"`);
        return null;
      }

      const context = buildExecutorContext(action.responseNumber);
      return executor.execute(action, context, { bypassIgnore });
    },
    [buildExecutorContext],
  );

  const handleToolRequest = useCallback(
    async (
      actionOrActions: any,
      message: Message,
      isAutoTrigger: boolean = false,
      _conversationToolOverrides: Record<string, 'auto'> = {},
      actionType?: (typeof TOOL_ACTION_TYPES)[keyof typeof TOOL_ACTION_TYPES],
    ) => {
      let wasInterruptedByManual = false;

      const actions = (Array.isArray(actionOrActions) ? actionOrActions : [actionOrActions]).map(
        (a, idx) => ({
          ...a,
          _index: a._index !== undefined ? a._index : idx,
        }),
      );

      const validResults: string[] = [];
      let skippedCount = 0;
      setExecutionState({
        total: actions.length,
        completed: 0,
        status: EXECUTION_STATUS.RUNNING,
      });

      for (let index = 0; index < actions.length; index++) {
        const action = actions[index];
        const actionId = action.actionId || `${message.id}-action-${action._index}`;

        const isReject = actionType === TOOL_ACTION_TYPES.REJECT;
        const isAlreadyClicked = clickedActionsRef.current.has(actionId);
        if (!isReject && isAlreadyClicked) {
          skippedCount++;
          continue;
        }

        clickedActionsRef.current.add(actionId);
        setClickedActions(new Set(clickedActionsRef.current));

        // SINGLE-LINE REVIEW CHECK
        if (needsSingleLineReview(action)) {
          wasInterruptedByManual = true;
          setSingleLineReviewActions((prev) => ({
            ...prev,
            [actionId]: {
              action: { ...action, actionId },
              actionId,
              messageId: message.id,
              messageObj: message,
            },
          }));
          setExecutionState({
            total: actions.length,
            completed: index,
            status: EXECUTION_STATUS.IDLE,
          });
          clickedActionsRef.current.delete(actionId);
          setClickedActions(new Set(clickedActionsRef.current));
          break;
        }

        // Dangerous action guard: chặn auto-execute nếu action nguy hiểm và chưa được user accept.
        // Chỉ áp dụng cho auto-trigger (LLM tự đề xuất); user click thủ công bỏ qua guard.
        // Delegate sang module-specific danger checker via registry.
        if (
          isAutoTrigger &&
          actionType !== TOOL_ACTION_TYPES.ACCEPT &&
          !approvedDangerousRef.current.has(actionId)
        ) {
          const dangerResult = checkToolDanger(action);
          if (dangerResult.dangerous) {
            wasInterruptedByManual = true;
            setExecutionState({
              total: actions.length,
              completed: index,
              status: 'idle',
            });
            break;
          }
        }

        // Store actionId → toolType mapping for IPC result lookup
        actionToToolTypeMap.current.set(actionId, action.type);

        let result: string | null = null;
        if (actionType === TOOL_ACTION_TYPES.REJECT) {
          result = `Output: [${action.type}] Tool execution rejected by user.`;
          setRejectedActions((prev) => {
            const next = new Set(prev).add(actionId);
            return next;
          });
          window.postMessage({ command: 'markActionRejected', actionId }, '*');
          actionToToolTypeMap.current.delete(actionId); // cleanup on reject
        } else {
          result = await executeSingleAction({ ...action, actionId }, true);
        }

        if (result !== null) {
          const isDisplayOnly = result === DISPLAY_ONLY_RESULT;
          const isMetadataOnly = action.type === 'conversation_title';

          if (!isDisplayOnly && !isMetadataOnly) {
            validResults.push(result);
          }

          if (!isDisplayOnly) {
            let cleanOutput = result;
            const prefixMatch = result.match(/^\[.*?\] Result:\s*/);
            if (prefixMatch) cleanOutput = result.substring(prefixMatch[0].length);
            if (cleanOutput.startsWith('```\n') && cleanOutput.endsWith('\n```'))
              cleanOutput = cleanOutput.substring(4, cleanOutput.length - 4);
            else if (cleanOutput.startsWith('```') && cleanOutput.endsWith('```'))
              cleanOutput = cleanOutput.substring(3, cleanOutput.length - 3);

            const isError =
              result.includes('Result: Error') ||
              result.includes('Tool execution blocked') ||
              result.includes('Tool execution rejected');

            // Streaming tools handle output via IPC, skip direct storage
            if (!isStreamingTool(action.type)) {
              // Delegate to module-specific output transformer
              const transformed = transformToolOutput({ action, cleanOutput, isError });
              const storedOutput = transformed !== null ? transformed : cleanOutput;
              setToolOutputs((prev) => ({
                ...prev,
                [actionId]: {
                  output: storedOutput,
                  isError,
                  terminalId: (action as any).params?.terminal_id,
                },
              }));
            }

            const finalTerminalId = (action as any).params?.terminal_id;
            if (finalTerminalId) {
              terminalToActionMap.current.set(finalTerminalId, actionId);
            }
            setExecutionState((prev) => ({
              ...prev,
              completed: prev.completed + 1,
            }));

            window.postMessage(
              {
                command: isError ? 'markActionFailed' : 'markActionClicked',
                actionId,
              },
              '*',
            );
            clickedActionsRef.current = new Set(clickedActionsRef.current).add(actionId);
            setClickedActions(clickedActionsRef.current);
          }
        } else {
          setExecutionState((prev) => ({ ...prev, status: EXECUTION_STATUS.ERROR }));
          break;
        }
      }

      const allActionsPreSkipped = skippedCount === actions.length;
      if (allActionsPreSkipped) {
        setExecutionState((prev) =>
          prev.status === EXECUTION_STATUS.ERROR
            ? prev
            : { ...prev, status: EXECUTION_STATUS.DONE },
        );
        return;
      }

      setExecutionState((prev) => (prev.status === 'error' ? prev : { ...prev, status: 'done' }));

      const newBuffer = [...(toolResultsBufferRef.current[message.id] || []), ...validResults];

      if (wasInterruptedByManual) {
        toolResultsBufferRef.current[message.id] = newBuffer;
        return;
      }

      if (validResults.length < actions.length) {
        const textActionIds = actions.map((a) => `${message.id}-action-${a._index}`);

        if (newBuffer.length > 0 && handleSendMessageRef.current && !isStoppedRef?.current) {
          const finalContent = newBuffer.join('\n\n');
          const partialKey = `${message.id}::${textActionIds.join('|')}::${finalContent}`;
          toolResultsBufferRef.current[message.id] = [];
          if (partialFlushedKeysRef.current.has(partialKey)) {
            console.warn('[DEBUG][handleToolRequest] duplicate partial flush blocked', {
              messageId: message.id,
              textActionIds,
            });
            return;
          }
          partialFlushedKeysRef.current.add(partialKey);
          handleSendMessageRef.current(
            finalContent,
            undefined,
            undefined,
            undefined,
            true,
            textActionIds,
          );
          return;
        }

        toolResultsBufferRef.current[message.id] = newBuffer;
        return;
      }

      flushWhenMessageComplete(message, validResults, { includeUnparsedWarning: true });
    },
    [],
  );

  const confirmSingleLineAction = useCallback(
    async (actionId: string) => {
      const reviewEntry = singleLineReviewActions[actionId];
      if (!reviewEntry) return;

      const { action, messageObj } = reviewEntry;

      setSingleLineReviewActions((prev) => {
        const next = { ...prev };
        delete next[actionId];
        return next;
      });

      clickedActionsRef.current.add(actionId);
      setClickedActions(new Set(clickedActionsRef.current));

      const result = await executeSingleAction(action, true);

      if (result !== null) {
        let cleanOutput = result;
        const prefixMatch = result.match(/^\[.*?\] Result:\s*/);
        if (prefixMatch) cleanOutput = result.substring(prefixMatch[0].length);
        if (cleanOutput.startsWith('```\n') && cleanOutput.endsWith('\n```'))
          cleanOutput = cleanOutput.substring(4, cleanOutput.length - 4);
        else if (cleanOutput.startsWith('```') && cleanOutput.endsWith('```'))
          cleanOutput = cleanOutput.substring(3, cleanOutput.length - 3);

        const isError =
          result.includes('Result: Error') ||
          result.includes('Tool execution blocked') ||
          result.includes('Tool execution rejected');

        setToolOutputs((prev) => ({
          ...prev,
          [actionId]: {
            output: cleanOutput,
            isError,
          },
        }));

        window.postMessage(
          {
            command: isError ? 'markActionFailed' : 'markActionClicked',
            actionId,
          },
          '*',
        );

        flushWhenMessageComplete(messageObj, [result], { includeUnparsedWarning: true });
      }
    },
    [singleLineReviewActions, executeSingleAction, flushWhenMessageComplete],
  );

  const rejectSingleLineAction = useCallback(
    (actionId: string) => {
      const reviewEntry = singleLineReviewActions[actionId];
      if (!reviewEntry) return;

      const { action, messageObj } = reviewEntry;

      setSingleLineReviewActions((prev) => {
        const next = { ...prev };
        delete next[actionId];
        return next;
      });

      setRejectedActions((prev) => new Set(prev).add(actionId));
      window.postMessage({ command: 'markActionRejected', actionId }, '*');

      const filePath = extractFilePath(action) || 'unknown';
      const errorResult = `[${action.type} for '${filePath}'] Result: Error - Nội dung file bị dồn vào 1 dòng duy nhất (${action.params.content?.length || 0} ký tự). Vui lòng chia lại thành nhiều dòng với ngắt dòng (\\n) thực sự trước khi thực hiện ${action.type}.`;

      flushWhenMessageComplete(messageObj, [errorResult], { completedActionId: actionId });
    },
    [singleLineReviewActions, flushWhenMessageComplete],
  );

  // ── Dangerous command approval API ──
  const approveDangerousAction = useCallback((actionId: string) => {
    approvedDangerousRef.current.add(actionId);
  }, []);

  const rejectDangerousAction = useCallback((actionId: string) => {
    approvedDangerousRef.current.delete(actionId);
  }, []);

  return {
    executionState,
    toolOutputs,
    setToolOutputs,
    terminalStatus,
    handleToolRequest,
    singleLineReviewActions,
    confirmSingleLineAction,
    rejectSingleLineAction,
    approveDangerousAction,
    rejectDangerousAction,
  };
};
