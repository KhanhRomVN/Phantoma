import React, { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAgentRoot } from '../../context/AgentRootContext';
import { useAccountAgents } from '../../context/WorkflowAgentContext';
import {
  Search,
  ChevronRight,
  ChevronDown,
  X,
  ChevronLeft,
  Brain,
  Circle,
  Video,
  Image,
  Activity,
  Coins,
  Volume2,
  ImagePlus,
  Film,
  SearchCheck,
  BarChart3,
  Clock,
  Key,
  RefreshCw,
} from 'lucide-react';
import { $ } from '@renderer/utils/color';
import { formatRelativeTime } from '@renderer/utils/relativeTime';
import { getFaviconUrl } from '@renderer/shared/utils/faviconUtils';
import { DEFAULT_EFFORT, EFFORT_LABEL, EFFORT_LEVELS, splitModelAndEffort } from './EffortDropdown';
import type { EffortLevel } from './EffortDropdown';
import { accountsKey, cacheGet, cacheSet } from './providerModelCache';
import { compareAccountsByUsage } from '../../utils/accountSort';
import {
  ICON_METHODS,
  authIconFile,
  splitAuthMethod,
} from '../../feature/Account/components/addAccount.utils';

interface Provider {
  provider_id: string;
  provider_name: string;
  website: string;
  is_enabled: boolean;
  models: any[];
  models_error?: string;
  auth_method?: string | string[] | null;
}

interface Account {
  id: string;
  name?: string;
  email?: string;
  provider_id: string;
  usage?: number;
  reset_usage_at?: string;
  period_requests?: number;
  period_tokens?: number;
  last_used_at?: number | null;
  used_by_windows?: number;
  used_by_projects?: string[];
  auth_method?: string | null;
}

interface SelectModelAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: Provider[];
  isLoadingProviders?: boolean;
  apiUrl: string;
  onRefresh?: () => void;
  /** Scope cache (theo database manager đang active) */
  cacheScope?: string;
  /** Provider/model/account đang dùng — ưu tiên lên đầu và gắn badge */
  currentProviderId?: string;
  currentModelId?: string;
  currentAccountId?: string;
  currentEffort?: EffortLevel;
  /** Hiển thị bộ chọn effort ở bước chọn model (chỉ dùng cho CreateAgentRenderer) */
  showEffort?: boolean;
  /** accountId -> các loại agent (planner, executor, ...) đang dùng account đó */
  accountAgents?: Record<string, string[]>;
  onSelect: (model: {
    providerId: string;
    modelId: string;
    accountId?: string;
    email?: string;
    accountProviderId?: string;
    usage?: number | null;
    period_requests?: number | null;
    period_tokens?: number | null;
  }) => void;
}

const BoolBadge: React.FC<{ value: boolean }> = ({ value }) => (
  <span style={{ color: value ? $('--success') : $('--error'), fontWeight: 600 }}>
    {value ? '\u2713' : '\u2717'}
  </span>
);

const formatContextLength = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${Math.round(n / 1000)}K`;
  return n.toLocaleString();
};

const formatTokens = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
};

const getAgentTypeColor = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'orchestrator':
      return $('--purple');
    case 'planner':
      return $('--blue');
    case 'executor':
      return $('--green');
    case 'reviewer':
      return $('--yellow');
    case 'design':
      return $('--pink');
    default:
      return $('--teal');
  }
};

const ModelTooltip: React.FC<{ model: any; x: number; y: number }> = ({ model, x, y }) => {
  const hasImageUpload = model.is_image_upload === true;
  const hasVideoUpload = model.is_video_upload === true;
  const hasAudioUpload = model.is_audio_upload === true;
  const hasImageGenerator = model.is_image_generator === true;
  const hasVideoGenerator = model.is_video_generator === true;
  const hasDeepResearch = model.is_deep_research === true;

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: 'Max Context',
      value:
        model.max_context_length != null || model.context_length != null ? (
          `${Number(model.max_context_length ?? model.context_length).toLocaleString()} tokens`
        ) : (
          <span style={{ opacity: 0.4 }}>\u2014</span>
        ),
    },
    { label: 'Thinking', value: <BoolBadge value={!!model.is_thinking} /> },
    ...(model.is_search !== undefined
      ? [{ label: 'Search', value: <BoolBadge value={!!model.is_search} /> }]
      : []),
    ...(hasImageUpload ? [{ label: 'Image upload', value: <BoolBadge value={true} /> }] : []),
    ...(hasVideoUpload ? [{ label: 'Video upload', value: <BoolBadge value={true} /> }] : []),
    ...(hasAudioUpload ? [{ label: 'Audio upload', value: <BoolBadge value={true} /> }] : []),
    ...(hasImageGenerator ? [{ label: 'Image generator', value: <BoolBadge value={true} /> }] : []),
    ...(hasVideoGenerator ? [{ label: 'Video generator', value: <BoolBadge value={true} /> }] : []),
    ...(hasDeepResearch ? [{ label: 'Deep research', value: <BoolBadge value={true} /> }] : []),
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
      style={{
        position: 'fixed',
        left,
        top,
        width: TOOLTIP_W,
        backgroundColor: $('--tooltip-background'),
        border: `1px solid ${$('--border')}`,
        borderRadius: '6px',
        padding: '8px 10px',
        fontSize: '11px',
        color: $('--text-primary'),
        lineHeight: 1.7,
        pointerEvents: 'none',
        zIndex: 99999,
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: '6px',
          fontSize: '12px',
          borderBottom: `1px solid ${$('--divider')}`,
          paddingBottom: '5px',
        }}
      >
        {model.name}
      </div>
      {model.description && (
        <div
          style={{
            marginBottom: '8px',
            paddingBottom: '6px',
            borderBottom: `1px solid ${$('--divider')}`,
            fontSize: '10.5px',
            opacity: 0.85,
            fontStyle: 'italic',
            lineHeight: 1.4,
            maxHeight: '60px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {model.description}
        </div>
      )}
      {rows.map((r) => (
        <div
          key={r.label}
          style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}
        >
          <span style={{ opacity: 0.55 }}>{r.label}</span>
          <span>{r.value}</span>
        </div>
      ))}
    </div>
  );
};

function DrawerSkeletonLine({
  width,
  height = 10,
  radius = 4,
}: {
  width: string | number;
  height?: number;
  radius?: number;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: `color-mix(in srgb, ${$('--text-secondary')} 15%, transparent)`,
        animation: 'drawerShimmer 1.4s ease-in-out infinite',
      }}
    />
  );
}

function ModelListSkeleton() {
  return (
    <div>
      {[0, 1, 2].map((pi) => (
        <div key={pi} style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <DrawerSkeletonLine width={16} height={16} radius={3} />
            <DrawerSkeletonLine width={120} height={13} />
          </div>
          {[0, 1].map((mi) => (
            <div
              key={mi}
              style={{
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <DrawerSkeletonLine width="45%" height={12} />
              <DrawerSkeletonLine width="70%" height={9} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function AccountListSkeleton() {
  return (
    <div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <DrawerSkeletonLine width={28} height={28} radius={7} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <DrawerSkeletonLine width="60%" height={11} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <DrawerSkeletonLine width={52} height={9} />
              <DrawerSkeletonLine width={52} height={9} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const EffortTabs: React.FC<{
  effort: EffortLevel;
  options: EffortLevel[];
  onChange: (effort: EffortLevel) => void;
}> = ({ effort, options, onChange }) => {
  const colors: Record<EffortLevel, string> = {
    low: $('--text-secondary'),
    medium: $('--blue'),
    high: $('--green'),
    xhigh: $('--yellow'),
    max: $('--red'),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '12px', color: $('--text-secondary') }}>Effort</span>
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: '4px',
          padding: '3px',
          borderRadius: '8px',
          backgroundColor: `color-mix(in srgb, ${$('--text-primary')} 6%, transparent)`,
        }}
      >
        {options.map((lvl) => {
          const isActive = lvl === effort;
          return (
            <button
              key={lvl}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(lvl)}
              style={{
                flex: 1,
                padding: '5px 0',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: isActive ? colors[lvl] : $('--text-secondary'),
                backgroundColor: isActive
                  ? `color-mix(in srgb, ${colors[lvl]} 15%, transparent)`
                  : 'transparent',
              }}
            >
              {EFFORT_LABEL[lvl]}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const SelectModelAccountModal: React.FC<SelectModelAccountModalProps> = ({
  isOpen,
  onClose,
  providers,
  isLoadingProviders = false,
  apiUrl,
  onRefresh,
  cacheScope,
  currentProviderId,
  currentModelId,
  currentAccountId,
  currentEffort,
  showEffort = false,
  accountAgents,
  onSelect,
}) => {
  const agentRoot = useAgentRoot();
  const contextAccountAgents = useAccountAgents();
  const agentsByAccount = accountAgents ?? contextAccountAgents;

  const [pickedEffortLevel, setPickedEffortLevel] = useState<EffortLevel>(
    currentEffort ?? DEFAULT_EFFORT,
  );
  const [step, setStep] = useState<'model' | 'account'>('model');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<any | null>(null);
  const [providerAccounts, setProviderAccounts] = useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [collapsedProviders, setCollapsedProviders] = useState<Set<string>>(new Set());
  const [tooltipModel, setTooltipModel] = useState<{ model: any; x: number; y: number } | null>(
    null,
  );
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const activeRowRect = useRef<DOMRect | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep('model');
    setSearchQuery('');
    setAccountSearchQuery('');
    setSelectedModel(null);
    setProviderAccounts([]);
    setTooltipModel(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Hide tooltip khi con trỏ ra ngoài row
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

  // Fetch accounts khi bước sang account (poll 15s)
  useEffect(() => {
    if (step !== 'account' || !selectedModel || !apiUrl) return;
    let isMounted = true;

    const cacheKey = accountsKey(cacheScope ?? 'default', selectedModel.provider_id);
    const cachedAccounts = cacheGet<Account[]>(cacheKey);
    if (cachedAccounts) setProviderAccounts(cachedAccounts);

    const load = (showLoading: boolean) => {
      if (showLoading && !cachedAccounts) setIsLoadingAccounts(true);
      fetch(
        `${apiUrl}/v1/accounts?page=1&limit=50&provider_id=${encodeURIComponent(selectedModel.provider_id)}`,
      )
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.data?.accounts) {
            cacheSet(cacheKey, result.data.accounts);
            if (isMounted) setProviderAccounts(result.data.accounts);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted && showLoading) setIsLoadingAccounts(false);
        });
    };

    load(true);
    const id = setInterval(() => load(false), 15000);
    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, [step, selectedModel, apiUrl, cacheScope]);

  const providerNeedsAuth = (provider: Provider): boolean => {
    const raw = (provider as any).auth_method ?? (provider as any).auth_methods;
    if (!raw) return false;
    if (Array.isArray(raw))
      return raw.filter((m: any) => typeof m === 'string' && m.length > 0).length > 0;
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw.trim());
        return Array.isArray(parsed) ? parsed.filter((m: any) => m).length > 0 : false;
      } catch {
        return (
          raw
            .trim()
            .split(/[,;|\s]+/)
            .filter((m: string) => m.length > 0).length > 0
        );
      }
    }
    return false;
  };

  const filteredProviders = useMemo(() => {
    const mapped = (providers || [])
      .filter((p) => p.is_enabled !== false)
      .map((provider) => {
        const providerNameMatch = (provider.provider_name || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const filteredModels = providerNameMatch
          ? provider.models || []
          : (provider.models || []).filter(
              (m) =>
                (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (m.id || '').toLowerCase().includes(searchQuery.toLowerCase()),
            );
        return { ...provider, models: filteredModels };
      })
      .filter((p) => p.models.length > 0 || !!(p as any).models_error);

    return [...mapped].sort((a, b) => {
      const aIsCurrent = a.provider_id === currentProviderId ? 0 : 1;
      const bIsCurrent = b.provider_id === currentProviderId ? 0 : 1;
      if (aIsCurrent !== bIsCurrent) return aIsCurrent - bIsCurrent;
      const aHas = a.models.length > 0 ? 0 : 1;
      const bHas = b.models.length > 0 ? 0 : 1;
      return aHas - bHas;
    });
  }, [providers, searchQuery, currentProviderId]);

  const handleModelMouseEnter = (model: any, e: React.MouseEvent<HTMLDivElement>) => {
    activeRowRect.current = e.currentTarget.getBoundingClientRect();
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => {
      const { x, y } = mousePos.current;
      setTooltipModel({ model, x, y });
    }, 100);
  };

  const toggleProvider = (providerId: string) => {
    setCollapsedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) next.delete(providerId);
      else next.add(providerId);
      return next;
    });
  };

  const [containerSize, setContainerSize] = useState(() => {
    const r = (agentRoot ?? document.body).getBoundingClientRect();
    return { width: r.width, height: r.height };
  });

  useLayoutEffect(() => {
    if (!isOpen) return;
    const el = agentRoot ?? document.body;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setContainerSize({ width: r.width, height: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen, agentRoot]);

  // ASSUMED: panel rộng hơn 640px thì coi là vượt chuẩn bottom sheet
  const MAX_SHEET_WIDTH = 640;
  const MODAL_MAX_WIDTH = 560;
  const isWide = containerSize.width > MAX_SHEET_WIDTH;
  const modalWidth = Math.min(MODAL_MAX_WIDTH, Math.max(containerSize.width - 32, 0));
  const modalHeight = Math.min(modalWidth * 1.1, containerSize.height * 0.9);

  const panelLayoutStyle: React.CSSProperties = isWide
    ? {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        margin: 'auto',
        width: modalWidth,
        height: modalHeight,
        border: `1px solid ${$('--border')}`,
        borderRadius: '12px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        animation: 'pmdFadeScaleModal 0.2s ease-out',
      }
    : {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: '70%',
        maxHeight: '70%',
        borderTop: `1px solid ${$('--border')}`,
        boxShadow: '0 -8px 24px rgba(0,0,0,0.2)',
        animation: 'pmdSlideUpDrawer 0.25s ease-out',
      };

  if (!isOpen) return null;

  // Find the closest ancestor with overflow hidden or specific ID to constrain portal
  const getContainer = () => {
    if (agentRoot) return agentRoot;
    // Fallback to body if not found (e.g., in other contexts)
    return document.body;
  };

  return ReactDOM.createPortal(
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(2px)',
          zIndex: 10000,
        }}
      />
      {/* Panel */}
      <div
        style={{
          ...panelLayoutStyle,
          backgroundColor: $('--background'),
          zIndex: 10001,
          display: 'flex',
          flexDirection: 'column',
          color: $('--text-primary'),
          overflow: 'hidden',
        }}
      >
        {/* Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {step === 'account' && (
              <button
                onClick={() => {
                  setStep('model');
                  setAccountSearchQuery('');
                }}
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
                <ChevronLeft size={16} />
              </button>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '17px', fontWeight: 700, color: $('--text-primary') }}>
                {step === 'model' ? 'Select Model' : 'Select Account'}
              </span>
              <span style={{ fontSize: '11px', color: $('--text-secondary'), opacity: 0.7 }}>
                {step === 'model'
                  ? 'Choose a model to continue'
                  : selectedModel
                    ? `${selectedModel.provider_id}/${selectedModel.id}`
                    : ''}
              </span>
            </div>
          </div>
          <button
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

        {step === 'model' ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
            }}
          >
            {/* Search */}
            <div
              style={{
                position: 'relative',
                padding: '12px 12px 0 12px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div style={{ position: 'relative', flex: 1 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: 0,
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isLoadingProviders}
                  title="Refresh models"
                  style={{
                    flexShrink: 0,
                    width: '34px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: $('--background'),
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isLoadingProviders ? 'not-allowed' : 'pointer',
                    color: $('--text-secondary'),
                    opacity: isLoadingProviders ? 0.5 : 1,
                  }}
                >
                  <RefreshCw
                    size={14}
                    style={{
                      animation: isLoadingProviders ? 'pmdSpin 1s linear infinite' : 'none',
                    }}
                  />
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {isLoadingProviders ? (
                <ModelListSkeleton />
              ) : (
                filteredProviders.map((provider) => {
                  const hasModels = provider.models.length > 0;
                  const needsAuth = providerNeedsAuth(provider);
                  const isCollapsed = collapsedProviders.has(provider.provider_id);

                  return (
                    <div key={provider.provider_id} style={{ marginBottom: '16px' }}>
                      <div
                        onClick={() => toggleProvider(provider.provider_id)}
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: $('--text-primary'),
                          paddingBottom: '5px',
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        {(() => {
                          const favUrl = getFaviconUrl(provider.website);
                          if (!favUrl) return null;
                          return (
                            <div
                              style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '3px',
                                backgroundColor: `color-mix(in srgb, ${$('--text-secondary')} 10%, transparent)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                flexShrink: 0,
                              }}
                            >
                              <img
                                src={favUrl}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.opacity = '0';
                                }}
                              />
                            </div>
                          );
                        })()}
                        {provider.provider_name || provider.provider_id}
                        {provider.models_error &&
                          (() => {
                            const isNoAcc = provider.models_error.startsWith('No accounts');
                            const errColor = isNoAcc ? $('--warn') : $('--error');
                            return (
                              <span
                                title={provider.models_error}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '10px',
                                  fontWeight: 500,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: `color-mix(in srgb, ${errColor} 10%, transparent)`,
                                  color: errColor,
                                  maxWidth: '200px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {isNoAcc ? 'No accounts' : 'Error'}
                              </span>
                            );
                          })()}
                        {needsAuth && (
                          <span
                            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}
                          >
                            {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                          </span>
                        )}
                      </div>

                      {!isCollapsed &&
                        hasModels &&
                        (() => {
                          const seen = new Set<string>();
                          const deduped = provider.models.filter((m: any) => {
                            const { base } = splitModelAndEffort(m.id);
                            if (seen.has(base)) return false;
                            seen.add(base);
                            return true;
                          });
                          const isCurrentProvider = provider.provider_id === currentProviderId;
                          const currentBase = currentModelId
                            ? splitModelAndEffort(currentModelId).base
                            : null;
                          const isCurrentModelRow = (m: any) =>
                            isCurrentProvider &&
                            currentBase !== null &&
                            splitModelAndEffort(m.id).base === currentBase;
                          return [...deduped]
                            .sort(
                              (a: any, b: any) =>
                                Number(isCurrentModelRow(b)) - Number(isCurrentModelRow(a)),
                            )
                            .map((model: any) => {
                              const isCurrentModel = isCurrentModelRow(model);
                              const successColor =
                                model.success_rate >= 80
                                  ? $('--success')
                                  : model.success_rate >= 50
                                    ? $('--yellow')
                                    : $('--red');
                              return (
                                <div
                                  key={model.id}
                                  onClick={() => {
                                    const { base: baseId } = splitModelAndEffort(model.id);
                                    const availableEfforts = (provider.models as any[])
                                      .map((m: any) => splitModelAndEffort(m.id))
                                      .filter((p) => p.base === baseId && p.effort !== null)
                                      .map((p) => p.effort as EffortLevel);
                                    const pickedEffort =
                                      currentEffort && availableEfforts.includes(currentEffort)
                                        ? currentEffort
                                        : availableEfforts.includes(DEFAULT_EFFORT)
                                          ? DEFAULT_EFFORT
                                          : EFFORT_LEVELS.find((lvl) =>
                                              availableEfforts.includes(lvl),
                                            );
                                    const finalModelId = pickedEffort
                                      ? `${baseId}-${pickedEffort}`
                                      : model.id;

                                    if (needsAuth) {
                                      setPickedEffortLevel(pickedEffort ?? DEFAULT_EFFORT);
                                      setSelectedModel({
                                        ...model,
                                        id: finalModelId,
                                        provider_id: provider.provider_id,
                                        effortBase: baseId,
                                        effortOptions: EFFORT_LEVELS.filter((lvl) =>
                                          availableEfforts.includes(lvl),
                                        ),
                                      });
                                      setStep('account');
                                    } else {
                                      onSelect({
                                        providerId: provider.provider_id,
                                        modelId: finalModelId,
                                      });
                                      onClose();
                                    }
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--text-secondary')} 15%, transparent)`;
                                    handleModelMouseEnter(model, e);
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                  style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: $('--text-primary'),
                                      }}
                                    >
                                      {splitModelAndEffort(model.id).base === model.id
                                        ? model.name
                                        : (() => {
                                            const suffixes = [
                                              'Low',
                                              'Medium',
                                              'High',
                                              'Extra',
                                              'Max',
                                            ];
                                            let baseName = model.name;
                                            for (const s of suffixes) {
                                              if (baseName.endsWith(` ${s}`)) {
                                                baseName = baseName.slice(0, -(s.length + 1));
                                                break;
                                              }
                                            }
                                            return baseName;
                                          })()}
                                    </span>
                                    {isCurrentModel && (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          fontSize: '9px',
                                          fontWeight: 600,
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                          backgroundColor: `color-mix(in srgb, ${$('--success')} 16%, transparent)`,
                                          color: $('--success'),
                                          textTransform: 'uppercase',
                                        }}
                                      >
                                        In use
                                      </span>
                                    )}
                                    {model.is_thinking && (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          fontSize: '10px',
                                          fontWeight: 500,
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                          backgroundColor: `color-mix(in srgb, ${$('--purple')} 12%, transparent)`,
                                          color: $('--purple'),
                                        }}
                                      >
                                        <Brain size={11} />
                                        Thinking
                                      </span>
                                    )}
                                    {model.is_search && (
                                      <Search size={12} style={{ color: $('--text-secondary') }} />
                                    )}
                                    {model.max_context_length != null && (
                                      <span
                                        style={{
                                          fontSize: '10.5px',
                                          color: $('--text-secondary'),
                                          opacity: 0.7,
                                        }}
                                      >
                                        {formatContextLength(model.max_context_length)}
                                      </span>
                                    )}
                                    {model.is_video_upload && (
                                      <Video size={12} style={{ color: $('--violet') }} />
                                    )}
                                    {model.is_audio_upload && (
                                      <Volume2 size={12} style={{ color: $('--yellow') }} />
                                    )}
                                    {model.is_image_upload && (
                                      <Image size={12} style={{ color: $('--green') }} />
                                    )}
                                    {model.is_image_generator && (
                                      <ImagePlus size={12} style={{ color: $('--pink') }} />
                                    )}
                                    {model.is_video_generator && (
                                      <Film size={12} style={{ color: $('--purple') }} />
                                    )}
                                    {model.is_deep_research && (
                                      <SearchCheck size={12} style={{ color: $('--teal') }} />
                                    )}
                                    {model.success_rate != null && (
                                      <span
                                        style={{
                                          marginLeft: 'auto',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          fontSize: '11px',
                                          color: successColor,
                                          flexShrink: 0,
                                        }}
                                      >
                                        <Circle
                                          size={10}
                                          fill={successColor}
                                          color={successColor}
                                        />
                                        {model.success_rate.toFixed(1)}%
                                      </span>
                                    )}
                                  </div>
                                  {model.description && (
                                    <div
                                      style={{
                                        fontSize: '11px',
                                        color: $('--text-secondary'),
                                        opacity: 0.7,
                                        lineHeight: 1.4,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 1,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {model.description}
                                    </div>
                                  )}
                                </div>
                              );
                            });
                        })()}
                    </div>
                  );
                })
              )}
              {!isLoadingProviders && filteredProviders.length === 0 && (
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
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'relative',
                padding: '12px 12px 0 12px',
                flexShrink: 0,
              }}
            >
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
                placeholder="Search accounts..."
                value={accountSearchQuery}
                onChange={(e) => setAccountSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  fontSize: '13px',
                  backgroundColor: $('--background'),
                  border: 'none',
                  borderRadius: '8px',
                  color: $('--text-primary'),
                  outline: 'none',
                  boxSizing: 'border-box',
                  height: '34px',
                }}
              />
            </div>
            {showEffort && (selectedModel?.effortOptions?.length ?? 0) > 1 && (
              <div
                style={{
                  flexShrink: 0,
                  margin: '12px 12px 0 12px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: `color-mix(in srgb, ${$('--text-primary')} 6%, ${$('--background')})`,
                }}
              >
                <EffortTabs
                  effort={pickedEffortLevel}
                  options={selectedModel.effortOptions as EffortLevel[]}
                  onChange={setPickedEffortLevel}
                />
              </div>
            )}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {isLoadingAccounts ? (
                <AccountListSkeleton />
              ) : providerAccounts.length > 0 ? (
                (() => {
                  const filtered = providerAccounts.filter((acc) =>
                    (acc.email || '').toLowerCase().includes(accountSearchQuery.toLowerCase()),
                  );
                  if (filtered.length === 0) {
                    return (
                      <div
                        style={{
                          textAlign: 'center',
                          color: $('--text-secondary'),
                          padding: '20px',
                          fontSize: '12px',
                        }}
                      >
                        No accounts match your search.
                      </div>
                    );
                  }
                  return [...filtered]
                    .sort(
                      (a, b) =>
                        Number(b.id === currentAccountId) - Number(a.id === currentAccountId) ||
                        compareAccountsByUsage(a, b),
                    )
                    .map((acc) => {
                      return (
                        <div
                          key={acc.id}
                          onClick={() => {
                            onSelect({
                              providerId: selectedModel.provider_id,
                              modelId:
                                showEffort && (selectedModel.effortOptions?.length ?? 0) > 1
                                  ? `${selectedModel.effortBase}-${pickedEffortLevel}`
                                  : selectedModel.id,
                              accountId: acc.id,
                              email: acc.email,
                              accountProviderId: acc.provider_id,
                              usage: acc.usage ?? null,
                              period_requests: acc.period_requests ?? null,
                              period_tokens: acc.period_tokens ?? null,
                            });
                            onClose();
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--text-secondary')} 15%, transparent)`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '7px',
                              backgroundColor: `color-mix(in srgb, ${$('--text-secondary')} 10%, transparent)`,
                              color: $('--text-secondary'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            {(acc.email?.[0] || acc.name?.[0] || '?').toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: 500,
                                color: $('--text-primary'),
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {acc.email || acc.name || acc.id}
                              </span>
                              {acc.auth_method && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    backgroundColor: `color-mix(in srgb, ${$('--text-secondary')} 10%, transparent)`,
                                    color: $('--text-secondary'),
                                    flexShrink: 0,
                                  }}
                                >
                                  {(() => {
                                    const baseUri =
                                      ((window as any).__zenImagesUri as string | undefined) ||
                                      '/images';
                                    const parts = splitAuthMethod(acc.auth_method as string).filter(
                                      (p) => ICON_METHODS.includes(p),
                                    );
                                    if (!baseUri || parts.length === 0) return <Key size={11} />;
                                    return parts.map((p) => (
                                      <img
                                        key={p}
                                        src={`${baseUri}/auth_icons/${authIconFile(p)}`}
                                        alt={p}
                                        style={{
                                          width: '12px',
                                          height: '12px',
                                          objectFit: 'contain',
                                        }}
                                      />
                                    ));
                                  })()}
                                  {acc.auth_method}
                                </span>
                              )}
                              {acc.id === currentAccountId && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    fontSize: '9px',
                                    fontWeight: 600,
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: `color-mix(in srgb, ${$('--success')} 16%, transparent)`,
                                    color: $('--success'),
                                    flexShrink: 0,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  In use
                                </span>
                              )}
                              {((acc.used_by_projects?.length ?? 0) > 0 ? (agentsByAccount?.[acc.id] ?? []) : []).map((type) => (
                                <span
                                  key={type}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    backgroundColor: `color-mix(in srgb, ${getAgentTypeColor(type)} 14%, transparent)`,
                                    color: getAgentTypeColor(type),
                                    flexShrink: 0,
                                    textTransform: 'capitalize',
                                  }}
                                >
                                  {type}
                                </span>
                              ))}
                              {(acc.used_by_projects?.length ?? 0) > 0 && (
                                <span
                                  title={`Also in use by ${acc.used_by_projects!.length} other VSCode window(s): ${acc.used_by_projects!.join(', ')}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    backgroundColor: `color-mix(in srgb, ${$('--text-secondary')} 10%, transparent)`,
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    color: $('--warn'),
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    minWidth: 0,
                                    flexShrink: 1,
                                  }}
                                >
                                  {acc.used_by_projects!.join(', ')}
                                </span>
                              )}
                            </span>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginTop: '2px',
                                overflow: 'hidden',
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '10px',
                                  color: $('--text-secondary'),
                                  flexShrink: 0,
                                }}
                              >
                                <Activity size={11} style={{ color: $('--success') }} />
                                {(acc.period_requests ?? 0).toLocaleString()} msg
                              </span>
                              <span
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '10px',
                                  color: $('--text-secondary'),
                                  flexShrink: 0,
                                }}
                              >
                                <Coins size={11} style={{ color: $('--warn') }} />
                                {formatTokens(acc.period_tokens ?? 0)} tokens
                              </span>
                              {acc.usage != null &&
                                (() => {
                                  const n = Number(acc.usage);
                                  const c =
                                    n >= 90
                                      ? $('--error')
                                      : n >= 70
                                        ? $('--warn')
                                        : $('--text-secondary');
                                  return (
                                    <span
                                      title={
                                        acc.reset_usage_at
                                          ? `Resets at: ${new Date(acc.reset_usage_at).toLocaleString()}`
                                          : undefined
                                      }
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontSize: '10px',
                                        color: c,
                                        flexShrink: 0,
                                      }}
                                    >
                                      <BarChart3 size={10} style={{ color: c }} />
                                      {n.toFixed(1)}%
                                    </span>
                                  );
                                })()}
                              {acc.usage != null &&
                                acc.reset_usage_at != null &&
                                (() => {
                                  const reset = new Date(acc.reset_usage_at);
                                  if (isNaN(reset.getTime())) return null;
                                  const diffMs = reset.getTime() - Date.now();
                                  if (diffMs <= 0) return null;
                                  const h = Math.ceil(diffMs / 3_600_000);
                                  const label =
                                    h < 1
                                      ? 'Resets <1h'
                                      : h < 24
                                        ? `Resets ${h}h`
                                        : `Resets ${Math.ceil(h / 24)}d`;
                                  return (
                                    <span
                                      title={`Usage resets at: ${reset.toLocaleString()}`}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontSize: '10px',
                                        color: $('--warn'),
                                        flexShrink: 0,
                                      }}
                                    >
                                      <Clock size={10} />
                                      {label}
                                    </span>
                                  );
                                })()}
                              {(() => {
                                const rel = formatRelativeTime(acc.last_used_at ?? null);
                                if (!rel) return null;
                                return (
                                  <span
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '10px',
                                      color: $('--text-secondary'),
                                      flexShrink: 1,
                                      overflow: 'hidden',
                                      minWidth: 0,
                                    }}
                                  >
                                    <Clock
                                      size={11}
                                      style={{ flexShrink: 0, color: $('--blue') }}
                                    />
                                    <span
                                      style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {rel}
                                    </span>
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    });
                })()
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    color: $('--text-secondary'),
                    padding: '20px',
                    fontSize: '12px',
                  }}
                >
                  No accounts available for this provider.
                </div>
              )}
            </div>
          </div>
        )}

        <style>{`
          @keyframes pmdSlideUpDrawer {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes pmdFadeScaleModal {
            from { transform: scale(0.96); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes pmdSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes drawerShimmer {
            0% { opacity: .55; }
            50% { opacity: 1; }
            100% { opacity: .55; }
          }
        `}</style>
      </div>

      {tooltipModel &&
        ReactDOM.createPortal(
          <ModelTooltip model={tooltipModel.model} x={tooltipModel.x} y={tooltipModel.y} />,
          getContainer(),
        )}
    </>,
    getContainer(),
  );
};

export default SelectModelAccountModal;
