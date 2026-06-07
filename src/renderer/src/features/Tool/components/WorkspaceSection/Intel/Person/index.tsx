import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '../../../../../../shared/lib/utils';
import { useEntityRecon } from './hooks/useEntityRecon';
import { Overview } from './components/Overview';
import { DataView } from './components/DataView';
import { TimelineCluster } from './components/TimelineCluster';
import { RawDataView } from './components/RawDataView';
import { SourcesPanel } from './components/SourcesPanel';
import { Search } from './components/Search';

// Import realistic mock data
import realisticMockData from './data/Phantoma.json';

interface PersonSession {
  id: string;
  name: string;
  queryType: 'name' | 'email' | 'username';
  status: 'idle' | 'queued' | 'scanning' | 'done' | 'error';
  progress: number;
  riskScore?: number;
}

type PersonStatus = PersonSession['status'];

const STATUS_META: Record<PersonStatus, { label: string; color: string; pulse?: boolean }> = {
  idle: { label: 'IDLE', color: '#3a4558' },
  queued: { label: 'QUEUED', color: '#f5a623', pulse: true },
  scanning: { label: 'SCANNING', color: '#0af', pulse: true },
  done: { label: 'DONE', color: '#30d158' },
  error: { label: 'ERROR', color: '#ff2d55' },
};

const QUERY_TYPE_META: Record<string, { label: string; color: string }> = {
  name: { label: 'NAME', color: '#af52de' },
  email: { label: 'EMAIL', color: '#30d158' },
  username: { label: 'USER', color: '#0a84ff' },
};

const DEFAULT_SESSIONS: PersonSession[] = [
  {
    id: 'sess-1',
    name: 'Phantoma',
    queryType: 'name',
    status: 'done',
    progress: 100,
    riskScore: 72,
  },
  {
    id: 'sess-2',
    name: 'phantoma@gmail.com',
    queryType: 'email',
    status: 'done',
    progress: 100,
    riskScore: 44,
  },
  {
    id: 'sess-3',
    name: 'phantoma_123',
    queryType: 'username',
    status: 'done',
    progress: 100,
    riskScore: 91,
  },
];

const DATA_CACHE: Record<string, Record<string, unknown>> = {
  Phantoma: realisticMockData as unknown as Record<string, unknown>,
};

interface PersonReconProps {
  initialPerson?: string;
}

export default function PersonRecon({ initialPerson = 'Phantoma' }: PersonReconProps) {
  // Session management
  const [sessions, setSessions] = useState<PersonSession[]>(DEFAULT_SESSIONS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPerson, setNewPerson] = useState('');
  const [newQueryType, setNewQueryType] = useState<'name' | 'email' | 'username'>('name');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    sessionId: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Active person
  const [activePerson, setActivePerson] = useState<string>(initialPerson);

  // Entity recon hook
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
  } = useEntityRecon();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Dropdown states
  const [showTabsDropdown, setShowTabsDropdown] = useState(false);
  const [showRunSelectedDropdown, setShowRunSelectedDropdown] = useState(false);

  // Load data when active person changes
  useEffect(() => {
    const cached = DATA_CACHE[activePerson];
    if (cached) {
      loadData(cached);
    }
  }, [activePerson, loadData]);

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
      if (!target.closest('.run-selected-dropdown-container')) setShowRunSelectedDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const addPerson = useCallback(() => {
    const person = newPerson.trim();
    if (!person) return;
    if (sessions.some((s) => s.name === person)) return;
    const sess: PersonSession = {
      id: `sess-${Date.now()}`,
      name: person,
      queryType: newQueryType,
      status: 'queued',
      progress: 0,
    };
    setSessions((prev) => [...prev, sess]);
    setNewPerson('');
    setShowAddForm(false);
  }, [newPerson, newQueryType, sessions]);

  const removePerson = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const runScan = useCallback((person: string) => {
    console.log('Running full scan for person:', person);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, sessionId });
  };

  const handleRunSelectedClick = useCallback(() => {
    setShowRunSelectedDropdown(!showRunSelectedDropdown);
  }, [showRunSelectedDropdown]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsSearchMode(value.trim().length > 0);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchMode(false);
  };

  const handleSearchResultClick = (dataPoint: unknown) => {
    // Navigate to the relevant tab based on the data point's category
    setIsSearchMode(false);
    setSearchQuery('');
  };

  const activeSession = sessions.find((s) => s.name === activePerson);
  const activeGroup = categoryGroups.find((g) => g.id === activeTab);

  // Render main content based on current state
  const renderContent = () => {
    // Search mode
    if (isSearchMode && searchQuery.trim() && result) {
      return (
        <Search
          dataPoints={result.allDataPoints}
          searchQuery={searchQuery}
          onResultClick={handleSearchResultClick}
          onClear={handleClearSearch}
        />
      );
    }

    // Loading
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <div className="text-[24px] animate-pulse">⏳</div>
          <div className="text-[12px] font-mono text-[#c8d6f0]">Processing RECON data...</div>
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
          <div className="text-[32px] opacity-15">👤</div>
          <div className="text-[12px] font-mono text-[#c8d6f0]">
            Select a target from the left panel to view reconnaissance data
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
            <div className="text-[12px] font-mono text-[#c8d6f0] mb-2">
              {entities.length} entit{entities.length !== 1 ? 'ies' : 'y'} found
            </div>
            <div className="space-y-1">
              {entities.map((entity) => (
                <div
                  key={entity.id}
                  onClick={() => selectEntity(entity.id)}
                  className="p-2 bg-[#0d1017] border border-[#1c2333] rounded cursor-pointer hover:border-[#2a3548] transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-mono font-bold text-[#c8d6f0]">
                      {entity.displayName}
                    </span>
                    <span className="text-[10px] font-mono text-[#6a7a9a]">
                      {entity.dataPointCount} pts
                    </span>
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
              ))}
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
            description="Data points that couldn't be reliably classified or assigned to any entity. Review manually for potential missed signals."
          />
        );

      case 'sources':
        return <SourcesPanel sources={result.sources} />;

      case 'relations':
        return (
          <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
            <span className="text-[24px] opacity-15">🔗</span>
            <span className="text-[12px] font-mono text-[#6a7a9a]">Entity relations view</span>
            <span className="text-[10px] font-mono text-[#3a4558]">
              Select an entity to see its connections
            </span>
          </div>
        );

      default:
        // Dynamic category tabs
        if (activeGroup) {
          return (
            <DataView
              dataPoints={filteredDataPoints}
              activeGroup={activeGroup}
              entityName={selectedEntity?.displayName}
            />
          );
        }
        return null;
    }
  };

  const activeTabGroup = categoryGroups.find((g) => g.id === activeTab);

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0f1319]">
      {/* ── Left sidebar: Targets + Entities ── */}
      <div className="w-[293px] bg-[#0f1319] border-r border-[#1c2333] flex flex-col shrink-0 overflow-hidden">
        {/* Targets header */}
        <div className="flex items-center justify-between px-3 h-[40px] border-b border-[#1c2333] shrink-0">
          <span className="text-[13px] font-bold tracking-[0.12em] text-[#c8d6f0] font-mono">
            Targets
          </span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[#c8d6f0] hover:text-[#0af] hover:bg-[#0af15] transition-all p-1 rounded"
            title="Add target"
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
          <div className="p-2 border-b border-[#1c2333] shrink-0 space-y-1.5">
            <input
              autoFocus
              type="text"
              value={newPerson}
              onChange={(e) => setNewPerson(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addPerson();
                if (e.key === 'Escape') {
                  setShowAddForm(false);
                  setNewPerson('');
                }
              }}
              placeholder="Name / Email / Username"
              spellCheck={false}
              className="w-full h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[12px] font-mono text-[#0af] outline-none placeholder:text-[#c8d6f0]"
              style={{ caretColor: '#0af' }}
            />
            <div className="flex gap-1">
              {(['name', 'email', 'username'] as const).map((qt) => {
                const meta = QUERY_TYPE_META[qt];
                return (
                  <button
                    key={qt}
                    onClick={() => setNewQueryType(qt)}
                    className="flex-1 h-6 rounded text-[10px] font-mono font-bold transition-all"
                    style={{
                      color: newQueryType === qt ? meta.color : '#3a4558',
                      backgroundColor: newQueryType === qt ? `${meta.color}20` : '#0a0e14',
                      border: `1px solid ${newQueryType === qt ? meta.color + '50' : '#1c2333'}`,
                    }}
                  >
                    {meta.label}
                  </button>
                );
              })}
              <button
                onClick={addPerson}
                className="h-6 w-6 rounded text-[12px] font-bold font-mono transition-colors"
                style={{ background: '#0af15', border: '1px solid #0af30', color: '#0af' }}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Session list */}
        <div className="overflow-y-auto p-2 space-y-1 shrink-0" style={{ maxHeight: '40%' }}>
          {sessions.map((sess) => {
            const statusMeta = STATUS_META[sess.status];
            const qMeta = QUERY_TYPE_META[sess.queryType];
            const isActive = sess.name === activePerson;
            return (
              <div
                key={sess.id}
                onClick={() => setActivePerson(sess.name)}
                onContextMenu={(e) => handleContextMenu(e, sess.id)}
                className={cn(
                  'p-2 rounded cursor-pointer transition-all relative',
                  isActive ? 'bg-[#0d1017]' : 'bg-[#0a0e14] hover:bg-[#111827]',
                )}
              >
                {isActive && (
                  <div
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                    style={{ background: qMeta.color }}
                  />
                )}
                <div className="pl-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className="text-[9px] font-mono font-bold px-1 py-0.5 rounded tracking-widest"
                      style={{ color: qMeta.color, backgroundColor: `${qMeta.color}18` }}
                    >
                      {qMeta.label}
                    </span>
                    <span className="text-[9px] font-mono" style={{ color: statusMeta.color }}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <span
                    className="text-[12px] font-mono font-bold block truncate"
                    style={{ color: isActive ? '#c8d6f0' : '#6a7a9a' }}
                  >
                    {sess.name}
                  </span>
                  {sess.riskScore !== undefined && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex-1 h-0.5 bg-[#111827] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${sess.riskScore}%`,
                            backgroundColor:
                              sess.riskScore >= 75
                                ? '#ff2d55'
                                : sess.riskScore >= 50
                                  ? '#f5a623'
                                  : '#30d158',
                          }}
                        />
                      </div>
                      <span
                        className="text-[9px] font-mono shrink-0"
                        style={{
                          color:
                            sess.riskScore >= 75
                              ? '#ff2d55'
                              : sess.riskScore >= 50
                                ? '#f5a623'
                                : '#30d158',
                        }}
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
              onClick={() => {
                const s = sessions.find((s) => s.id === contextMenu.sessionId);
                if (s) runScan(s.name);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-[#0af] hover:bg-[#1c2333] transition-colors"
            >
              ▶ Run (Full Scan)
            </button>
            <button
              onClick={() => {
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-[#30d158] hover:bg-[#1c2333] transition-colors"
            >
              📜 Open History
            </button>
            <button
              onClick={() => {
                handleRunSelectedClick();
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-[#ff9f0a] hover:bg-[#1c2333] transition-colors"
            >
              ✓ Run Selected
            </button>
            <div className="border-t border-[#1c2333] my-1" />
            <button
              onClick={() => {
                removePerson(contextMenu.sessionId);
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
            <span className="text-[13px] font-mono font-bold text-[#c8d6f0]">
              {activeTabGroup?.label || 'Overview'}
            </span>
            <div className="flex items-center gap-3">
              <div className="relative tabs-dropdown-container">
                <button
                  onClick={() => setShowTabsDropdown(!showTabsDropdown)}
                  className="h-6 w-6 flex items-center justify-center bg-[#1c2333] border border-[#2a3548] text-[#c8d6f0] rounded hover:text-[#c8d6f0] hover:border-[#0af30] transition-colors"
                  title="Switch tab"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="6" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="18" r="2" />
                  </svg>
                </button>
                {showTabsDropdown && (
                  <div className="absolute right-0 top-8 z-50 w-52 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1">
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
                            <span style={{ color: group.accent }}>
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
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
          {activeTabGroup && activeTabGroup.description && !isSearchMode && (
            <div className="px-3 py-1 bg-[#0a0e14] border-b border-[#1c2333] shrink-0">
              <span className="text-[10px] font-mono text-[#3a4558]">
                {activeTabGroup.description}
              </span>
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1 flex overflow-hidden">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}
