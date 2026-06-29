import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Search, ChevronRight, X, ChevronLeft } from 'lucide-react';
import { cn } from '@renderer/shared/lib/utils';

interface Provider {
  provider_id: string;
  provider_name: string;
  website: string;
  is_enabled: boolean;
  total_accounts?: number;
  models: any[];
}

interface Account {
  id: string;
  name?: string;
  email?: string;
  provider_id: string;
  is_enabled: boolean;
  usage?: string;
  reset_period?: string;
}

interface ModelAccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  providers: Provider[];
  apiUrl: string;
  onSelect: (model: {
    providerId: string;
    modelId: string;
    accountId?: string;
    email?: string;
  }) => void;
}

// ─── Model Tooltip ────────────────────────────────────────────────────────────
interface ModelTooltipProps {
  model: any;
  x: number;
  y: number;
}

const BoolBadge: React.FC<{ value: boolean }> = ({ value }) => (
  <span
    className={cn('font-semibold', value ? 'text-[#4ade80]' : 'text-[#ef4444]')}
  >
    {value ? '✓' : '✗'}
  </span>
);

const ModelTooltip: React.FC<ModelTooltipProps> = ({ model, x, y }) => {
  const hasImageUpload = model.is_image_upload === true || model.is_upload === true;
  const hasVideoUpload = model.is_video_upload === true;

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: 'Max Context',
      value:
        model.max_context_length != null || model.context_length != null ? (
          `${Number(model.max_context_length ?? model.context_length).toLocaleString()} tokens`
        ) : (
          <span className="opacity-40">—</span>
        ),
    },
    { label: 'Thinking', value: <BoolBadge value={!!model.is_thinking} /> },
    ...(model.is_search !== undefined
      ? [{ label: 'Search', value: <BoolBadge value={!!model.is_search} /> }]
      : []),
    ...(model.is_memory !== undefined
      ? [{ label: 'Memory', value: <BoolBadge value={!!model.is_memory} /> }]
      : []),
    ...(hasImageUpload ? [{ label: 'Image upload', value: <BoolBadge value={true} /> }] : []),
    ...(hasVideoUpload ? [{ label: 'Video upload', value: <BoolBadge value={true} /> }] : []),
  ];

  const TOOLTIP_W = 210;
  const TOOLTIP_H = 160;
  const OFFSET_X = 14;
  const OFFSET_Y = 10;
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;

  let left = x + OFFSET_X;
  let top = y + OFFSET_Y;
  if (left + TOOLTIP_W > viewW - 8) left = x - TOOLTIP_W - OFFSET_X;
  if (top + TOOLTIP_H > viewH - 8) top = y - TOOLTIP_H - OFFSET_Y;

  return (
    <div
      className="fixed rounded-md px-2.5 py-2 text-[11px] leading-relaxed pointer-events-none shadow-lg bg-[var(--vscode-editorHoverWidget-background,#1e1e1e)] border border-[var(--vscode-editorHoverWidget-border,#454545)] text-[var(--vscode-foreground)] z-[99999] shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
      style={{
        left,
        top,
        width: TOOLTIP_W,
      }}
    >
      <div className="font-bold mb-1.5 text-xs border-b border-b-[rgba(128,128,128,0.2)] pb-[5px]">
        {model.name}
      </div>
      {model.description && (
        <div
          className="mb-2 pb-1.5 border-b border-b-[rgba(128,128,128,0.15)] text-[10.5px] opacity-85 italic leading-relaxed max-h-[60px] overflow-hidden [-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical]"
        >
          {model.description}
        </div>
      )}
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-3">
          <span className="opacity-55">{r.label}</span>
          <span>{r.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ModelAccountDrawer: React.FC<ModelAccountDrawerProps> = ({
  isOpen,
  onClose,
  providers,
  apiUrl,
  onSelect,
}) => {
  const [step, setStep] = useState<'model' | 'account'>('model');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<any | null>(null);
  const [providerAccounts, setProviderAccounts] = useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');

  const [accountCountMap, setAccountCountMap] = useState<Record<string, number>>({});
  const [isLoadingAccountMap, setIsLoadingAccountMap] = useState(false);

  const [tooltipModel, setTooltipModel] = useState<{
    model: any;
    x: number;
    y: number;
  } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const activeRowRect = useRef<DOMRect | null>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };

      if (tooltipModel && activeRowRect.current) {
        const r = activeRowRect.current;
        const PADDING = 4;
        const outside =
          e.clientX < r.left - PADDING ||
          e.clientX > r.right + PADDING ||
          e.clientY < r.top - PADDING ||
          e.clientY > r.bottom + PADDING;
        if (outside) {
          setTooltipModel(null);
          activeRowRect.current = null;
        } else {
          setTooltipModel((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
        }
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [tooltipModel]);

  useEffect(() => {
    if (isOpen) {
      setStep('model');
      setSearchQuery('');
      setAccountSearchQuery('');
      setSelectedModel(null);
      setProviderAccounts([]);
      setTooltipModel(null);

      setIsLoadingAccountMap(true);
      fetch(`${apiUrl}/v1/accounts?page=1&limit=200`)
        .then((r) => r.json())
        .then((result) => {
          if (result.success && result.data?.accounts) {
            const map: Record<string, number> = {};
            for (const acc of result.data.accounts as any[]) {
              map[acc.provider_id] = (map[acc.provider_id] || 0) + 1;
            }
            setAccountCountMap(map);
          } else {
            console.warn('[QuickSwitchDrawer] Accounts fetch failed or empty:', result);
          }
        })
        .catch((err) => console.error('[QuickSwitchDrawer] Accounts fetch error:', err))
        .finally(() => setIsLoadingAccountMap(false));
    }
  }, [isOpen, apiUrl]);

  useEffect(() => {
    if (step === 'account' && selectedModel) {
      let isMounted = true;
      setIsLoadingAccounts(true);
      const url = `${apiUrl}/v1/accounts?page=1&limit=50&provider_id=${selectedModel.provider_id}`;
      fetch(url)
        .then((res) => res.json())
        .then((result) => {
          if (isMounted && result.success && result.data?.accounts) {
            setProviderAccounts(result.data.accounts);
          } else if (isMounted) {
            console.warn('[QuickSwitchDrawer] No accounts in response:', result);
          }
        })
        .catch((err) => console.error('[QuickSwitchDrawer] Provider accounts fetch error:', err))
        .finally(() => {
          if (isMounted) setIsLoadingAccounts(false);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [step, selectedModel, apiUrl]);

  const getFavicon = (url?: string) => {
    if (!url) return '';
    try {
      const u = new URL(url);
      return `${u.origin}/favicon.ico`;
    } catch {
      return '';
    }
  };

  const filteredProviders = useMemo(() => {
    const mapped = providers
      .filter((p) => p.is_enabled !== false)
      .map((provider) => {
        const filteredModels = (provider.models || []).filter(
          (m) =>
            (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.id || '').toLowerCase().includes(searchQuery.toLowerCase()),
        );
        return { ...provider, models: filteredModels };
      })
      .filter(
        (p) =>
          p.models.length > 0 ||
          (p.provider_name || '').toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const priority = (p: (typeof mapped)[0]) => {
      const hasModels = p.models.length > 0;
      const hasAccounts = (accountCountMap[p.provider_id] ?? 0) > 0;
      if (hasModels && hasAccounts) return 0;
      if (hasModels && !hasAccounts) return 1;
      if (!hasModels && hasAccounts) return 2;
      return 3;
    };

    const sorted = [...mapped].sort((a, b) => priority(a) - priority(b));
    return sorted;
  }, [providers, searchQuery, accountCountMap]);

  const handleModelMouseEnter = (model: any, e: React.MouseEvent<HTMLDivElement>) => {
    activeRowRect.current = e.currentTarget.getBoundingClientRect();
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => {
      const { x, y } = mousePos.current;
      setTooltipModel({ model, x, y });
    }, 100);
  };

  const handleModelMouseLeave = () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltipModel((prev) => {
      if (prev === null) return null;
      return prev;
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="absolute inset-0 flex flex-col overflow-hidden rounded-t-xl z-[1000] bg-[var(--primary-bg)] border-t border-[var(--border-color)] text-[var(--primary-text)] shadow-[0_-8px_24px_rgba(0,0,0,0.2)]"
        style={{ animation: 'slideUpDrawer 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-2.5 shrink-0 border-b border-b-[var(--border-color)] bg-[var(--secondary-bg)]">
          <div className="flex items-center gap-2">
            {step === 'account' && (
              <button
                onClick={() => {
                  setStep('model');
                  setAccountSearchQuery('');
                }}
                className="bg-transparent border-none cursor-pointer p-1 -ml-1.5 flex items-center transition-colors duration-200 text-[var(--secondary-text)]"
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--secondary-text)')}
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <span className="text-xs font-semibold uppercase tracking-wider">
              {step === 'model' ? 'Quick Switch' : 'Select Account'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {step === 'account' && selectedModel && (
              <div className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded text-[var(--secondary-text)] bg-[var(--hover-bg)]">
                {(() => {
                  const provider = providers.find(
                    (p) => p.provider_id === selectedModel.provider_id,
                  );
                  const faviconUrl = getFavicon(provider?.website);
                  return (
                    faviconUrl && (
                      <img
                        src={faviconUrl}
                        alt=""
                        className="w-3 h-3 rounded-[2px]"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    )
                  );
                })()}
                <span className="font-medium">
                  {selectedModel.provider_id}/{selectedModel.id}
                </span>
              </div>
            )}
            <button
              onClick={onClose}
              className="bg-transparent border-none cursor-pointer p-1 flex items-center text-[var(--secondary-text)]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {step === 'model' ? (
          <div className="flex flex-col h-full overflow-hidden p-3">
            {/* Search */}
            <div className="relative mb-3 shrink-0">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--secondary-text)]"
              />
              <input
                autoFocus
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-[30px] pr-2.5 py-1.5 rounded text-sm outline-none box-border bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--primary-text)]"
              />
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto">
              {filteredProviders.map((provider) => {
                const accountCount = accountCountMap[provider.provider_id] ?? 0;
                const hasModels = provider.models.length > 0;
                const hasAccounts = accountCount > 0;

                return (
                  <div key={provider.provider_id} className="mb-4">
                    {/* Provider header */}
                    <div className="flex items-center gap-1.5 text-[13px] font-bold pb-[5px] mb-2 border-b border-b-[var(--border-color)] text-[var(--primary-text)]">
                      {getFavicon(provider.website) && (
                        <img
                          src={getFavicon(provider.website)}
                          alt="favicon"
                          className="w-3.5 h-3.5 rounded-[2px]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      {provider.provider_name || provider.provider_id}
                      {!isLoadingAccountMap && (
                        <span className="ml-auto text-[11px] font-normal opacity-55">
                          {accountCount} account{accountCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* No accounts warning */}
                    {!isLoadingAccountMap && !hasAccounts && (
                      <div className="flex items-center gap-1.5 px-2.5 py-[7px] mb-1.5 rounded text-[11.5px] bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.3)] text-[#eab308]">
                        <span>⚠</span>
                        <span>No accounts added for this provider</span>
                      </div>
                    )}

                    {/* No models warning */}
                    {!hasModels && (
                      <div className="flex items-center gap-1.5 px-2.5 py-[7px] rounded text-[11.5px] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] text-[#ef4444]">
                        <span>✕</span>
                        <span>No models available for this provider</span>
                      </div>
                    )}

                    {/* Model rows */}
                    {hasModels &&
                      provider.models.map((model) => {
                        const isDisabled = !hasAccounts;
                        return (
                          <div
                            key={model.id}
                            onClick={() => {
                              if (isDisabled) return;
                              setSelectedModel({
                                ...model,
                                provider_id: provider.provider_id,
                              });
                              setStep('account');
                            }}
                            onMouseEnter={(e) => {
                              if (!isDisabled)
                                e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                              handleModelMouseEnter(model, e);
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              handleModelMouseLeave();
                            }}
                            className={cn(
                              'flex items-center justify-between px-3 py-[7px] rounded',
                              isDisabled
                                ? 'cursor-not-allowed opacity-45'
                                : 'cursor-pointer opacity-100'
                            )}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <span className="text-xs font-normal text-[var(--secondary-text)]">
                                {model.name}
                              </span>
                              {model.success_rate != null && (
                                <span
                                  className={cn(
                                    'text-[10.5px]',
                                    model.success_rate >= 80
                                      ? 'text-[#4ade80]'
                                      : model.success_rate >= 50
                                        ? 'text-[#facc15]'
                                        : 'text-[#f87171]'
                                  )}
                                >
                                  {model.success_rate.toFixed(1)}% success
                                </span>
                              )}
                            </div>
                            {!isDisabled && (
                              <ChevronRight
                                size={13}
                                className="opacity-50 text-[var(--secondary-text)]"
                              />
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              })}

              {filteredProviders.length === 0 && (
                <div className="text-center p-5 text-xs text-[var(--secondary-text)]">
                  No models found
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Account step */
          <div className="flex flex-col h-full overflow-hidden p-3">
            <div className="relative mb-3 shrink-0">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--secondary-text)]"
              />
              <input
                autoFocus
                type="text"
                placeholder="Search accounts..."
                value={accountSearchQuery}
                onChange={(e) => setAccountSearchQuery(e.target.value)}
                className="w-full pl-[30px] pr-2.5 py-1.5 rounded text-sm outline-none box-border bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--primary-text)]"
              />
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto">
              {isLoadingAccounts ? (
                <div className="text-center p-5 text-xs text-[var(--secondary-text)]">
                  Loading accounts...
                </div>
              ) : providerAccounts.length > 0 ? (
                (() => {
                  const filtered = providerAccounts.filter((acc) =>
                    (acc.email || '').toLowerCase().includes(accountSearchQuery.toLowerCase()),
                  );
                  if (filtered.length === 0) {
                    return (
                      <div className="text-center p-5 text-xs text-[var(--secondary-text)]">
                        No accounts match your search.
                      </div>
                    );
                  }
                  return filtered.map((acc) => (
                    <div
                      key={acc.id}
                      onClick={() => {
                        onSelect({
                          providerId: selectedModel.provider_id,
                          modelId: selectedModel.id,
                          accountId: acc.id,
                          email: acc.email,
                        });
                        onClose();
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors duration-200"
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = 'var(--hover-bg)')
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span className="text-[13px] font-normal text-[var(--primary-text)]">
                        {acc.email || acc.name || acc.id}
                      </span>
                      {acc.usage && (
                        <span
                          className={cn(
                            'text-[11px] px-1.5 py-0.5 rounded font-medium',
                            acc.usage.includes('5/5') ||
                            acc.usage.toLowerCase().includes('limit') ||
                            acc.usage.toLowerCase().includes('unknown')
                              ? 'bg-[rgba(239,68,68,0.12)] text-[#f87171] border border-[rgba(239,68,68,0.2)]'
                              : 'bg-[rgba(34,197,94,0.12)] text-[#4ade80] border border-[rgba(34,197,94,0.2)]'
                          )}
                        >
                          {acc.usage}
                        </span>
                      )}
                    </div>
                  ));
                })()
              ) : (
                <div className="text-center p-5 text-xs text-[var(--secondary-text)]">
                  No accounts available for this provider.
                </div>
              )}
            </div>
          </div>
        )}

        <style>{`
          @keyframes slideUpDrawer {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>

      {/* Tooltip via portal */}
      {tooltipModel &&
        ReactDOM.createPortal(
          <ModelTooltip model={tooltipModel.model} x={tooltipModel.x} y={tooltipModel.y} />,
          document.body,
        )}
    </>
  );
};

export default ModelAccountDrawer;