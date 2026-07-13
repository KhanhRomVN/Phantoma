import React, { useState, useMemo, useEffect } from "react";
import { Search, ChevronRight, ChevronLeft } from "lucide-react";
import { Drawer, DrawerHeader } from "@renderer/components/ui/Drawer";
import { Tooltip } from "@renderer/components/ui/Tooltip";
import { Input } from "@renderer/components/ui/Input";
import { Button } from "@renderer/components/ui/Button";
import { cn } from "@renderer/shared/lib/utils";

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

// ─── Model Tooltip Content ───────────────────────────────────────────────────
const BoolBadge: React.FC<{ value: boolean }> = ({ value }) => (
  <span className={cn('font-semibold', value ? 'text-[#4ade80]' : 'text-[#ef4444]')}>
    {value ? '✓' : '✗'}
  </span>
);

const ModelTooltipContent: React.FC<{ model: any }> = ({ model }) => {
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

  return (
    <div className="w-[210px]">
      <div className="font-bold mb-1.5 text-xs border-b border-divider pb-[5px]">
        {model.name}
      </div>
      {model.description && (
        <div className="mb-2 pb-1.5 border-b border-divider text-[10.5px] opacity-85 italic leading-relaxed max-h-[60px] overflow-hidden line-clamp-3">
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

  useEffect(() => {
    if (isOpen) {
      setStep('model');
      setSearchQuery('');
      setAccountSearchQuery('');
      setSelectedModel(null);
      setProviderAccounts([]);

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
            console.warn('[Phantoma][Drawer] Accounts fetch failed or empty:', result);
          }
        })
        .catch((err) => console.error('[Phantoma][Drawer] Accounts fetch error:', err))
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
            console.warn('[Phantoma][Drawer] No accounts in response:', result);
          }
        })
        .catch((err) => console.error('[Phantoma][Drawer] Provider accounts fetch error:', err))
        .finally(() => {
          if (isMounted) setIsLoadingAccounts(false);
        });
      return () => {
        isMounted = false;
      };
    }
    return undefined;
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

  return (
    <Drawer isOpen={isOpen} onClose={onClose} height="85%" strategy="absolute">
      <DrawerHeader
        title={step === 'model' ? 'Quick Switch' : 'Select Account'}
        description={
          step === 'model'
            ? 'Choose a model and account to get started'
            : step === 'account' && selectedModel
              ? `${selectedModel.provider_id}/${selectedModel.id}`
              : undefined
        }
        onClose={onClose}
      >
        {step === 'account' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStep('model');
              setAccountSearchQuery('');
            }}
            className="p-1 -ml-1.5 mt-1"
          >
            <ChevronLeft size={16} />
            Back
          </Button>
        )}
      </DrawerHeader>

      {step === 'model' ? (
        <div className="flex-1 flex flex-col overflow-hidden p-3">
          {/* Search */}
          <div className="mb-3 shrink-0">
            <Input
              leftIcon={<Search size={14} />}
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto min-h-0">
            {filteredProviders.map((provider) => {
              const accountCount = accountCountMap[provider.provider_id] ?? 0;
              const hasModels = provider.models.length > 0;
              const hasAccounts = accountCount > 0;

              return (
                <div key={provider.provider_id} className="mb-4">
                  {/* Provider header */}
                  <div className="flex items-center gap-1.5 text-[13px] font-bold pb-[5px] mb-2 border-b border-divider text-text-primary">
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
                        <Tooltip
                          key={model.id}
                          content={<ModelTooltipContent model={model} />}
                          side="right"
                          sideOffset={12}
                          className="w-full"
                        >
                          <div
                            onClick={() => {
                              if (isDisabled) return;
                              setSelectedModel({
                                ...model,
                                provider_id: provider.provider_id,
                              });
                              setStep('account');
                            }}
                            className={cn(
                              'flex items-center justify-between px-3 py-[7px] rounded transition-colors duration-150',
                              isDisabled
                                ? 'cursor-not-allowed opacity-45'
                                : 'cursor-pointer opacity-100 hover:bg-card-hover'
                            )}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <span className="text-xs font-normal text-text-secondary">
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
                                className="opacity-50 text-text-secondary"
                              />
                            )}
                          </div>
                        </Tooltip>
                      );
                    })}
                </div>
              );
            })}

            {filteredProviders.length === 0 && (
              <div className="text-center p-5 text-xs text-text-secondary">
                No models found
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Account step */
        <div className="flex-1 flex flex-col overflow-hidden p-3">
          <div className="mb-3 shrink-0">
            <Input
              leftIcon={<Search size={14} />}
              placeholder="Search accounts..."
              value={accountSearchQuery}
              onChange={(e) => setAccountSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto min-h-0">
            {isLoadingAccounts ? (
              <div className="text-center p-5 text-xs text-text-secondary">
                Loading accounts...
              </div>
            ) : providerAccounts.length > 0 ? (
              (() => {
                const filtered = providerAccounts.filter((acc) =>
                  (acc.email || '').toLowerCase().includes(accountSearchQuery.toLowerCase()),
                );
                if (filtered.length === 0) {
                  return (
                    <div className="text-center p-5 text-xs text-text-secondary">
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
                    className="flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors duration-200 hover:bg-card-hover"
                  >
                    <span className="text-[13px] font-normal text-text-primary">
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
              <div className="text-center p-5 text-xs text-text-secondary">
                No accounts available for this provider.
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
};

export default ModelAccountDrawer;