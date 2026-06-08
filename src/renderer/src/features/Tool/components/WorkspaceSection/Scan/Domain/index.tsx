import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { cn } from '../../../../../../shared/lib/utils';
import { useDomainScan } from './hooks/useDomainScan';

import { SectionHeader } from './components/shared/SectionHeader';
import { DataTable } from './components/shared/DataTable';
import { Overview } from './components/Overview';
import { ZoneTransfer } from './components/ZoneTransfer';
import { DnsBruteforce } from './components/DnsBruteforce';
import { DnsEnumeration } from './components/DnsEnumeration';
import { DnsMisconfig } from './components/DnsMisconfig';

import { ChevronDown, Search as SearchIcon, Play, Square, RefreshCw } from 'lucide-react';
import { getTabIcon } from './constants/icons';

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

const DEFAULT_SESSIONS: DomainSession[] = [
  {
    id: 'scan-sess-1',
    domain: 'phantoma.com',
    ip: '104.18.32.11',
    status: 'done',
    progress: 100,
    riskScore: 72,
  },
];

const DATA_CACHE: Record<string, Record<string, unknown>> = {};

interface DomainScanProps {
  initialDomain?: string;
}

export default function DomainScan({ initialDomain = 'phantoma.com' }: DomainScanProps) {
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

  // Domain scan hook
  const {
    result,
    categoryGroups,
    activeTab,
    filteredDataPoints,
    isLoading,
    error,
    loadData,
    setActiveTab,
  } = useDomainScan();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showTabsDropdown, setShowTabsDropdown] = useState(false);

  // Load data when active domain changes
  useEffect(() => {
    const cached = DATA_CACHE[activeDomain];
    if (cached) {
      loadData(cached);
      return;
    }
    if (activeDomain === 'phantoma.com') {
      import('./data/phantoma.com.json')
        .then((mod) => {
          const data = mod.default as unknown as Record<string, unknown>;
          DATA_CACHE['phantoma.com'] = data;
          loadData(data);
        })
        .catch((err) => console.error('Failed to load scan data:', err));
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
      id: `scan-sess-${Date.now()}`,
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

  const handleStartScan = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, status: 'scanning', progress: 0 } : s,
      ),
    );
    setContextMenu(null);
    // Simulate scan progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, status: 'done', progress: 100, riskScore: Math.floor(Math.random() * 40 + 40) }
              : s,
          ),
        );
      } else {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, progress: Math.floor(progress) } : s)),
        );
      }
    }, 300);
  };

  const activeGroup = categoryGroups.find((g) => g.id === activeTab);

  // Search-filtered data points
  const displayDataPoints = useMemo(() => {
    if (!searchQuery.trim()) return filteredDataPoints;
    const lower = searchQuery.toLowerCase();
    return filteredDataPoints.filter((dp) => {
      const label = dp.label.toLowerCase();
      const displayVal = (dp.displayValue || '').toLowerCase();
      const val = String(dp.value || '').toLowerCase();
      const source = dp.source.name.toLowerCase();
      return (
        label.includes(lower) ||
        displayVal.includes(lower) ||
        val.includes(lower) ||
        source.includes(lower)
      );
    });
  }, [filteredDataPoints, searchQuery]);

  // Render main content
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <div className="text-[24px] animate-pulse">⏳</div>
          <div className="text-[12px] font-mono text-[#c8d6f0]">
            Processing active scan data...
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <div className="text-[24px] opacity-15">⚠️</div>
          <div className="text-[12px] font-mono text-[#ff2d55]">{error}</div>
        </div>
      );
    }

    if (!result) {
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
          <div className="text-[32px] opacity-15">🔍</div>
          <div className="text-[12px] font-mono text-[#c8d6f0]">
            Select a domain and run an active scan to view results
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <Overview result={result} />;

      case 'zone_transfer':
        return <ZoneTransfer dataPoints={displayDataPoints} activeGroup={activeGroup!} />;

      case 'dns_bruteforce':
        return <DnsBruteforce dataPoints={displayDataPoints} activeGroup={activeGroup!} />;

      case 'dns_enum':
        return <DnsEnumeration dataPoints={displayDataPoints} activeGroup={activeGroup!} />;

      case 'misconfig':
        return <DnsMisconfig dataPoints={displayDataPoints} activeGroup={activeGroup!} />;

      case 'raw':
        return (
          <div className="flex-1 overflow-y-auto p-3">
            <SectionHeader accent="#6a7a9a">
              Raw & Noise Data ({displayDataPoints.length})
            </SectionHeader>
            <DataTable
              dataPoints={displayDataPoints}
              columns={['value', 'category', 'severity', 'confidence', 'source']}
            />
          </div>
        );

      case 'sources':
        return (
          <div className="flex-1 overflow-y-auto p-3">
            <SectionHeader accent="#6a7a9a">
              Data Sources ({result.sources.length})
            </SectionHeader>
            <div className="space-y-1">
              {result.sources.map((src) => (
                <div
                  key={src.id}
                  className="flex items-center justify-between px-3 py-2 bg-[#0a0e14] border border-[#111827] rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono text-[#c8d6f0]">{src.name}</span>
                    <span className="text-[9px] font-mono text-[#3a4558] bg-[#111827] px-1 rounded">
                      {src.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-[#111827] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round(src.credibility * 100)}%`,
                          backgroundColor:
                            src.credibility >= 0.7
                              ? '#30d158'
                              : src.credibility >= 0.4
                                ? '#f5a623'
                                : '#ff2d55',
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-[#6a7a9a] w-8 text-right">
                      {Math.round(src.credibility * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        if (activeGroup && displayDataPoints.length > 0) {
          return (
            <div className="flex-1 overflow-y-auto p-3">
              <SectionHeader accent={activeGroup.accent}>
                {activeGroup.label} ({displayDataPoints.length})
              </SectionHeader>
              <DataTable
                dataPoints={displayDataPoints}
                columns={['value', 'category', 'severity', 'confidence', 'source']}
              />
            </div>
          );
        }
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
      {/* ── Left sidebar: Domains ── */}
      <div className="w-[293px] bg-[#0f1319] border-r border-[#1c2333] flex flex-col shrink-0 overflow-hidden">
        {/* Domains header */}
        <div className="flex items-center justify-between px-3 h-[40px] border-b border-[#1c2333] shrink-0">
          <span className="text-[13px] font-bold tracking-[0.12em] text-[#c8d6f0] font-mono">
            Active Scan
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
        <div className="overflow-y-auto p-1.5 space-y-1 flex-1">
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
                  isActive ? 'bg-[#0d1017]' : 'bg-[#0a0e14] hover:bg-[#0c1016]',
                )}
              >
                {isActive && (
                  <div
                    className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full"
                    style={{ background: statusMeta.color }}
                  />
                )}

                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      statusMeta.pulse && 'animate-pulse',
                    )}
                    style={{ background: statusMeta.color }}
                    title={statusMeta.label}
                  />
                  <span
                    className="text-[12px] font-mono font-semibold truncate flex-1 min-w-0 leading-tight"
                    style={{ color: isActive ? '#e4e4e7' : '#a1a1aa' }}
                  >
                    {sess.domain}
                  </span>
                  {riskScore !== undefined && (
                    <span
                      className="text-[10px] font-mono font-bold shrink-0 tabular-nums"
                      style={{ color: riskColor }}
                    >
                      {riskScore}
                    </span>
                  )}
                </div>

                {sess.ip && (
                  <div className="mt-1 ml-[14px]">
                    <span className="text-[10px] font-mono text-[#3a4558] truncate block">
                      {sess.ip}
                    </span>
                  </div>
                )}

                {/* Progress bar */}
                {sess.status === 'scanning' && (
                  <div className="mt-1.5 ml-[14px]">
                    <div className="h-[2px] bg-[#111827] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${sess.progress}%`, background: '#0af' }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-[#0af] mt-0.5 block">
                      {sess.progress}%
                    </span>
                  </div>
                )}

                {riskScore !== undefined && sess.status === 'done' && (
                  <div className="mt-1.5 ml-[14px] h-[2px] bg-[#111827] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${riskScore}%`, background: riskColor }}
                    />
                  </div>
                )}

                {sess.status !== 'done' && sess.status !== 'scanning' && (
                  <div className="mt-1 ml-[14px]">
                    <span className="text-[9px] font-mono" style={{ color: statusMeta.color }}>
                      {sess.status === 'queued'
                        ? 'Queued...'
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
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1 min-w-[140px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => handleStartScan(contextMenu.sessionId)}
            className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-[#0af] hover:bg-[#1c2333] transition-colors flex items-center gap-2"
          >
            <Play className="w-3 h-3" /> Run Active Scan
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

            {/* Searchbar */}
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
                onClick={() => {
                  const activeSess = sessions.find((s) => s.domain === activeDomain);
                  if (activeSess) handleStartScan(activeSess.id);
                }}
                className="h-7 w-7 flex items-center justify-center rounded bg-[#1c2333] border border-[#2a3548] text-[#6a7a9a] hover:text-[#c8d6f0] hover:border-[#0af30] transition-colors"
                title="Run Scan"
              >
                <RefreshCw className="w-4 h-4" />
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