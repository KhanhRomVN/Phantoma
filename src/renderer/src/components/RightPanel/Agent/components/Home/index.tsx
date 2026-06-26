// ─── Home UI Component ──────────────────────────────────────────────────────

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  StopCircle,
  Loader2,
  Sparkles,
  Terminal,
  Copy,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { Message, ToolAction, ToolOutput } from '../../types';
import { parseAIResponse } from '../../utils/parser';
import { WELCOME_SUGGESTIONS } from '../../constants';
import { cn } from '@renderer/shared/lib/utils';

interface HomeProps {
  messages: Message[];
  streamingContent: string;
  isProcessing: boolean;
  serverStatus: 'online' | 'offline';
  activeModelId: string | null;
  activeAccountId: string | null;
  errorMessage: string | null;
  inputText: string;
  copiedText: string | null;
  toolOutputs: Record<string, ToolOutput>;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onNewChat: () => void;
  onClear: () => void;
  onCopy: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

export function Home({
  messages,
  streamingContent,
  isProcessing,
  serverStatus,
  activeModelId,
  activeAccountId,
  errorMessage,
  inputText,
  copiedText,
  toolOutputs,
  onInputChange,
  onSend,
  onStop,
  onNewChat,
  onClear,
  onCopy,
  onKeyDown,
  messagesEndRef,
  inputRef,
}: HomeProps) {
  // ─── Render tool block ──────────────────────────────────────────────

  const renderToolBlock = (action: ToolAction) => {
    const output = toolOutputs[action.rawXml];
    const isPending = !output;
    const isError = output?.isError || false;

    return (
      <div
        key={action.rawXml}
        className="my-2 border border-border bg-card-background rounded-lg overflow-hidden text-xs"
      >
        <div className="flex items-center justify-between px-3 py-1.5 bg-background border-b border-divider">
          <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-semibold">
            <Terminal className="w-3.5 h-3.5" />
            <span>{action.type}</span>
          </div>
          <div>
            {isPending ? (
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Loader2 className="w-3 h-3 animate-spin" />
                Running...
              </span>
            ) : isError ? (
              <span className="text-red-400 font-semibold">Failed</span>
            ) : (
              <span className="text-green-400 font-semibold">Completed</span>
            )}
          </div>
        </div>

        <div className="p-2 bg-background font-mono text-[10px] text-text-secondary border-b border-divider">
          <span className="text-text-muted">Parameters:</span>
          <pre className="mt-1 max-h-[80px] overflow-y-auto whitespace-pre-wrap text-text-primary">
            {JSON.stringify(action.params, null, 2)}
          </pre>
        </div>

        {!isPending && output?.output && (
          <details className="group">
            <summary className="flex items-center justify-between px-3 py-1 bg-background cursor-pointer text-text-secondary hover:text-text-primary transition-colors select-none text-[10px]">
              <span>Inspect Output</span>
              <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
            </summary>
            <div className="p-2 bg-background border-t border-divider font-mono text-[10px] overflow-x-auto max-h-[160px] text-text-primary relative">
              <pre className="whitespace-pre-wrap">{output.output}</pre>
              <button
                onClick={() => onCopy(output.output)}
                className="absolute right-2 top-2 p-1 rounded bg-card-background border border-border text-text-secondary hover:text-text-primary transition-all opacity-0 group-hover:opacity-100"
              >
                {copiedText === output.output ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </details>
        )}
      </div>
    );
  };

  // ─── Render message ──────────────────────────────────────────────────

  const renderMessage = (msg: Message) => {
    const isUser = msg.role === 'user';
    const isSystem = msg.role === 'system';

    if (isSystem) return null;

    const parsed = parseAIResponse(msg.content);
    const displayContent = parsed.displayText || msg.content;

    return (
      <div
        key={msg.id}
        className={cn('flex flex-col max-w-[85%] mb-3', isUser ? 'self-end' : 'self-start')}
      >
        <span className="text-[10px] text-text-secondary mb-1 px-1 flex items-center gap-1 font-semibold">
          {isUser ? 'You' : 'Agent'}
          <span className="text-border">•</span>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>

        <div
          className={cn(
            'p-3 rounded-xl text-xs leading-relaxed border shadow-md relative group',
            isUser
              ? 'bg-cyan-500/10 border-cyan-500/25 text-text-primary rounded-tr-none'
              : 'bg-card-background border-border text-text-primary rounded-tl-none',
          )}
        >
          {!isUser && parsed.thinking && (
            <details className="mb-2.5 bg-background border border-border/60 rounded-lg p-2 text-[11px] text-text-secondary">
              <summary className="cursor-pointer font-semibold text-amber-500/90 select-none hover:text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Thinking Process
              </summary>
              <div className="mt-2 whitespace-pre-wrap leading-relaxed border-t border-divider pt-2">
                {parsed.thinking}
              </div>
            </details>
          )}

          {displayContent && (
            <div className="prose prose-invert max-w-none text-[12px] whitespace-pre-wrap prose-p:my-1 prose-headings:my-1.5 prose-ul:my-1 prose-ol:my-1">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code: ({ className, children, ...props }) => {
                    const codeContent = String(children).replace(/\n$/, '');
                    const match = /language-(\w+)/.exec(className || '');
                    return match ? (
                      <div className="relative group/code my-2">
                        <pre className="bg-background border border-border p-2.5 rounded-lg overflow-x-auto text-[11px] font-mono">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                        <button
                          onClick={() => onCopy(codeContent)}
                          className="absolute right-2 top-2 p-1 rounded bg-card-background border border-border text-text-secondary hover:text-text-primary transition-all opacity-0 group-hover/code:opacity-100"
                        >
                          {copiedText === codeContent ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <code
                        className="bg-background px-1 py-0.5 rounded text-cyan-400 font-mono text-[11px]"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3 border border-border rounded-lg">
                      <table className="min-w-full divide-y divide-border text-[11px] font-sans">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-background">{children}</thead>,
                  th: ({ children }) => (
                    <th className="px-3 py-2 text-left text-xs font-bold text-text-primary uppercase tracking-wider">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-1.5 border-t border-divider text-text-secondary">
                      {children}
                    </td>
                  ),
                }}
              >
                {displayContent}
              </ReactMarkdown>
            </div>
          )}

          {!isUser && parsed.actions.length > 0 && (
            <div className="mt-2.5 space-y-2 border-t border-divider pt-2">
              {parsed.actions.map(renderToolBlock)}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Welcome screen ──────────────────────────────────────────────────

  const renderWelcome = () => {
    const visibleMessages = messages.filter((m) => !m.isHidden);
    if (visibleMessages.length > 0) return null;

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-text-secondary max-w-sm mx-auto gap-3.5 my-auto">
        <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-text-primary mb-1.5">Phantoma AI Agent</h4>
          <p className="leading-relaxed">
            Welcome to the AI Agent chat panel. You can ask the agent to inspect intercepted network
            requests, filter traffic, analyze payloads, or delete requests.
          </p>
        </div>

        <div className="w-full grid grid-cols-1 gap-2 mt-2">
          {WELCOME_SUGGESTIONS.map((suggestion, idx) => (
            <div
              key={idx}
              className="p-2.5 bg-card-background border border-border hover:border-cyan-500/20 rounded-lg text-left cursor-pointer transition-all hover:bg-background"
              onClick={() => onInputChange(suggestion.prompt)}
            >
              <p className="font-bold text-text-primary mb-0.5 text-xs">{suggestion.title}</p>
              <p className="text-[10px] text-text-secondary">{suggestion.description}</p>
            </div>
          ))}
        </div>

        {(!activeModelId || !activeAccountId) && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-[10px] text-left w-full">
            <p className="font-semibold">⚠️ Setup Required</p>
            <p className="text-text-secondary mt-0.5">
              {!activeModelId &&
                !activeAccountId &&
                'Select a model and account in the Models & Accounts tabs'}
              {activeModelId && !activeAccountId && 'Select an account in the Accounts tab'}
              {!activeModelId && activeAccountId && 'Select a model in the Models tab'}
            </p>
          </div>
        )}
      </div>
    );
  };

  // ─── Render streaming message ────────────────────────────────────────

  const renderStreaming = () => {
    if (!streamingContent) return null;

    const parsed = parseAIResponse(streamingContent);

    return (
      <div className="flex flex-col max-w-[85%] self-start mb-3">
        <span className="text-[10px] text-text-secondary mb-1 px-1 flex items-center gap-1 font-semibold">
          Agent
          <span className="text-border">•</span>
          streaming...
        </span>
        <div className="p-3 rounded-xl text-xs leading-relaxed border border-border bg-card-background text-text-primary rounded-tl-none">
          {parsed.thinking && (
            <details className="mb-2.5 bg-background border border-border/60 rounded-lg p-2 text-[11px] text-text-secondary">
              <summary className="cursor-pointer font-semibold text-amber-500/90 select-none hover:text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Thinking Process
              </summary>
              <div className="mt-2 whitespace-pre-wrap leading-relaxed border-t border-divider pt-2">
                {parsed.thinking}
              </div>
            </details>
          )}
          {parsed.displayText && (
            <div className="prose prose-invert max-w-none text-[12px] whitespace-pre-wrap prose-p:my-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.displayText}</ReactMarkdown>
            </div>
          )}
          <span className="inline-block w-1.5 h-3.5 bg-cyan-400 animate-pulse ml-0.5" />
        </div>
      </div>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2 border-b border-divider bg-background flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              serverStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500',
            )}
          />
          <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Agent Session
          </span>
          <span className="text-[10px] text-text-secondary font-mono">
            {activeModelId ? `(${activeModelId})` : '(No model)'}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onNewChat}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/20 text-cyan-400 text-[10px] font-semibold transition-all"
          >
            <Plus className="w-3 h-3" />
            New Chat
          </button>
          <button
            onClick={onClear}
            disabled={messages.filter((m) => !m.isHidden).length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 text-[10px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-sm">
        {renderWelcome()}
        {messages.filter((m) => !m.isHidden).map(renderMessage)}
        {renderStreaming()}

        {isProcessing && !streamingContent && (
          <div className="flex items-center gap-2 mb-3 self-start">
            <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">
              Agent
            </span>
            <div className="flex items-center gap-1 px-2.5 py-2 bg-cyan-500/6 border border-cyan-500/15 rounded-md rounded-bl-sm">
              <span
                className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-divider bg-background shrink-0">
        {errorMessage && (
          <div className="mb-3 flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button
              onClick={() => {
                // This will be handled by the parent component
              }}
              className="text-text-secondary hover:text-text-primary"
            >
              ✕
            </button>
          </div>
        )}

        <div className="relative flex items-end gap-2 bg-card-background border border-border focus-within:border-cyan-500/40 rounded-xl p-2 transition-all">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={isProcessing}
            placeholder={
              isProcessing
                ? 'Agent is thinking...'
                : activeModelId && activeAccountId
                  ? 'Ask the Agent to inspect traffic or filter requests...'
                  : 'Please select a model and account first...'
            }
            rows={Math.min(6, inputText.split('\n').length || 1)}
            className="flex-1 bg-transparent resize-none outline-none border-none text-xs text-text-primary placeholder-text-secondary max-h-[140px] py-1 px-2 font-sans"
          />

          {isProcessing ? (
            <button
              onClick={onStop}
              className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors shrink-0"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!inputText.trim() || !activeModelId || !activeAccountId}
              className={cn(
                'p-2 rounded-lg transition-colors shrink-0',
                inputText.trim() && activeModelId && activeAccountId
                  ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30'
                  : 'bg-card-background text-text-secondary cursor-not-allowed border border-border',
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}