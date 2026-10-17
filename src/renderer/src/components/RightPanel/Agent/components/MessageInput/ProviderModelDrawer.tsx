import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Search,
  ChevronRight,
  X,
  ChevronLeft,
  Brain,
  Circle,
  Video,
  Image,
  RefreshCw,
} from 'lucide-react';
import { getFaviconUrl } from '@renderer/shared/utils/faviconUtils';
import { DEFAULT_EFFORT, EFFORT_LEVELS, type EffortLevel } from './EffortDropdown';

interface Provider {
  provider_id: string;
  provider_name: string;
  website: string;
  is_enabled: boolean;
  models: any[];
  models_error?: string;
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
  auth_method?: string | null;
}

interface ProviderModelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  providers: Provider[];
  isLoadingProviders?: boolean;
  apiUrl: string;
  onRefresh?: () => void;
  currentEffort?: EffortLevel;
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
  <span className={value ? 'text-success font-bold' : 'text-error font-bold'}>
    {value ? '✓' : '✗'}
  </span>
);

const formatContextLength = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${Math.round(n / 1000)}K`;
  return n.toLocaleString();
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
          <span className="opacity-40">—</span>
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
      className="fixed z-[99999] w-[210px] bg-dropdown-background border border-border rounded-md p-2 text-xs text-text-primary leading-relaxed pointer-events-none shadow-lg"
      style={{ left, top }}
    >
      <div className="font-bold mb-1.5 text-sm border-b border-border/30 pb-1">{model.name}</div>
      {model.description && (
        <div className="mb-2 pb-1.5 border-b border-border/20 text-[10.5px] opacity-85 italic line-clamp-3">
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

function DrawerSkeletonLine({ width, height = 10, radius = 4 }: { width: string | number; height?: number; radius?: number }) {
  return (
    <div
      className="animate-pulse bg-gray-500/15"
      style={{ width, height, borderRadius: radius }}
    />
  );
}

function ModelListSkeleton() {
  return (
    <div>
      {[0, 1, 2].map((pi) => (
        <div key={pi} className="mb-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <DrawerSkeletonLine width={16} height={16} radius={3} />
            <DrawerSkeletonLine width={120} height={13} />
          </div>
          {[0, 1].map((mi) => (
            <div key={mi} className="py-2 px-3 flex flex-col gap-1.5">
              <DrawerSkeletonLine width="45%" height={12} />
              <DrawerSkeletonLine width="70%" height={9} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const ProviderModelDrawer: React.FC<ProviderModelDrawerProps> = ({
  isOpen,
  onClose,
  providers,
  isLoadingProviders = false,
  onRefresh,
  currentEffort = DEFAULT_EFFORT,
  onSelect,
}) => {
  const [step, setStep] = useState<'model' | 'account'>('model');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<any | null>(null);
  const [providerAccounts, setProviderAccounts] = useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [collapsedProviders, setCollapsedProviders] = useState<Set<string>>(new Set());
  
  // Tooltip state
  const [tooltipModel, setTooltipModel] = useState<{ model: any; x: number; y: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });

  // Local effort state for the drawer interaction
  const [localEffort, setLocalEffort] = useState<EffortLevel>(currentEffort);

  useEffect(() => {
    if (!isOpen) return;
    setStep('model');
    setSearchQuery('');
    setSelectedModel(null);
    setProviderAccounts([]);
    setLocalEffort(currentEffort);
  }, [isOpen, currentEffort]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const filteredProviders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return providers.filter(p => p.is_enabled);
    
    return providers.filter(p => {
      if (!p.is_enabled) return false;
      // Match provider name or any model name/id within it
      const matchProv = p.provider_name.toLowerCase().includes(q);
      const matchModels = p.models?.some(m => 
        m.id?.toLowerCase().includes(q) || 
        m.name?.toLowerCase().includes(q)
      );
      return matchProv || matchModels;
    });
  }, [providers, searchQuery]);

  const handleMouseMove = (e: React.MouseEvent, model: any) => {
    mousePos.current = { x: e.clientX, y: e.clientY };
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => {
      setTooltipModel({ model, x: mousePos.current.x, y: mousePos.current.y });
    }, 300);
  };

  const handleMouseLeave = () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltipModel(null);
  };

  const toggleCollapse = (pid: string) => {
    setCollapsedProviders(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const handleSelectModel = (prov: Provider, model: any) => {
    // If model has effort variants, we might need to construct the ID differently
    // For now, assume standard selection
    setSelectedModel(model);
    // Simulate fetching accounts for this provider/model combo
    // In a real app, this would call an API
    setIsLoadingAccounts(true);
    setTimeout(() => {
      setProviderAccounts([
        { id: 'default', name: 'Default Account', email: 'user@example.com', provider_id: prov.provider_id }
      ]);
      setIsLoadingAccounts(false);
      setStep('account');
    }, 300);
  };

  const handleConfirmSelection = (account?: Account) => {
    if (!selectedModel) return;
    
    const finalModelId = selectedModel.id; // Could append effort suffix here if needed
    
    onSelect({
      providerId: selectedModel._providerId || '', // Need to track which provider was clicked
      modelId: finalModelId,
      accountId: account?.id,
      email: account?.email,
      usage: account?.usage,
      period_requests: account?.period_requests,
      period_tokens: account?.period_tokens,
    });
    onClose();
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000]"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed bottom-0 left-0 right-0 h-[85vh] max-h-[800px] bg-card-background border-t border-border shadow-2xl z-[10001] flex flex-col animate-slide-up rounded-t-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {step === 'account' && (
              <button 
                onClick={() => setStep('model')}
                className="p-1 hover:bg-sidebar-item-hover rounded-md text-text-secondary transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <h2 className="text-base font-bold text-text-primary">
              {step === 'model' ? 'Select Model' : 'Select Account'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
             {step === 'model' && (
               <>
                 <button 
                   onClick={onRefresh}
                   className="p-1.5 hover:bg-sidebar-item-hover rounded-md text-text-secondary transition-colors"
                   title="Refresh Providers"
                 >
                   <RefreshCw size={14} />
                 </button>
                 <div className="relative">
                   <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                   <input
                     type="text"
                     placeholder="Search models..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="pl-8 pr-3 py-1.5 text-xs rounded-md bg-input-background border border-transparent focus:border-primary outline-none text-text-primary w-48"
                     autoFocus
                   />
                 </div>
               </>
             )}
             <button 
               onClick={onClose}
               className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-md text-text-secondary transition-colors"
             >
               <X size={18} />
             </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoadingProviders ? (
            <div className="p-4"><ModelListSkeleton /></div>
          ) : step === 'model' ? (
            <div className="p-2">
              {filteredProviders.length === 0 ? (
                <div className="py-10 text-center text-sm text-text-secondary opacity-70">
                  No providers found matching "{searchQuery}"
                </div>
              ) : (
                filteredProviders.map(prov => {
                  const isCollapsed = collapsedProviders.has(prov.provider_id);
                  const models = prov.models || [];
                  
                  // Filter models by search query if active
                  const visibleModels = searchQuery 
                    ? models.filter(m => 
                        m.id?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        m.name?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                    : models;

                  if (visibleModels.length === 0 && searchQuery) return null;

                  return (
                    <div key={prov.provider_id} className="mb-2 last:mb-0">
                      {/* Provider Header */}
                      <div 
                        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-sidebar-item-hover rounded-md transition-colors"
                        onClick={() => toggleCollapse(prov.provider_id)}
                      >
                        <img 
                          src={getFaviconUrl(prov.website)} 
                          alt="" 
                          className="w-4 h-4 rounded-sm object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <span className="text-xs font-semibold text-text-primary flex-1 truncate">
                          {prov.provider_name}
                        </span>
                        <span className="text-[10px] text-text-secondary opacity-60">
                          {models.length} models
                        </span>
                        <ChevronRight 
                          size={14} 
                          className={`text-text-secondary transition-transform duration-200 ${!isCollapsed ? 'rotate-90' : ''}`} 
                        />
                      </div>

                      {/* Models List */}
                      {!isCollapsed && (
                        <div className="ml-2 pl-2 border-l border-border/30 mt-1 space-y-0.5">
                          {visibleModels.map(model => {
                            return (
                              <div
                                key={model.id}
                                onMouseMove={(e) => handleMouseMove(e, model)}
                                onMouseLeave={handleMouseLeave}
                                onClick={() => handleSelectModel(prov, model)}
                                className="group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-primary/10 transition-colors"
                              >
                                <Circle size={6} className="fill-current text-text-secondary group-hover:text-primary transition-colors" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-text-primary truncate group-hover:text-primary transition-colors">
                                    {model.name || model.id}
                                  </div>
                                  {(model.max_context_length || model.context_length) && (
                                    <div className="text-[10px] text-text-secondary opacity-70">
                                      {formatContextLength(Number(model.max_context_length ?? model.context_length))} ctx
                                    </div>
                                  )}
                                </div>
                                
                                {/* Quick Badges */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {model.is_thinking && <Brain size={10} className="text-violet" />}
                                  {model.is_image_upload && <Image size={10} className="text-teal" />}
                                  {model.is_video_upload && <Video size={10} className="text-blue" />}
                                </div>
                              </div>
                            );
                          })}
                          
                          {visibleModels.length === 0 && (
                             <div className="px-2 py-1 text-[10px] text-text-secondary opacity-50 italic">
                               No models in this provider
                             </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Step: Account Selection */
            <div className="p-4">
              <div className="mb-4 p-3 bg-input-background rounded-lg border border-border">
                <div className="text-xs font-bold text-text-primary mb-1">Selected Model:</div>
                <div className="text-sm text-primary">{selectedModel?.name || selectedModel?.id}</div>
                
                {/* Effort Selector Inline */}
                <div className="mt-3 pt-3 border-t border-border/30">
                  <div className="text-[10px] uppercase font-bold text-text-secondary tracking-wider mb-2">Effort Level</div>
                  <div className="flex gap-1">
                    {EFFORT_LEVELS.map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setLocalEffort(lvl)}
                        className={`flex-1 py-1 text-[10px] font-semibold rounded transition-colors ${
                          localEffort === lvl 
                            ? 'bg-primary text-white' 
                            : 'bg-gray-500/10 text-text-secondary hover:bg-gray-500/20'
                        }`}
                      >
                        {lvl.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Available Accounts</div>
                {isLoadingAccounts ? (
                  <div className="py-4 text-center text-xs text-text-secondary">Loading accounts...</div>
                ) : providerAccounts.length === 0 ? (
                  <div className="py-4 text-center text-xs text-text-secondary opacity-70">No accounts configured</div>
                ) : (
                  providerAccounts.map(acc => (
                    <div
                      key={acc.id}
                      onClick={() => handleConfirmSelection(acc)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all group"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                        {(acc.name || acc.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors">
                          {acc.name || acc.email}
                        </div>
                        {acc.usage !== undefined && (
                          <div className="text-[10px] text-text-secondary opacity-70">
                            Usage: {acc.usage}%
                          </div>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-text-secondary opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))
                )}
              </div>
              
              <button
                onClick={() => handleConfirmSelection(providerAccounts[0])} // Auto-select first if exists
                disabled={providerAccounts.length === 0}
                className="w-full mt-6 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Confirm Selection
              </button>
            </div>
          )}
        </div>
      </div>

      {tooltipModel && <ModelTooltip {...tooltipModel} />}
      
      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </>,
    document.body
  );
};

export default ProviderModelDrawer;