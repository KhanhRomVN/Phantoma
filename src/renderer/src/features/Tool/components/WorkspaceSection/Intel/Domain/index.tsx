import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '../../../../../../shared/lib/utils';
import { useDomainRecon } from './hooks/useDomainRecon';

// Reuse shared components from Person module
import { Search as GlobalSearch } from '../Person/components/Search';
import { SourcesPanel } from '../Person/components/SourcesPanel';
import { RawDataView } from '../Person/components/RawDataView';
import { TimelineCluster } from '../Person/components/TimelineCluster';
import { DataView } from '../Person/components/DataView';
import { Overview } from '../Person/components/Overview';
import { SectionHeader } from '../Person/components/shared/SectionHeader';
import { StatBox } from '../Person/components/shared/StatBox';
import { ConfidenceBadge } from '../Person/components/shared/ConfidenceBadge';
import { DataPointRow } from '../Person/components/shared/DataPointRow';

import type { ReconResult } from '../Person/types/recon-result';

// Import realistic mock data
import realisticMockData from './data/phantoma-com-realistic.json';

import {
  Globe, Search as SearchIcon, Plus,
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
  idle:     { label: 'IDLE',     color: '#3a4558' },
  queued:   { label: 'QUEUED',   color: '#f5a623', pulse: true },
  scanning: { label: 'SCANNING', color: '#0af',    pulse: true },
  done:     { label: 'DONE',     color: '#30d158' },
  error:    { label: 'ERROR',    color: '#ff2d55' },
};

const DEFAULT_SESSIONS: DomainSession[] = [
  { id: 'sess-1', domain: 'phantoma.com', ip: '104.18.32.11', status: 'done', progress: 100, riskScore: 65 },
  { id: 'sess-2', domain: 'example.com', status: 'done', progress: 100, riskScore: 23 },
  { id: 'sess-3', domain: 'testsite.org', status: 'queued', progress: 0 },
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sessionId: string } | null>(null);
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
    searchDataPoints,
  } = useDomainRecon();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [showTabsDropdown, setShowTabsDropdown] = useState(false);

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
    if (sessions.some(s => s.domain === d)) return;
    const sess: DomainSession = {
      id: `sess-${Date.now()}`,
      domain: d,
      status: 'queued',
      progress: 0,
    };
    setSessions(prev => [...prev, sess]);
    setNewDomain('');
    setShowAddForm(false);
  }, [newDomain, sessions]);

  const removeDomain = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleContextMenu = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, sessionId });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsSearchMode(value.trim().length > 0);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchMode(false);
  };

  const activeSession = sessions.find(s => s.domain === activeDomain);
  const activeGroup = categoryGroups.find(g => g.id === activeTab);

  // Render main content
  const renderContent = () => {
    // Search mode
    if (isSearchMode && searchQuery.trim() && result) {
      return (
        <GlobalSearch
          dataPoints={result.allDataPoints}
          searchQuery={searchQuery}
          onClear={handleClearSearch}
        />
      );
    }

    // Loading
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <div className="text-[24px] animate-pulse">⏳</div>
          <div className="text-[12px] font-mono text-[#c8d6f0]">Processing domain RECON data...</div>
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
                entities.map(entity => (
                  <div
                    key={entity.id}
                    onClick={() => selectEntity(entity.id)}
                    className="p-2 bg-[#0d1017] border border-[#1c2333] rounded cursor-pointer hover:border-[#2a3548] transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-mono font-bold text-[#c8d6f0]">{entity.displayName}</span>
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
                            color: entity.riskScore >= 75 ? '#ff2d55' : entity.riskScore >= 50 ? '#f5a623' : '#30d158',
                            backgroundColor: entity.riskScore >= 75 ? '#ff2d5515' : entity.riskScore >= 50 ? '#f5a62315' : '#30d15815',
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
            dataPoints={
              selectedEntity
                ? selectedEntity.dataPoints
                : result.allDataPoints
            }
          />
        );

      case 'raw':
        return (
          <RawDataView
            dataPoints={
              selectedEntity
                ? selectedEntity.dataPoints.filter(dp => dp.isNoise || dp.category === 'unclassified')
                : result.unassignedDataPoints
            }
            title="Raw & Unclassified Data"
            description="False positives, unclassified findings, and data points that couldn't be reliably categorized. Manual review recommended — some may contain legitimate findings."
          />
        );

      case 'sources':
        return <SourcesPanel sources={result.sources} />;

      default:
        // Dynamic category tabs
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
              <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
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
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
                onChange={e => setNewDomain(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addDomain();
                  if (e.key === 'Escape') { setShowAddForm(false); setNewDomain(''); }
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
        <div className="overflow-y-auto p-2 space-y-1 shrink-0" style={{ maxHeight: '35%' }}>
          {sessions.map(sess => {
            const statusMeta = STATUS_META[sess.status];
            const isActive = sess.domain === activeDomain;
            return (
              <div
                key={sess.id}
                onClick={() => setActiveDomain(sess.domain)}
                onContextMenu={e => handleContextMenu(e, sess.id)}
                className={cn(
                  'p-2 rounded cursor-pointer transition-all relative',
                  isActive ? 'bg-[#0d1017]' : 'bg-[#0a0e14] hover:bg-[#111827]',
                )}
              >
                {isActive && (
                  <div
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                    style={{ background: statusMeta.color }}
                  />
                )}
                <div className="pl-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] font-mono" style={{ color: statusMeta.color }}>
                      {statusMeta.label}
                    </span>
                    {sess.ip && (
                      <span className="text-[9px] font-mono text-[#3a4558]">{sess.ip}</span>
                    )}
                  </div>
                  <span
                    className="text-[12px] font-mono font-bold block truncate"
                    style={{ color: isActive ? '#c8d6f0' : '#6a7a9a' }}
                  >
                    {sess.domain}
                  </span>
                  {sess.riskScore !== undefined && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex-1 h-0.5 bg-[#111827] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${sess.riskScore}%`,
                            backgroundColor: sess.riskScore >= 75 ? '#ff2d55' : sess.riskScore >= 50 ? '#f5a623' : '#30d158',
                          }}
                        />
                      </div>
                      <span
                        className="text-[9px] font-mono shrink-0"
                        style={{ color: sess.riskScore >= 75 ? '#ff2d55' : sess.riskScore >= 50 ? '#f5a623' : '#30d158' }}
                      >
                        {sess.riskScore}
                      </span>
                    </div>
                  )}
                </div>
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
              onClick={() => { setContextMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-[#0af] hover:bg-[#1c2333] transition-colors"
            >
              ▶ Run (Full Scan)
            </button>
            <button
              onClick={() => { setContextMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-[#30d158] hover:bg-[#1c2333] transition-colors"
            >
              📜 Open History
            </button>
            <div className="border-t border-[#1c2333] my-1" />
            <button
              onClick={() => { removeDomain(contextMenu.sessionId); setContextMenu(null); }}
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
            <span className="text-[13px] font-mono font-bold text-[#c8d6f0]">
              {activeGroup?.label || 'Overview'}
            </span>
            <div className="flex items-center gap-3">
              <div className="relative tabs-dropdown-container">
                <button
                  onClick={() => setShowTabsDropdown(!showTabsDropdown)}
                  className="h-6 w-6 flex items-center justify-center bg-[#1c2333] border border-[#2a3548] text-[#c8d6f0] rounded hover:text-[#c8d6f0] hover:border-[#0af30] transition-colors"
                  title="Switch tab"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="6" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="18" r="2" />
                  </svg>
                </button>
                {showTabsDropdown && (
                  <div className="absolute right-0 top-8 z-50 w-52 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1">
                    {categoryGroups.filter(g => g.isActive).map((group) => (
                      <button
                        key={group.id}
                        onClick={() => { setActiveTab(group.id); setShowTabsDropdown(false); }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-1.5 text-[12px] font-mono transition-colors',
                          activeTab === group.id
                            ? 'bg-[#0af15] text-[#0af]'
                            : 'text-[#c8d6f0] hover:bg-[#1c2333]',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span style={{ color: group.accent }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </span>
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
            </div>
          </div>

          {/* Tab description */}
          {activeGroup && activeGroup.description && !isSearchMode && (
            <div className="px-3 py-1 bg-[#0a0e14] border-b border-[#1c2333] shrink-0">
              <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
            </div>
          )}

          {/* Main content */}
          <div className="flex-1 flex overflow-hidden">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}