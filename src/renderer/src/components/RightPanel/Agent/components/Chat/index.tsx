// ─── Agent Chat Component ──────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, ToolOutput, ChatStreamChunk } from '../../types';
import { generateMessageId, getTimestamp } from '../../utils/parser';
import {
  saveMessages,
  loadMessages,
  getOrCreateSession,
  updateSessionMessages,
} from '../../utils/storage';
import { getAgentAPI } from '../../services/api';
import { SYSTEM_PROMPT } from '../../constants';
import { useAgentStore } from '../store';
import { Home } from '../Home';

// ─── Props ──────────────────────────────────────────────────────────────────

interface ChatProps {
  conversationId: string;
  onConversationUpdate?: (id: string) => void;
}

// ─── Chat Component ─────────────────────────────────────────────────────────

export function Chat({ conversationId, onConversationUpdate }: ChatProps) {
  const { apiUrl, activeModelId, activeAccountId, serverStatus, setServerStatus } = useAgentStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toolOutputs, setToolOutputs] = useState<Record<string, ToolOutput>>({});
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ─── Load messages on conversation change ──────────────────────────────

  useEffect(() => {
    if (conversationId) {
      const loaded = loadMessages(conversationId);
      const hasSystem = loaded.some((m) => m.role === 'system');
      if (!hasSystem) {
        const systemMsg: Message = {
          id: generateMessageId(),
          role: 'system',
          content: SYSTEM_PROMPT,
          timestamp: getTimestamp(),
          isHidden: true,
        };
        const updated = [systemMsg, ...loaded];
        setMessages(updated);
        saveMessages(conversationId, updated);
      } else {
        setMessages(loaded);
      }
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  // ─── Auto-save messages ────────────────────────────────────────────────

  useEffect(() => {
    if (conversationId && messages.length > 0) {
      saveMessages(conversationId, messages);
      updateSessionMessages(conversationId, messages);
      onConversationUpdate?.(conversationId);
    }
  }, [messages, conversationId, onConversationUpdate]);

  // ─── Scroll to bottom ──────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, isProcessing]);

  // ─── Check server status ──────────────────────────────────────────────

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const api = getAgentAPI(apiUrl);
        const status = await api.checkStatus();
        setServerStatus(status ? 'online' : 'offline');
      } catch {
        setServerStatus('offline');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [apiUrl, setServerStatus]);

  // ─── Copy handler ──────────────────────────────────────────────────────

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    });
  }, []);

  // ─── Send message ──────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isProcessing) return;

    if (!activeModelId) {
      setErrorMessage('Please select a model in the Models tab first');
      return;
    }

    if (!activeAccountId) {
      setErrorMessage('Please select an account in the Accounts tab first');
      return;
    }

    const userMsg: Message = {
      id: generateMessageId(),
      role: 'user',
      content: text,
      timestamp: getTimestamp(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setErrorMessage(null);
    setIsProcessing(true);
    setToolOutputs({});
    setStreamingContent('');

    const controller = new AbortController();
    setAbortController(controller);

    const history = messages
      .filter((m) => !m.isHidden)
      .concat([userMsg])
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const api = getAgentAPI(apiUrl);
    let fullContent = '';
    let currentToolCalls: Array<{ name: string; params: Record<string, unknown>; raw: string }> = [];

    try {
      await api.streamChat(
        {
          model_id: activeModelId,
          account_id: activeAccountId,
          messages: history,
          stream: true,
        },
        (chunk: ChatStreamChunk) => {
          if (chunk.type === 'content' && chunk.content) {
            fullContent += chunk.content;
            setStreamingContent(fullContent);
          } else if (chunk.type === 'tool_call') {
            const toolCall = {
              name: chunk.tool_name || 'unknown',
              params: chunk.tool_params || {},
              raw: `<${chunk.tool_name}>${JSON.stringify(chunk.tool_params)}</${chunk.tool_name}>`,
            };
            currentToolCalls.push(toolCall);
            setToolOutputs((prev) => ({
              ...prev,
              [toolCall.raw]: { output: 'Running...', isError: false },
            }));
          } else if (chunk.type === 'tool_result') {
            const raw = currentToolCalls[currentToolCalls.length - 1]?.raw || '';
            if (raw) {
              setToolOutputs((prev) => ({
                ...prev,
                [raw]: {
                  output: chunk.tool_output || 'No output',
                  isError: chunk.tool_error || false,
                },
              }));
            }
          } else if (chunk.type === 'error' && chunk.error) {
            setErrorMessage(chunk.error);
          } else if (chunk.type === 'done') {
            const assistantMsg: Message = {
              id: generateMessageId(),
              role: 'assistant',
              content: fullContent,
              timestamp: getTimestamp(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
            setStreamingContent('');
            setIsProcessing(false);
          }
        },
        (error: string) => {
          setErrorMessage(error);
          setIsProcessing(false);
        },
        () => {
          setIsProcessing(false);
        },
        controller.signal,
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        if (fullContent) {
          const assistantMsg: Message = {
            id: generateMessageId(),
            role: 'assistant',
            content: fullContent + '\n\n[Stopped by user]',
            timestamp: getTimestamp(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      }
      setIsProcessing(false);
    }
  }, [inputText, isProcessing, activeModelId, activeAccountId, apiUrl, messages]);

  // ─── Stop generation ──────────────────────────────────────────────────

  const handleStop = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  }, [abortController]);

  // ─── New Chat ─────────────────────────────────────────────────────────

  const handleNewChat = useCallback(() => {
    if (conversationId && messages.length > 1) {
      const systemMsg = messages.find((m) => m.role === 'system');
      const newId = `session-${Date.now()}`;
      const newMessages = systemMsg ? [systemMsg] : [];
      getOrCreateSession(newId, 'New Chat');
      saveMessages(newId, newMessages);
      updateSessionMessages(newId, newMessages);
      onConversationUpdate?.(newId);
    }
  }, [conversationId, messages, onConversationUpdate]);

  // ─── Clear chat ──────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    const systemMsg = messages.find((m) => m.role === 'system');
    const cleared = systemMsg ? [systemMsg] : [];
    setMessages(cleared);
    if (conversationId) {
      saveMessages(conversationId, cleared);
      updateSessionMessages(conversationId, cleared);
    }
    setToolOutputs({});
    setStreamingContent('');
  }, [messages, conversationId]);

  // ─── Key handler ─────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Clear error handler ────────────────────────────────────────────

  const handleClearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <Home
      messages={messages}
      streamingContent={streamingContent}
      isProcessing={isProcessing}
      serverStatus={serverStatus as 'online' | 'offline'}
      activeModelId={activeModelId}
      activeAccountId={activeAccountId}
      errorMessage={errorMessage}
      inputText={inputText}
      copiedText={copiedText}
      toolOutputs={toolOutputs}
      onInputChange={setInputText}
      onSend={handleSend}
      onStop={handleStop}
      onNewChat={handleNewChat}
      onClear={handleClear}
      onCopy={handleCopy}
      onKeyDown={handleKeyDown}
      messagesEndRef={messagesEndRef}
      inputRef={inputRef}
    />
  );
}
