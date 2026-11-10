import { useCallback, useEffect, useRef, useState } from 'react';
import {
  startAgentRun,
  interruptAgentRun,
  type AgentSessionItem,
} from '../../../services/agentApi';
import { agentToolIpc } from '../../../handlers/AgentToolIpc';
import {
  type Conversation,
  setActiveConversationId,
  clearActiveConversation,
  deleteConversation,
  getConversation,
  createConversation,
  addMessage,
  updateMessage,
  saveConversation,
} from '../../../services/conversationStorage';
import type { AgentKind } from '../../../types';
import { getWorkingPath } from '../../../shared/workingPath';
import type { RunOptions } from '../../../components/MessageInput/types';

export interface SendProvider {
  id: string;
  name: string;
  url?: string;
  models: string[];
}

export interface UseAgentChatOptions {
  conversationId?: string | null;
  onConversationChange?: (conversationId: string | null) => void;
}

export function useAgentChat(options: UseAgentChatOptions = {}) {
  const { conversationId, onConversationChange } = options;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const runIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    const existing = getConversation(conversationId);
    if (existing) setConversation(existing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = useCallback(
    async (message: string, provider: SendProvider, model: string, options: RunOptions = {}) => {
      let conv = conversation;
      if (!conv) {
        conv = createConversation(provider.id, model);
        saveConversation(conv);
        setActiveConversationId(conv.id);
        onConversationChange?.(conv.id);
      }

      const convId = conv.id;
      const refresh = (): void => {
        const latest = getConversation(convId);
        if (latest) setConversation({ ...latest });
      };

      setIsStreaming(true);
      addMessage(convId, { role: 'user', content: message, timestamp: Date.now() });
      refresh();

      const toolMessageIds = new Map<string, string>();
      let currentAssistantId: string | null = null;
      let currentText = '';
      let lastAssistantId: string | null = null;

      try {
        const run = startAgentRun({
          kind: provider.id as AgentKind,
          prompt: message,
          model,
          resume: getConversation(convId)?.nativeSessionId,
          variant: options.variant,
          agent: options.agent,
          contextSize: options.contextSize,
          cwd: getWorkingPath() || undefined,
        });
        runIdRef.current = run.runId;

        for await (const agentEvent of run.events) {
          switch (agentEvent.type) {
            case 'session_started': {
              const latest = getConversation(convId);
              if (latest) saveConversation({ ...latest, nativeSessionId: agentEvent.sessionId });
              break;
            }
            case 'context_usage': {
              const latest = getConversation(convId);
              if (latest) {
                saveConversation({
                  ...latest,
                  contextTokens: agentEvent.tokens ?? latest.contextTokens,
                  contextWindow: agentEvent.window ?? latest.contextWindow,
                });
                refresh();
              }
              break;
            }
            case 'usage': {
              const usageTargetId = currentAssistantId ?? lastAssistantId;
              if (usageTargetId) {
                const prev = getConversation(convId)?.messages.find(
                  (m) => m.id === usageTargetId,
                )?.usage;
                updateMessage(convId, usageTargetId, {
                  usage: {
                    inputTokens: (prev?.inputTokens ?? 0) + agentEvent.inputTokens,
                    outputTokens: (prev?.outputTokens ?? 0) + agentEvent.outputTokens,
                  },
                });
              }
              const latest = getConversation(convId);
              if (latest) {
                saveConversation({
                  ...latest,
                  totalTokens:
                    (latest.totalTokens ?? 0) + agentEvent.inputTokens + agentEvent.outputTokens,
                });
                refresh();
              }
              break;
            }
            case 'reasoning_delta': {
              const previous =
                getConversation(convId)?.messages.find((m) => m.id === currentAssistantId)
                  ?.thinking ?? '';
              if (!currentAssistantId) {
                currentAssistantId = addMessage(convId, {
                  role: 'assistant',
                  content: '',
                  timestamp: Date.now(),
                  thinking: agentEvent.text,
                }).id;
                setStreamingMessageId(currentAssistantId);
              } else {
                updateMessage(convId, currentAssistantId, { thinking: previous + agentEvent.text });
              }
              refresh();
              break;
            }
            case 'text_delta': {
              currentText += agentEvent.text;
              if (!currentAssistantId) {
                currentAssistantId = addMessage(convId, {
                  role: 'assistant',
                  content: currentText,
                  timestamp: Date.now(),
                }).id;
                setStreamingMessageId(currentAssistantId);
              } else {
                updateMessage(convId, currentAssistantId, { content: currentText });
              }
              refresh();
              break;
            }
            case 'message_completed': {
              lastAssistantId = currentAssistantId ?? lastAssistantId;
              currentAssistantId = null;
              currentText = '';
              setStreamingMessageId(null);
              break;
            }
            case 'tool_call': {
              const toolMessage = addMessage(convId, {
                role: 'tool',
                content: '',
                timestamp: Date.now(),
                toolCall: agentEvent.call,
              });
              toolMessageIds.set(agentEvent.id, toolMessage.id);
              refresh();
              break;
            }
            case 'tool_result': {
              const toolMessageId = toolMessageIds.get(agentEvent.id);
              if (toolMessageId) {
                updateMessage(convId, toolMessageId, {
                  toolResult: agentEvent.isError
                    ? { error: agentEvent.output || 'Tool failed' }
                    : { output: agentEvent.output },
                });
                refresh();
              }
              break;
            }
            case 'error': {
              addMessage(convId, {
                role: 'assistant',
                content: agentEvent.message,
                timestamp: Date.now(),
                isError: true,
              });
              refresh();
              break;
            }
            case 'done': {
              if (agentEvent.status === 'errored' && agentEvent.error) {
                addMessage(convId, {
                  role: 'assistant',
                  content: agentEvent.error,
                  timestamp: Date.now(),
                  isError: true,
                });
                refresh();
              }
              break;
            }
          }
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        addMessage(convId, {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
          timestamp: Date.now(),
          isError: true,
        });
        refresh();
      } finally {
        setIsStreaming(false);
        setStreamingMessageId(null);
        runIdRef.current = null;
      }
    },
    [conversation, onConversationChange],
  );

  const stop = useCallback(() => {
    if (runIdRef.current) void interruptAgentRun(runIdRef.current);
  }, []);

  const reset = useCallback(() => {
    setConversation(null);
    clearActiveConversation();
    onConversationChange?.(null);
  }, [onConversationChange]);

  const remove = useCallback(() => {
    if (conversation) deleteConversation(conversation.id);
    reset();
  }, [conversation, reset]);

  const loadSession = useCallback(
    async (item: AgentSessionItem) => {
      if (isStreaming) return;
      try {
        const loaded = await agentToolIpc.loadSession({ kind: item.agentId as AgentKind }, item.id);
        if (loaded.length === 0) return;
        const now = Date.now();
        const conv: Conversation = {
          ...createConversation(item.agentId, item.modelId ?? '', item.title),
          nativeSessionId: item.id,
          totalTokens: item.totalTokens,
          messages: loaded.map((m, i) => ({
            id: `msg_${now}_${i}`,
            role: m.role,
            content: m.content,
            thinking: m.thinking,
            timestamp: m.timestamp || now,
          })),
        };
        saveConversation(conv);
        setConversation(conv);
        setActiveConversationId(conv.id);
        onConversationChange?.(conv.id);
      } catch (error) {
        console.error('Failed to load session:', error);
      }
    },
    [isStreaming, onConversationChange],
  );

  return {
    conversation,
    messages: conversation?.messages ?? [],
    loadSession,
    reset,
    remove,
    isStreaming,
    streamingMessageId,
    send,
    stop,
  };
}
