import { memo, useState, useRef, useEffect } from 'react';
import { Send, ChevronDown } from 'lucide-react';
import { $ } from '@renderer/utils/color';
import { getFaviconUrl } from '@renderer/utils/favicon';
import { fetchProviders } from '../services/agentApi';

interface ProviderOption {
  id: string;
  name: string;
  url?: string;
  models: string[];
}

interface MessageInputProps {
  onSend: (message: string, provider: ProviderOption, model: string) => void;
  onProviderChange?: (provider: ProviderOption) => void;
  disabled?: boolean;
}

const menuStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '100%',
  left: 0,
  marginBottom: '6px',
  minWidth: '180px',
  maxHeight: '240px',
  overflowY: 'auto',
  padding: '4px',
  borderRadius: '6px',
  border: `1px solid ${$('--border')}`,
  backgroundColor: $('--input-background'),
  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
  zIndex: 50,
};

const triggerStyle = (hovered: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  height: '24px',
  padding: '0 8px',
  borderRadius: '5px',
  border: `1px solid color-mix(in srgb, ${$('--text-secondary')} 20%, transparent)`,
  background: hovered
    ? `color-mix(in srgb, ${$('--text-secondary')} 20%, transparent)`
    : `color-mix(in srgb, ${$('--text-secondary')} 12%, transparent)`,
  color: $('--text-primary'),
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease-in-out',
});

const itemStyle = (active: boolean, hovered: boolean): React.CSSProperties => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 8px',
  border: 'none',
  borderRadius: '4px',
  textAlign: 'left',
  fontSize: '12px',
  cursor: 'pointer',
  color: active ? $('--text-primary') : $('--text-secondary'),
  background:
    active || hovered
      ? `color-mix(in srgb, ${$('--text-secondary')} 16%, transparent)`
      : 'transparent',
});

export const MessageInput = memo<MessageInputProps>(({ onSend, onProviderChange, disabled }) => {
  const [message, setMessage] = useState('');
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<ProviderOption | null>(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const providerMenuRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

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
        }));
        setProviders(options);
        if (options.length > 0) {
          setSelectedProvider(options[0]);
          setSelectedModel(options[0].models[0] || '');
          onProviderChange?.(options[0]);
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (providerMenuRef.current && !providerMenuRef.current.contains(e.target as Node)) {
        setShowProviderMenu(false);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProviderSelect = (provider: ProviderOption) => {
    setSelectedProvider(provider);
    setSelectedModel(provider.models[0] || '');
    setShowProviderMenu(false);
    onProviderChange?.(provider);
  };

  const handleModelSelect = (model: string) => {
    setSelectedModel(model);
    setShowModelMenu(false);
  };

  const canSend = !!message.trim() && !disabled && !!selectedProvider && !!selectedModel;

  const handleSend = () => {
    if (!canSend || !selectedProvider) return;
    onSend(message, selectedProvider, selectedModel);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const noProvider = !loadingProviders && providers.length === 0;
  const placeholder = loadingProviders
    ? 'Loading providers...'
    : noProvider
      ? 'No providers available'
      : 'Send a message...';

  const renderFavicon = (url?: string) =>
    url ? (
      <img
        src={getFaviconUrl(url, 16)}
        alt=""
        style={{ width: '12px', height: '12px', borderRadius: '2px', objectFit: 'contain' }}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    ) : null;

  return (
    <div style={{ padding: '12px 16px', position: 'relative' }}>
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
        <div style={{ padding: '10px 12px 0 12px' }}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || loadingProviders || noProvider}
            rows={1}
            style={{
              width: '100%',
              minHeight: '24px',
              maxHeight: '240px',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              fontSize: '13px',
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {selectedProvider && (
              <>
                <div style={{ position: 'relative' }} ref={providerMenuRef}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setShowProviderMenu((v) => !v)}
                    onMouseEnter={() => setHovered('provider')}
                    onMouseLeave={() => setHovered(null)}
                    style={triggerStyle(hovered === 'provider')}
                  >
                    {renderFavicon(selectedProvider.url)}
                    <span>{selectedProvider.name}</span>
                    <ChevronDown size={12} />
                  </button>
                  {showProviderMenu && (
                    <div style={menuStyle}>
                      {providers.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleProviderSelect(p)}
                          onMouseEnter={() => setHovered(`p:${p.id}`)}
                          onMouseLeave={() => setHovered(null)}
                          style={itemStyle(p.id === selectedProvider.id, hovered === `p:${p.id}`)}
                        >
                          {renderFavicon(p.url)}
                          <span>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ position: 'relative' }} ref={modelMenuRef}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      console.log('[DEBUG] model button clicked, provider:', selectedProvider.id);
                      console.log('[DEBUG] provider.models:', selectedProvider.models);
                      setShowModelMenu((v) => !v);
                    }}
                    onMouseEnter={() => setHovered('model')}
                    onMouseLeave={() => setHovered(null)}
                    style={triggerStyle(hovered === 'model')}
                  >
                    <span>{selectedModel || 'Select model'}</span>
                    <ChevronDown size={12} />
                  </button>
                  {showModelMenu && (
                    <div style={menuStyle}>
                      {selectedProvider.models.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleModelSelect(m)}
                          onMouseEnter={() => setHovered(`m:${m}`)}
                          onMouseLeave={() => setHovered(null)}
                          style={itemStyle(m === selectedModel, hovered === `m:${m}`)}
                        >
                          <span>{m}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            onMouseEnter={() => setHovered('send')}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '26px',
              width: '26px',
              borderRadius: '6px',
              border: 'none',
              cursor: canSend ? 'pointer' : 'not-allowed',
              opacity: canSend ? 1 : 0.4,
              color: $('--text-primary'),
              background:
                hovered === 'send' && canSend
                  ? `color-mix(in srgb, ${$('--text-secondary')} 25%, transparent)`
                  : `color-mix(in srgb, ${$('--text-secondary')} 15%, transparent)`,
              transition: 'all 0.15s ease-in-out',
            }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
});

MessageInput.displayName = 'MessageInput';
