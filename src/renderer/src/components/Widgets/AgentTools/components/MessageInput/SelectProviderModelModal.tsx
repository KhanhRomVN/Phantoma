import { memo, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { Search, X, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { $ } from '@renderer/utils/color';
import { getFaviconUrl } from '@renderer/utils/favicon';
import type { ProviderOption } from './types';

interface SelectProviderModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: ProviderOption[];
  isLoading?: boolean;
  currentProviderId?: string;
  currentModel?: string;
  onSelect: (provider: ProviderOption, model: string) => void;
}

const SHEET_BREAKPOINT = 640;
const MODAL_WIDTH = 480;


const SelectProviderModelModal = memo<SelectProviderModelModalProps>(
  ({ isOpen, onClose, providers, isLoading = false, currentProviderId, currentModel, onSelect }) => {
    const [query, setQuery] = useState('');
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

    useEffect(() => {
      if (!isOpen) return;
      setQuery('');
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
      window.addEventListener('keydown', onKey);
      window.addEventListener('resize', onResize);
      onResize();
      return () => {
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('resize', onResize);
      };
    }, [isOpen, onClose]);

    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      return providers
        .map((p) => {
          const nameMatch = p.name.toLowerCase().includes(q);
          const models = nameMatch ? p.models : p.models.filter((m) => m.toLowerCase().includes(q));
          return { ...p, models };
        })
        .filter((p) => p.models.length > 0)
        .sort(
          (a, b) =>
            Number(b.id === currentProviderId) - Number(a.id === currentProviderId)
        );
    }, [providers, query, currentProviderId]);

    const toggle = (id: string) => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    if (!isOpen) return null;

    const isWide = viewport.w > SHEET_BREAKPOINT;
    const panelStyle: React.CSSProperties = isWide
      ? {
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          margin: 'auto',
          width: Math.min(MODAL_WIDTH, viewport.w - 32),
          height: Math.min(560, viewport.h * 0.85),
          border: `1px solid ${$('--border')}`,
          borderRadius: '12px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          animation: 'aptFadeScale 0.2s ease-out',
        }
      : {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          height: '70%',
          borderTop: `1px solid ${$('--border')}`,
          boxShadow: '0 -8px 24px rgba(0,0,0,0.2)',
          animation: 'aptSlideUp 0.25s ease-out',
        };

    return ReactDOM.createPortal(
      <>
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(2px)',
            zIndex: 10000,
          }}
        />
        <div
          style={{
            ...panelStyle,
            backgroundColor: $('--background'),
            zIndex: 10001,
            display: 'flex',
            flexDirection: 'column',
            color: $('--text-primary'),
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${$('--border')}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '17px', fontWeight: 700 }}>Select Model</span>
              <span style={{ fontSize: '11px', color: $('--text-secondary'), opacity: 0.7 }}>
                Choose an agent and a model
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                color: $('--text-secondary'),
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ position: 'relative', padding: '12px 12px 0 12px', flexShrink: 0 }}>
            <div
              style={{
                position: 'absolute',
                left: '22px',
                top: '12px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <Search size={14} style={{ color: $('--text-secondary') }} />
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Search models..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 32px',
                fontSize: '13px',
                backgroundColor: `color-mix(in srgb, ${$('--text-primary')} 8%, ${$('--background')})`,
                border: 'none',
                borderRadius: '8px',
                color: $('--text-primary'),
                outline: 'none',
                boxSizing: 'border-box',
                height: '34px',
              }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {isLoading && providers.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  color: $('--text-secondary'),
                  padding: '20px',
                  fontSize: '12px',
                }}
              >
                Loading...
              </div>
            )}
            {filtered.map((provider) => {
              const isCollapsed = collapsed.has(provider.id);
              const favUrl = provider.url ? getFaviconUrl(provider.url, 32) : null;
              return (
                <div key={provider.id} style={{ marginBottom: '16px' }}>
                  <div
                    onClick={() => toggle(provider.id)}
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      paddingBottom: '5px',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    {favUrl && (
                      <img
                        src={favUrl}
                        alt=""
                        style={{ width: '16px', height: '16px', borderRadius: '3px', objectFit: 'contain' }}
                        onError={(e) => {
                          e.currentTarget.style.opacity = '0';
                        }}
                      />
                    )}
                    <span>{provider.name}</span>
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                      {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                    </span>
                  </div>

                  {!isCollapsed &&
                    provider.models.map((model) => {
                      const isCurrent = provider.id === currentProviderId && model === currentModel;
                      return (
                        <div
                          key={model}
                          onClick={() => {
                            onSelect(
                              providers.find((p) => p.id === provider.id) ?? provider,
                              model
                            );
                            onClose();
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--text-secondary')} 15%, transparent)`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              minWidth: 0,
                            }}
                          >
                            {model}
                          </span>
                          {isCurrent && (
                            <span
                              style={{
                                marginLeft: 'auto',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '9px',
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: `color-mix(in srgb, ${$('--success')} 16%, transparent)`,
                                color: $('--success'),
                                textTransform: 'uppercase',
                                flexShrink: 0,
                              }}
                            >
                              <Check size={10} />
                              In use
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              );
            })}
            {!isLoading && filtered.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  color: $('--text-secondary'),
                  padding: '20px',
                  fontSize: '12px',
                }}
              >
                No models found
              </div>
            )}
          </div>

          <style>{`
            @keyframes aptSlideUp {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes aptFadeScale {
              from { transform: scale(0.96); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      </>,
      document.body
    );
  }
);

SelectProviderModelModal.displayName = 'SelectProviderModelModal';

export default SelectProviderModelModal;