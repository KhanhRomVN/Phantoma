import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '../../../../../../shared/lib/utils';
import { useDomainRecon } from './hooks/useDomainRecon';

import { SourcesPanel } from '../Person/components/SourcesPanel';
import { RawDataView } from '../Person/components/RawDataView';
import { TimelineCluster } from '../Person/components/TimelineCluster';
import { DataView } from '../Person/components/DataView';
import { Overview } from '../Person/components/Overview';
import { SectionHeader } from '../Person/components/shared/SectionHeader';
import { ConfidenceBadge } from '../Person/components/shared/ConfidenceBadge';
import { Whois } from './components/Whois';
import { DnsRecords } from './components/DnsRecords';
import { Subdomains } from './components/Subdomains';
import { SslTlsCerts } from './components/SslTlsCerts';
import { Infrastructure } from './components/Infrastructure';
import { SensitiveExposure } from './components/SensitiveExposure';
import { TechStack } from './components/TechStack';
import { Osint } from './components/Osint';
import { Emails } from './components/Emails';
import { Mentions } from './components/Mentions';
import { Network } from './components/Network';
import { Log } from './components/Log';

// Import realistic mock data
import realisticMockData from './data/phantoma-com.json';

import {
  Globe,
  LayoutDashboard,
  Users,
  Clock,
  FileCode,
  FileClock,
  Database,
  ChevronDown,
  Fingerprint,
  Map as MapIcon,
  ShieldCheck,
  Network as NetworkIcon,
  AlertTriangle,
  Cpu,
  Search as SearchIcon,
  Mail,
  MessageCircle,
  Router,
  FileJson,
  User,
  Share2,
  Briefcase,
  EyeOff,
  Image as ImageIcon,
  CreditCard,
  Scale,
  GitBranch,
} from 'lucide-react';

interface DomainSession {
  id: string;
  domain: string;
  ip?: string;
  status: 'idle' | 'queued' | 'scanning' | 'done' | 'error';
  progress: number;
  riskScore?: number;
}

type DomainStatus = DomainSession['status'];

const STATUS_META: Record<DomainStatus, { label: string; color: string; pulse?: boolean }> = {
  idle: { label: 'IDLE', color: '#3a4558' },
  queued: { label: 'QUEUED', color: '#f5a623', pulse: true },
  scanning: { label: 'SCANNING', color: '#0af', pulse: true },
  done: { label: 'DONE', color: '#30d158' },
  error: { label: 'ERROR', color: '#ff2d55' },
};

const ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  LayoutDashboard: LayoutDashboard,
  Users: Users,
  Clock: Clock,
  FileCode: FileCode,
  Database: Database,
  Globe: Globe,
  Fingerprint: Fingerprint,
  Map: MapIcon,
  ShieldCheck: ShieldCheck,
  Network: NetworkIcon,
  AlertTriangle: AlertTriangle,
  Cpu: Cpu,
  Search: SearchIcon,
  Mail: Mail,
  MessageCircle: MessageCircle,
  Router: Router,
  FileJson: FileJson,
  User: User,
  Share2: Share2,
  Briefcase: Briefcase,
  EyeOff: EyeOff,
  Image: ImageIcon,
  CreditCard: CreditCard,
  Scale: Scale,
  GitBranch: GitBranch,
};

const getTabIcon = (
  iconName: string,
): React.ComponentType<{ className?: string; style?: React.CSSProperties }> => {
  return ICON_MAP[iconName] || Globe;
};

const DEFAULT_SESSIONS: DomainSession[] = [
  {
    id: 'sess-1',
    domain: 'phantoma.com',
    ip: '104.18.32.11',
    status: 'done',
    progress: 100,
    riskScore: 65,
  },
];

const DATA_CACHE: Record<string, Record<string, unknown>> = {
  'phantoma.com': realisticMockData as unknown as Record<string, unknown>,
};

interface DomainReconProps {
  initialDomain?: string;
}

export default function DomainRecon({ initialDomain = 'phantoma.com' }: DomainReconProps) {
  // Session management
  const [sessions, setSessions] = useState<DomainSession[]>(DEFAULT_SESSIONS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    sessionId: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Active domain
  const [activeDomain, setActiveDomain] = useState<string>(initialDomain);

  // Domain recon hook
  const {
    result,
    entities,
    categoryGroups,
    selectedEntity,
    activeTab,
    filteredDataPoints,
    isLoading,
    error,
    loadData,
    selectEntity,
    setActiveTab,
  } = useDomainRecon();

  // Search state — simple regex filter, no separate search mode
  const [searchQuery, setSearchQuery] = useState('');
  const [showTabsDropdown, setShowTabsDropdown] = useState(false);

  // Log panel state
  const [showLog, setShowLog] = useState(false);

  // Load data when active domain changes
  useEffect(() => {
    const cached = DATA_CACHE[activeDomain];
    if (cached) {
      loadData(cached);
    }
  }, [activeDomain, loadData]);

  // Context menu click outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.tabs-dropdown-container')) setShowTabsDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const addDomain = useCallback(() => {
    const d = newDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');
    if (!d) return;
    if (sessions.some((s) => s.domain === d)) return;
    const sess: DomainSession = {
      id: `sess-${Date.now()}`,
      domain: d,
      status: 'queued',
      progress: 0,
    };
    setSessions((prev) => [...prev, sess]);
    setNewDomain('');
    setShowAddForm(false);
  }, [newDomain, sessions]);

  const removeDomain = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleContextMenu = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, sessionId });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const activeGroup = categoryGroups.find((g) => g.id === activeTab);

  // Render main content
  const renderContent = () => {
    // Log panel
    if (showLog && result) {
      return (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#060810] border-b border-[#1c2333] shrink-0">
            <button
              onClick={() => setShowLog(false)}
              className="h-6 w-6 flex items-center justify-center bg-[#1c2333] border border-[#2a3548] text-[#c8d6f0] rounded hover:text-[#c8d6f0] hover:border-[#0af30] transition-colors"
              title="Back"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-[13px] font-mono font-bold text-[#c8d6f0]">Scan Log</span>
          </div>
          <Log data={result as unknown as import('./types/recon-data').ReconData} />
        </div>
      );
    }

    // Loading
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <div className="text-[24px] animate-pulse">⏳</div>
          <div className="text-[12px] font-mono text-[#c8d6f0]">
            Processing domain RECON data...
          </div>
        </div>
      );
    }

    // Error
    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <div className="text-[24px] opacity-15">⚠️</div>
          <div className="text-[12px] font-mono text-[#ff2d55]">{error}</div>
        </div>
      );
    }

    // No data
    if (!result) {
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
          <div className="text-[32px] opacity-15">🌐</div>
          <div className="text-[12px] font-mono text-[#c8d6f0]">
            Select a domain from the left panel to view reconnaissance data
          </div>
        </div>
      );
    }

    // Tab-based content
    switch (activeTab) {
      case 'overview':
        return (
          <Overview
            result={result}
            onSelectEntity={(entityId) => {
              selectEntity(entityId);
              setActiveTab('entities');
            }}
          />
        );

      case 'entities':
        return (
          <div className="flex-1 overflow-y-auto p-3">
            <SectionHeader accent="#af52de">Entities Found ({entities.length})</SectionHeader>
            <div className="space-y-1">
              {entities.length === 0 ? (
                <div className="text-[11px] font-mono text-[#6a7a9a] py-4 text-center">
                  No distinct entities identified — all data appears to belong to the same domain
                </div>
              ) : (
                entities.map((entity) => (
                  <div
                    key={entity.id}
                    onClick={() => selectEntity(entity.id)}
                    className="p-2 bg-[#0d1017] border border-[#1c2333] rounded cursor-pointer hover:border-[#2a3548] transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-mono font-bold text-[#c8d6f0]">
                        {entity.displayName}
                      </span>
                      <ConfidenceBadge value={entity.confidence} />
                    </div>
                    <div className="text-[11px] font-mono text-[#6a7a9a]">{entity.summary}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-[#1c2333] text-[#6a7a9a]">
                        {entity.relevance.toUpperCase()}
                      </span>
                      {entity.riskScore !== undefined && (
                        <span
                          className="text-[9px] font-mono px-1 py-0.5 rounded"
                          style={{
                            color:
                              entity.riskScore >= 75
                                ? '#ff2d55'
                                : entity.riskScore >= 50
                                  ? '#f5a623'
                                  : '#30d158',
                            backgroundColor:
                              entity.riskScore >= 75
                                ? '#ff2d5515'
                                : entity.riskScore >= 50
                                  ? '#f5a62315'
                                  : '#30d15815',
                          }}
                        >
                          RISK {entity.riskScore}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'timeline':
        return (
          <TimelineCluster
            dataPoints={selectedEntity ? selectedEntity.dataPoints : result.allDataPoints}
          />
        );

      case 'raw':
        return (
          <RawDataView
            dataPoints={
              selectedEntity
                ? selectedEntity.dataPoints.filter(
                    (dp) => dp.isNoise || dp.category === 'unclassified',
                  )
                : result.unassignedDataPoints
            }
            title="Raw & Unclassified Data"
            description="False positives, unclassified findings, and data points that couldn't be reliably categorized. Manual review recommended — some may contain legitimate findings."
          />
        );

      case 'sources':
        return <SourcesPanel sources={result.sources} />;

      case 'whois':
        return <Whois dataPoints={filteredDataPoints} activeGroup={activeGroup!} />;

      case 'dns':
        return <DnsRecords dataPoints={filteredDataPoints} activeGroup={activeGroup!} />;

      case 'subdomains':
        return <Subdomains dataPoints={filteredDataPoints} activeGroup={activeGroup!} />;

      case 'certificates':
        return <SslTlsCerts dataPoints={filteredDataPoints} activeGroup={activeGroup!} />;

      case 'infrastructure':
        return <Infrastructure dataPoints={filteredDataPoints} activeGroup={activeGroup!} />;

      case 'sensitive':
        return <SensitiveExposure dataPoints={filteredDataPoints} activeGroup={activeGroup!} />;

      case 'technology':
        return <TechStack dataPoints={filteredDataPoints} activeGroup={activeGroup!} />;

      case 'osint':
        return <Osint dataPoints={filteredDataPoints} activeGroup={activeGroup!} />;

      case 'emails':
        return <Emails dataPoints={filteredDataPoints} activeGroup={activeGroup!} />;

      case 'mentions':
        return <Mentions dataPoints={filteredDataPoints} activeGroup={activeGroup!} />;

      case 'network':
        return <Network dataPoints={filteredDataPoints} activeGroup={activeGroup!} />;

      default:
        // Dynamic category tabs (fallback for unlisted tabs)
        if (activeGroup && filteredDataPoints.length > 0) {
          return (
            <DataView
              dataPoints={filteredDataPoints}
              activeGroup={activeGroup}
              entityName={selectedEntity?.displayName}
            />
          );
        }
        // Empty tab
        if (activeGroup) {
          return (
            <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
              <span className="text-[24px] opacity-15">📭</span>
              <span className="text-[12px] font-mono text-[#6a7a9a]">No data in this category</span>
              <span className="text-[10px] font-mono text-[#3a4558]">
                {activeGroup.description}
              </span>
            </div>
          );
        }
        return null;
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0f1319]">
      {/* ── Left sidebar: Domains + Entities ── */}
      <div className="w-[293px] bg-[#0f1319] border-r border-[#1c2333] flex flex-col shrink-0 overflow-hidden">
        {/* Domains header */}
        <div className="flex items-center justify-between px-3 h-[40px] border-b border-[#1c2333] shrink-0">
          <span className="text-[13px] font-bold tracking-[0.12em] text-[#c8d6f0] font-mono">
            Domains
          </span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[#c8d6f0] hover:text-[#0af] hover:bg-[#0af15] transition-all p-1 rounded"
            title="Add domain"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 1v12M1 7h12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="p-2 border-b border-[#1c2333] shrink-0">
            <div className="flex gap-1">
              <input
                autoFocus
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addDomain();
                  if (e.key === 'Escape') {
                    setShowAddForm(false);
                    setNewDomain('');
                  }
                }}
                placeholder="example.com"
                spellCheck={false}
                className="flex-1 h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#0af] outline-none placeholder:text-[#3a4558]"
                style={{ caretColor: '#0af' }}
              />
              <button
                onClick={addDomain}
                className="h-7 w-7 rounded text-[11px] font-bold font-mono transition-colors"
                style={{ background: '#0af15', border: '1px solid #0af30', color: '#0af' }}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Session list */}
        <div className="overflow-y-auto p-1.5 space-y-1 shrink-0" style={{ maxHeight: '35%' }}>
          {sessions.map((sess) => {
            const statusMeta = STATUS_META[sess.status];
            const isActive = sess.domain === activeDomain;
            const riskScore = sess.riskScore;
            const riskColor: string | undefined =
              riskScore !== undefined
                ? riskScore >= 75
                  ? '#ff2d55'
                  : riskScore >= 50
                    ? '#f5a623'
                    : '#30d158'
                : undefined;
            return (
              <div
                key={sess.id}
                onClick={() => setActiveDomain(sess.domain)}
                onContextMenu={(e) => handleContextMenu(e, sess.id)}
                className={cn(
                  'group px-2.5 py-2 rounded-md cursor-pointer transition-all duration-150 relative',
                  isActive
                    ? 'bg-[#0d1017]'
                    : 'bg-[#0a0e14] hover:bg-[#0c1016]',
                )}
              >
                {/* Active accent line */}
                {isActive && (
                  <div
                    className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full"
                    style={{ background: statusMeta.color }}
                  />
                )}

                {/* Row 1: Status dot + Domain + Risk score */}
                <div className="flex items-center gap-2">
                  {/* Status dot */}
                  <div
                    className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      statusMeta.pulse && 'animate-pulse',
                    )}
                    style={{ background: statusMeta.color }}
                    title={statusMeta.label}
                  />

                  {/* Domain name */}
                  <span
                    className="text-[12px] font-mono font-semibold truncate flex-1 min-w-0 leading-tight"
                    style={{ color: isActive ? '#e4e4e7' : '#a1a1aa' }}
                  >
                    {sess.domain}
                  </span>

                  {/* Risk score badge (compact) */}
                  {riskScore !== undefined && (
                    <span
                      className="text-[10px] font-mono font-bold shrink-0 tabular-nums"
                      style={{ color: riskColor }}
                    >
                      {riskScore}
                    </span>
                  )}
                </div>

                {/* Row 2: IP address (subtle) */}
                {sess.ip && (
                  <div className="mt-1 ml-[14px]">
                    <span className="text-[10px] font-mono text-[#3a4558] truncate block">
                      {sess.ip}
                    </span>
                  </div>
                )}

                {/* Risk bar (thin, at bottom) */}
                {riskScore !== undefined && (
                  <div className="mt-1.5 ml-[14px] h-[2px] bg-[#111827] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${riskScore}%`,
                        background: riskColor,
                      }}
                    />
                  </div>
                )}

                {/* Status text for non-done states */}
                {sess.status !== 'done' && (
                  <div className="mt-1 ml-[14px]">
                    <span
                      className="text-[9px] font-mono"
                      style={{ color: statusMeta.color }}
                    >
                      {sess.status === 'queued'
                        ? 'Queued...'
                        : sess.status === 'scanning'
                          ? 'Scanning...'
                          : sess.status === 'error'
                            ? 'Error'
                            : 'Idle'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Context menu */}
        {contextMenu && (
          <div
            ref={menuRef}
            className="fixed z-50 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1 min-w-[140px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => {
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-[#0af] hover:bg-[#1c2333] transition-colors"
            >
              ▶ Run (Full Scan)
            </button>
            <div className="border-t border-[#1c2333] my-1" />
            <button
              onClick={() => {
                removeDomain(contextMenu.sessionId);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-[#ff2d55] hover:bg-[#1c2333] transition-colors"
            >
              ✕ Delete
            </button>
          </div>
        )}
      </div>

      {/* ── Main panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-3 h-10 bg-[#0f1319] border-b border-[#1c2333] shrink-0">
            <div className="relative tabs-dropdown-container">
              <button
                onClick={() => setShowTabsDropdown(!showTabsDropdown)}
                className="flex items-center gap-2 text-[#c8d6f0] hover:text-[#0af] transition-colors group"
                title="Switch tab"
              >
                {(() => {
                  const iconName = activeGroup?.icon || 'LayoutDashboard';
                  const TabIcon = getTabIcon(iconName);
                  return (
                    <TabIcon className="w-4 h-4 text-[#6a7a9a] group-hover:text-[#0af] transition-colors" />
                  );
                })()}
                <span className="text-[13px] font-mono font-bold">
                  {activeGroup?.label || 'Overview'}
                </span>
                <ChevronDown className="w-3 h-3 text-[#6a7a9a] group-hover:text-[#0af] transition-colors" />
              </button>
              {showTabsDropdown && (
                <div className="absolute left-0 top-8 z-50 w-52 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1">
                  {categoryGroups
                    .filter((g) => g.isActive)
                    .map((group) => (
                      <button
                        key={group.id}
                        onClick={() => {
                          setActiveTab(group.id);
                          setShowTabsDropdown(false);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-1.5 text-[12px] font-mono transition-colors',
                          activeTab === group.id
                            ? 'bg-[#0af15] text-[#0af]'
                            : 'text-[#c8d6f0] hover:bg-[#1c2333]',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {(() => {
                            const ItemIcon = getTabIcon(group.icon);
                            return (
                              <ItemIcon
                                className="w-3 h-3 shrink-0 -mt-0.5"
                                style={{ color: group.accent }}
                              />
                            );
                          })()}
                          <span>{group.label}</span>
                        </div>
                        {group.count > 0 && (
                          <span className="text-[10px] text-[#6a7a9a]">({group.count})</span>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Searchbar + FileClock button */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#3a4558]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search data..."
                  spellCheck={false}
                  className="w-[320px] h-7 bg-[#040608] border border-[#1c2333] rounded pl-6 pr-2 text-[11px] font-mono text-[#c8d6f0] outline-none placeholder:text-[#6a7a9a] focus:border-[#0af30] transition-colors"
                  style={{ caretColor: '#0af' }}
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#3a4558] hover:text-[#ff2d55] transition-colors"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowLog(!showLog)}
                className={cn(
                  'h-7 w-7 flex items-center justify-center rounded transition-colors',
                  showLog
                    ? 'bg-[#0af15] border border-[#0af30] text-[#0af]'
                    : 'bg-[#1c2333] border border-[#2a3548] text-[#6a7a9a] hover:text-[#c8d6f0] hover:border-[#0af30]',
                )}
                title="Scan Log"
              >
                <FileClock className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex overflow-hidden">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}
