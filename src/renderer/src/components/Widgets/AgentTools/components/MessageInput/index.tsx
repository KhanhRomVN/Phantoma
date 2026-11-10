import { memo, useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Paperclip } from 'lucide-react';
import { $ } from '@renderer/utils/color';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { countTokens, formatTokenCount } from '@renderer/components/Widgets/Zen/utils/tokenizer';
import { fetchProviders } from '../../services/agentApi';
import SelectProviderModelModal from './SelectProviderModelModal';
import ProviderModelTrigger from './ProviderModelTrigger';
import type { ProviderOption, RunOptions } from './types';
import ToolbarOptions from './ToolbarOptions';

const LAST_SELECTION_KEY = 'agent-tools:last-selection';

function readLastSelection(): { providerId: string; model: string; options?: RunOptions } | null {
  try {
    const raw = localStorage.getItem(LAST_SELECTION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLastSelection(providerId: string, model: string, options: RunOptions): void {
  try {
    localStorage.setItem(LAST_SELECTION_KEY, JSON.stringify({ providerId, model, options }));
  } catch {}
}

interface MessageInputProps {
  onSend: (message: string, provider: ProviderOption, model: string, options: RunOptions) => void;
  onProviderChange?: (provider: ProviderOption) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  lockedProviderId?: string;
}

export const MessageInput = memo<MessageInputProps>(
  ({ onSend, onStop, isStreaming, onProviderChange, disabled, lockedProviderId }) => {
  const [message, setMessage] = useState('');
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<ProviderOption | null>(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [runOptions, setRunOptions] = useState<RunOptions>({});
  const [sendHovered, setSendHovered] = useState(false);
  const [plusHovered, setPlusHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProviders = async () => {
      setLoadingProviders(true);
      try {
        const fetched = await fetchProviders();
        const options: ProviderOption[] = fetched.map((p) => ({
          id: p.id,
          name: p.name,
          url: p.url,
          models: p.models.map((m) => m.id),
          modelMeta: Object.fromEntries(
            p.models.map((m) => [m.id, { variants: m.variants ?? [], contextWindow: m.contextWindow }])
          ),
          agents: p.agents,
        }));
        setProviders(options);
        if (options.length > 0) {
          const saved = readLastSelection();
          const initial =
            options.find((o) => o.id === lockedProviderId) ??
            options.find((o) => o.id === saved?.providerId) ??
            options[0];
          const savedModel = saved?.providerId === initial.id ? saved.model : ''; // ASSUMED: giữ model đã lưu kể cả khi discovery chưa trả về danh sách
          const model =
            savedModel && (initial.models.length === 0 || initial.models.includes(savedModel))
              ? savedModel
              : initial.models[0] || '';
          setSelectedProvider(initial);
          setSelectedModel(model);
          setRunOptions(saved?.providerId === initial.id ? (saved.options ?? {}) : {});
          onProviderChange?.(initial);
        }
      } catch (error) {
        console.error('Failed to load providers:', error);
      } finally {
        setLoadingProviders(false);
      }
    };
    loadProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [message]);

  const handleSelect = (provider: ProviderOption, model: string) => {
    const providerChanged = provider.id !== selectedProvider?.id;
    setSelectedProvider(provider);
    setSelectedModel(model);
    const nextOptions = providerChanged ? {} : runOptions;
    setRunOptions(nextOptions);
    writeLastSelection(provider.id, model, nextOptions);
    if (providerChanged) onProviderChange?.(provider);
  };

  const modalProviders = useMemo(
    () => (lockedProviderId ? providers.filter((p) => p.id === lockedProviderId) : providers),
    [providers, lockedProviderId]
  );
  const tokenCount = useMemo(() => countTokens(message), [message]);

  const modelMeta = selectedProvider?.modelMeta?.[selectedModel];
  const variants = modelMeta?.variants ?? [];
  const agents = selectedProvider?.agents ?? [];
  const showContextSize = selectedProvider?.id === 'claude' && (modelMeta?.contextWindow ?? 0) >= 1_000_000;
  const effectiveOptions: RunOptions = {
    variant: runOptions.variant && variants.includes(runOptions.variant) ? runOptions.variant : undefined,
    agent: runOptions.agent && agents.includes(runOptions.agent) ? runOptions.agent : undefined,
    contextSize: showContextSize ? (runOptions.contextSize ?? '200k') : undefined
  };

  const handleOptionsChange = (next: RunOptions) => {
    setRunOptions(next);
    if (selectedProvider) writeLastSelection(selectedProvider.id, selectedModel, next);
  };

  const canSend = !!message.trim() && !disabled && !!selectedProvider && !!selectedModel;

  const handleSend = () => {
    if (!canSend || !selectedProvider) return;
    onSend(message, selectedProvider, selectedModel, effectiveOptions);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ASSUMED: agent CLI nhận prompt dạng text nên file đính kèm được chèn vào message dưới dạng @path
  const handleFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      const mentions = files.map((f) => `@${(f as File & { path?: string }).path || f.name}`).join(' ');
      setMessage((prev) => (prev && !prev.endsWith(' ') ? `${prev} ` : prev) + mentions + ' ');
      textareaRef.current?.focus();
    }
    e.target.value = '';
  };

  const noProvider = !loadingProviders && providers.length === 0;
  const placeholder = loadingProviders
    ? 'Loading providers...'
    : noProvider
      ? 'No providers available'
      : 'Send a message...';

  return (
    <div
      style={{
        padding: '12px 16px',
        position: 'relative',
        maxWidth: '680px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {selectedProvider && (
        <div style={{ display: 'flex', paddingLeft: '8px', minWidth: 0 }}>
          <ProviderModelTrigger
            providerName={selectedProvider.name}
            providerUrl={selectedProvider.url}
            model={selectedModel}
            disabled={disabled}
            onClick={() => setShowModal(true)}
          />
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '6px',
          border: noProvider ? `1px dashed ${$('--error')}` : `1px solid ${$('--border')}`,
          backgroundColor: $('--input-background'),
          transition: 'border 0.3s ease',
        }}
      >
        <div style={{ padding: '12px' }}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || loadingProviders || noProvider}
            rows={1}
            style={{
              display: 'block',
              width: '100%',
              minHeight: '24px',
              maxHeight: '240px',
              padding: 0,
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              fontSize: '13px',
              lineHeight: '24px',
              backgroundColor: 'transparent',
              color: $('--text-primary'),
              overflowX: 'hidden',
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div
          style={{
            padding: '8px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input ref={fileInputRef} type="file" multiple hidden onChange={handleFilesPicked} />
            <Dropdown side="top" align="start" sideOffset={4} width={320}>
              <DropdownTrigger asChild>
                <div
                  onMouseEnter={() => setPlusHovered(true)}
                  onMouseLeave={() => setPlusHovered(false)}
                  title="Attach files"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    height: '22px',
                    width: '22px',
                    boxSizing: 'border-box',
                    borderRadius: '4px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    pointerEvents: disabled ? 'none' : undefined,
                    transition: 'all 0.2s ease-in-out',
                    border: `1px solid color-mix(in srgb, ${$('--text-secondary')} 20%, transparent)`,
                    background: plusHovered
                      ? `color-mix(in srgb, ${$('--text-secondary')} 20%, transparent)`
                      : `color-mix(in srgb, ${$('--text-secondary')} 12%, transparent)`,
                    color: $('--text-primary'),
                    opacity: plusHovered ? 0.9 : 0.7,
                  }}
                >
                  <Plus size={14} />
                </div>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownItem onClick={() => fileInputRef.current?.click()} noPadding>
                  <div className="w-full px-3 py-2.5 flex items-center gap-2.5 transition-colors hover:bg-sidebar-item-hover cursor-pointer">
                    <span
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${$('--blue')} 15%, transparent)`,
                        color: $('--blue'),
                      }}
                    >
                      <Paperclip size={14} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-text-primary mb-0.5">Attach</div>
                      <div className="text-[11px] text-text-secondary leading-tight whitespace-normal">
                        Insert file paths into the message
                      </div>
                    </div>
                  </div>
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
            <ToolbarOptions
              variants={variants}
              showReasoning={!!selectedProvider}
              showAgent={selectedProvider?.id === 'opencode'}
              agents={agents}
              showContextSize={showContextSize}
              options={effectiveOptions}
              onChange={handleOptionsChange}
              disabled={disabled}
            />
          </div>

          <button
            type="button"
            onClick={isStreaming ? onStop : handleSend}
            disabled={isStreaming ? false : !canSend}
            onMouseEnter={() => setSendHovered(true)}
            onMouseLeave={() => setSendHovered(false)}
            title={isStreaming ? 'Stop' : `${tokenCount.toLocaleString()} tokens`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              padding: '4px 8px',
              borderRadius: '6px',
              border: 'none',
              cursor: isStreaming || canSend ? 'pointer' : 'default',
              color: $('--text-secondary'),
              backgroundColor:
                sendHovered && (isStreaming || canSend)
                  ? `color-mix(in srgb, ${$('--text-primary')} 5%, transparent)`
                  : `color-mix(in srgb, ${$('--text-secondary')} 8%, transparent)`,
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.3px',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            {isStreaming ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <span style={{ lineHeight: 1 }}>{tokenCount > 0 ? formatTokenCount(tokenCount) : '0'}</span>
            )}
          </button>
        </div>
      </div>

      <SelectProviderModelModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        providers={modalProviders}
        isLoading={loadingProviders}
        currentProviderId={selectedProvider?.id}
        currentModel={selectedModel}
        onSelect={handleSelect}
      />
    </div>
  );
  }
);

MessageInput.displayName = 'MessageInput';