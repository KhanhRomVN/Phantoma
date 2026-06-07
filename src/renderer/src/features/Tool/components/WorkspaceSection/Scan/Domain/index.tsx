import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '../../../../../../shared/lib/utils';
import { ScanOverview } from './components/Overview';
import { DomainZoneTransfer } from './components/ZoneTransfer';
import { DomainDNSBrute } from './components/DNSBrute';
import { ScanLog } from './components/Log';
import { ScanSearch } from './components/Search';
import { ScanHistory } from './components/History';
import {
  Activity,
  Globe,
  Search,
  Terminal,
} from 'lucide-react';

// Optional sample data
import sampleData from './data/scan-sample.json';

// Types
import type { DomainScanSession, ScanDomainStatus, ScanDomainData, ScanSubTabId } from './types/scan-data';

// ============================================================================
// Status & Session Data
// ============================================================================

const STATUS_META: Record<ScanDomainStatus, { label: string; color: string; pulse?: boolean }> = {
  idle: { label: 'IDLE', color: '#3a4558' },
  queued: { label: 'QUEUED', color: '#f5a623', pulse: true },
  scanning: { label: 'SCANNING', color: '#0af', pulse: true },
  done: { label: 'DONE', color: '#30d158' },
  error: { label: 'ERROR', color: '#ff2d55' },
};

const DEFAULT_SESSIONS: DomainScanSession[] = [
  {
    id: 'scan-sess-1',
    domain: 'example.com',
    status: 'done',
    progress: 100,
    riskScore: 42,
    stats: { zoneTransferSuccess: true, subdomainsResolved: 12, totalRecords: 27 },
  },
];

// TODO: Replace with actual API call
async function fetchScanData(domain: string): Promise<ScanDomainData | null> {
  console.log(`[DomainScan] Fetching data for: ${domain}`);

  try {
    if (typeof sampleData !== 'undefined' && sampleData && sampleData.target === domain) {
      console.log('[DomainScan] Using sample data from scan-sample.json');
      // @ts-ignore
      return sampleData;
    }
  } catch (e) {
    console.log('[DomainScan] Sample data not available, using API');
  }

  // TODO: Implement real API call here
  console.log('[DomainScan] No data source available, returning null');
  return null;
}

// ============================================================================
// Tab Configuration
// ============================================================================

const SUB_TABS = [
  { id: 'overview', label: 'Overview', accent: '#0af' },
  { id: 'zone-transfer', label: 'Zone Transfer', accent: '#30d158' },
  { id: 'dns-brute', label: 'DNS Brute', accent: '#f5a623' },
  { id: 'terminal', label: 'Log', accent: '#30d158' },
] as const;

// ============================================================================
// Main Component
// ============================================================================

interface DomainScanProps {
  initialDomain?: string;
}

export default function DomainScan({ initialDomain = 'example.com' }: DomainScanProps) {
  // State for sessions (target list)
  const [sessions, setSessions] = useState<DomainScanSession[]>(DEFAULT_SESSIONS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    sessionId: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // State for active domain and panel
  const [activeDomain, setActiveDomain] = useState<string>(initialDomain);
  const [activeSubTab, setActiveSubTab] = useState<ScanSubTabId>('overview');
  const [domainInput, setDomainInput] = useState(activeDomain);

  // State for dropdowns
  const [showTabsDropdown, setShowTabsDropdown] = useState(false);
  const [showRunSelectedDropdown, setShowRunSelectedDropdown] = useState(false);
  const [selectedTabs, setSelectedTabs] = useState<Set<ScanSubTabId>>(new Set());

  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  // State for history mode
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [historyViewData, setHistoryViewData] = useState<ScanDomainData | null>(null);

  // Data fetching state
  const [data, setData] = useState<ScanDomainData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const activeTab = SUB_TABS.find((t) => t.id === activeSubTab)!;

  // Fetch data for a domain
  const fetchData = async (domain: string) => {
    setIsLoading(true);
    const result = await fetchScanData(domain);
    setData(result);
    setIsLoading(false);
  };

  // Update input when activeDomain changes
  useEffect(() => {
    setDomainInput(activeDomain);
  }, [activeDomain]);

  // Fetch data when activeDomain changes
  useEffect(() => {
    if (activeDomain) {
      fetchData(activeDomain);
    }
  }, [activeDomain]);

  const handleLookup = () => {
    if (!domainInput.trim()) return;
    setActiveDomain(domainInput.trim());
  };

  // Target list functions
  const addDomain = useCallback(() => {
    const d = newDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');
    if (!d) return;
    if (sessions.some((s) => s.domain === d)) return;
    const sess: DomainScanSession = {
      id: `scan-sess-${Date.now()}`,
      domain: d,
      status: 'queued',
      progress: 0,
      stats: { zoneTransferSuccess: false, subdomainsResolved: 0, totalRecords: 0 },
    };
    setSessions((prev) => [...prev, sess]);
    setNewDomain('');
    setShowAddForm(false);
  }, [newDomain, sessions]);

  const removeDomain = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const runDomain = useCallback((domain: string) => {
    console.log('Running full scan for:', domain);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, sessionId });
  };

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.tabs-dropdown-container')) {
        setShowTabsDropdown(false);
      }
      if (!target.closest('.run-selected-dropdown-container')) {
        setShowRunSelectedDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Handlers
  const handleRunSelectedClick = () => setShowRunSelectedDropdown(!showRunSelectedDropdown);

  const handleConfirmRunSelected = () => {
    console.log('Running selected tabs:', Array.from(selectedTabs));
    setShowRunSelectedDropdown(false);
  };

  const handleOpenHistory = () => {
    setIsHistoryMode(true);
    setHistoryViewData(null);
  };

  const handleSelectHistory = (historyScanData: ScanDomainData) => {
    setHistoryViewData(historyScanData);
  };

  const handleBackFromHistory = () => {
    setIsHistoryMode(false);
    setHistoryViewData(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsSearchMode(value.trim().length > 0);
  };

  const handleSearchResultClick = (tabId: string) => {
    setActiveSubTab(tabId as ScanSubTabId);
    setIsSearchMode(false);
    setSearchQuery('');
  };

  const renderContent = () => {
    // Search mode
    if (isSearchMode && searchQuery.trim()) {
      return <ScanSearch data={data} searchQuery={searchQuery} onResultClick={handleSearchResultClick} />;
    }

    // History mode
    if (isHistoryMode) {
      return <ScanHistory onSelectHistory={handleSelectHistory} onBack={handleBackFromHistory} />;
    }

    // Viewing history data
    if (historyViewData) {
      return renderNormalContent(historyViewData);
    }

    // Normal mode
    return renderNormalContent(data);
  };

  const renderNormalContent = (scanData: ScanDomainData | null) => {
    if (!scanData) {
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
          <div className="text-[32px] opacity-15">🛡️</div>
          <div className="text-[11px] font-mono text-[#2a3548]">
            Enter a domain and click "Scan" to start active DNS scanning
          </div>
        </div>
      );
    }

    switch (activeSubTab) {
      case 'overview':
        return <ScanOverview data={scanData} />;
      case 'zone-transfer':
        return <DomainZoneTransfer data={scanData} />;
      case 'dns-brute':
        return <DomainDNSBrute data={scanData} />;
      case 'terminal':
        return <ScanLog data={scanData} />;
      default:
        return null;
    }
  };

  const isInHistoryOrView = isHistoryMode || !!historyViewData;

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0f1319]">
      {/* Left panel: Target list */}
      <div className="w-[293px] bg-[#0f1319] border-r border-[#1c2333] flex flex-col shrink-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 h-[40px] border-b border-[#1c2333] shrink-0 bg-[#0f1319]">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold tracking-[0.12em] text-[#c8d6f0] font-mono">
              Domains
            </span>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[#2a3548] hover:text-[#0af] hover:bg-[#0af15] transition-all p-1 rounded"
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
                className="flex-1 h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#0af] outline-none placeholder:text-[#2a3548]"
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

        {/* Cards list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-[#0f1319]">
          {sessions.map((sess) => {
            const meta = STATUS_META[sess.status];
            const isActive = sess.domain === activeDomain;
            return (
              <div
                key={sess.id}
                onClick={() => setActiveDomain(sess.domain)}
                onContextMenu={(e) => handleContextMenu(e, sess.id)}
                className={cn(
                  'p-2 rounded cursor-pointer transition-all relative',
                  isActive ? 'bg-[#0d1017]' : 'bg-[#0a0e14] hover:bg-[#111827]',
                )}
              >
                {isActive && (
                  <div
                    className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                    style={{ background: meta.color }}
                  />
                )}
                <div className="flex items-center gap-2 pl-1">
                  <span
                    className="text-[13px] font-mono font-bold flex-1 truncate"
                    style={{ color: isActive ? '#c8d6f0' : '#6a7a9a' }}
                  >
                    {sess.domain}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            ref={menuRef}
            className="fixed z-50 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => {
                const session = sessions.find((s) => s.id === contextMenu.sessionId);
                if (session) runDomain(session.domain);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-[#0af] hover:bg-[#1c2333] transition-colors"
            >
              ▶ Run Full Scan
            </button>
            <button
              onClick={() => {
                handleOpenHistory();
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-[#30d158] hover:bg-[#1c2333] transition-colors"
            >
              📜 Open History
            </button>
            <button
              onClick={() => {
                handleRunSelectedClick();
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-[#ff9f0a] hover:bg-[#1c2333] transition-colors"
            >
              ✓ Run Selected
            </button>
            <div className="border-t border-[#1c2333] my-1" />
            <button
              onClick={() => {
                removeDomain(contextMenu.sessionId);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-[#ff2d55] hover:bg-[#1c2333] transition-colors"
            >
              ✕ Delete
            </button>
          </div>
        )}
      </div>

      {/* Right panel: Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0f1319]">
        <div className="flex flex-col flex-1 overflow-hidden bg-[#0f1319]">
          <div className="flex items-center justify-between px-3 h-10 bg-[#0f1319] border-b border-[#1c2333] shrink-0">
            <span className="text-[12px] font-mono font-bold text-[#c8d6f0]">
              {activeTab.label}
            </span>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search..."
                className="h-7 w-[21rem] bg-[#0d1017] border border-[#1c2333] rounded text-[#0af] text-[11px] px-2 outline-none font-mono placeholder:text-[#2a3548]"
              />
              <div className="relative tabs-dropdown-container">
                <button
                  onClick={() => setShowTabsDropdown(!showTabsDropdown)}
                  className="h-6 w-6 flex items-center justify-center bg-[#1c2333] border border-[#2a3548] text-[#6a7a9a] rounded hover:text-[#c8d6f0] hover:border-[#0af30] transition-colors"
                  title="Switch tab"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="6" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="18" r="2" />
                  </svg>
                </button>
                {showTabsDropdown && (
                  <div className="absolute right-0 top-8 z-50 w-48 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1">
                    {SUB_TABS.map((tab) => {
                      const getIcon = () => {
                        switch (tab.id) {
                          case 'overview': return <Activity className="w-3.5 h-3.5" />;
                          case 'zone-transfer': return <Globe className="w-3.5 h-3.5" />;
                          case 'dns-brute': return <Search className="w-3.5 h-3.5" />;
                          case 'terminal': return <Terminal className="w-3.5 h-3.5" />;
                          default: return <Activity className="w-3.5 h-3.5" />;
                        }
                      };

                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveSubTab(tab.id);
                            setShowTabsDropdown(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-mono transition-colors",
                            activeSubTab === tab.id
                              ? "bg-[#0af15] text-[#0af]"
                              : "text-[#c8d6f0] hover:bg-[#1c2333]"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {getIcon()}
                            <span>{tab.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}