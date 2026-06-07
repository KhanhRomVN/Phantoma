import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '../../../../../../shared/lib/utils';
import { NetworkOverview } from './components/Overview';
import { NetworkPingSweep } from './components/PingSweep';
import { NetworkPortScan } from './components/PortScan';
import { NetworkServiceDetection } from './components/ServiceDetection';
import { NetworkOSFingerprint } from './components/OSFingerprint';
import { NetworkLog } from './components/Log';
import { NetworkSearch } from './components/Search';
import { NetworkHistory } from './components/History';
import {
  Activity,
  Radio,
  Plug,
  Cpu,
  Search,
  Terminal,
} from 'lucide-react';

// Optional sample data
import sampleData from './data/network-sample.json';

// Types
import type { NetworkScanSession, ScanNetworkStatus, ScanNetworkData, ScanNetworkSubTabId } from './types/scan-network-data';

// ============================================================================
// Status & Session Data
// ============================================================================

const STATUS_META: Record<ScanNetworkStatus, { label: string; color: string; pulse?: boolean }> = {
  idle: { label: 'IDLE', color: '#3a4558' },
  queued: { label: 'QUEUED', color: '#f5a623', pulse: true },
  scanning: { label: 'SCANNING', color: '#0af', pulse: true },
  done: { label: 'DONE', color: '#30d158' },
  error: { label: 'ERROR', color: '#ff2d55' },
};

const DEFAULT_SESSIONS: NetworkScanSession[] = [
  {
    id: 'net-sess-1',
    target: '192.168.1.0/24',
    status: 'done',
    progress: 100,
    riskScore: 45,
    stats: { liveHosts: 8, openPorts: 6, servicesIdentified: 6, osAccuracy: 92 },
  },
];

// TODO: Replace with actual API call
async function fetchNetworkData(target: string): Promise<ScanNetworkData | null> {
  console.log(`[NetworkScan] Fetching data for: ${target}`);

  try {
    if (typeof sampleData !== 'undefined' && sampleData && sampleData.target === target) {
      console.log('[NetworkScan] Using sample data from network-sample.json');
      // @ts-ignore
      return sampleData;
    }
  } catch (e) {
    console.log('[NetworkScan] Sample data not available, using API');
  }

  console.log('[NetworkScan] No data source available, returning null');
  return null;
}

// ============================================================================
// Tab Configuration
// ============================================================================

const SUB_TABS = [
  { id: 'overview', label: 'Overview', accent: '#0af' },
  { id: 'ping-sweep', label: 'Ping Sweep', accent: '#30d158' },
  { id: 'port-scan', label: 'Port Scan', accent: '#ff9f0a' },
  { id: 'service-detection', label: 'Service Detection', accent: '#0af' },
  { id: 'os-fingerprint', label: 'OS Fingerprint', accent: '#5e5ce6' },
  { id: 'terminal', label: 'Log', accent: '#30d158' },
] as const;

// ============================================================================
// Main Component
// ============================================================================

interface NetworkScanProps {
  initialTarget?: string;
}

export default function NetworkScan({ initialTarget = '192.168.1.0/24' }: NetworkScanProps) {
  // State for sessions (target list)
  const [sessions, setSessions] = useState<NetworkScanSession[]>(DEFAULT_SESSIONS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTarget, setNewTarget] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    sessionId: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // State for active target and panel
  const [activeTarget, setActiveTarget] = useState<string>(initialTarget);
  const [activeSubTab, setActiveSubTab] = useState<ScanNetworkSubTabId>('overview');
  const [targetInput, setTargetInput] = useState(activeTarget);

  // State for dropdowns
  const [showTabsDropdown, setShowTabsDropdown] = useState(false);
  const [showRunSelectedDropdown, setShowRunSelectedDropdown] = useState(false);
  const [selectedTabs, setSelectedTabs] = useState<Set<ScanNetworkSubTabId>>(new Set());

  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  // State for history mode
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [historyViewData, setHistoryViewData] = useState<ScanNetworkData | null>(null);

  // Data fetching state
  const [data, setData] = useState<ScanNetworkData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const activeTab = SUB_TABS.find((t) => t.id === activeSubTab)!;

  // Fetch data for a target
  const fetchData = async (target: string) => {
    setIsLoading(true);
    const result = await fetchNetworkData(target);
    setData(result);
    setIsLoading(false);
  };

  // Update input when activeTarget changes
  useEffect(() => {
    setTargetInput(activeTarget);
  }, [activeTarget]);

  // Fetch data when activeTarget changes
  useEffect(() => {
    if (activeTarget) {
      fetchData(activeTarget);
    }
  }, [activeTarget]);

  const handleLookup = () => {
    if (!targetInput.trim()) return;
    setActiveTarget(targetInput.trim());
  };

  // Target list functions
  const addTarget = useCallback(() => {
    const t = newTarget.trim();
    if (!t) return;
    if (sessions.some((s) => s.target === t)) return;
    const sess: NetworkScanSession = {
      id: `net-sess-${Date.now()}`,
      target: t,
      status: 'queued',
      progress: 0,
      stats: { liveHosts: 0, openPorts: 0, servicesIdentified: 0, osAccuracy: 0 },
    };
    setSessions((prev) => [...prev, sess]);
    setNewTarget('');
    setShowAddForm(false);
  }, [newTarget, sessions]);

  const removeTarget = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const runScan = useCallback((target: string) => {
    console.log('Running full network scan for:', target);
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

  const handleSelectHistory = (historyData: ScanNetworkData) => {
    setHistoryViewData(historyData);
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
    setActiveSubTab(tabId as ScanNetworkSubTabId);
    setIsSearchMode(false);
    setSearchQuery('');
  };

  const renderContent = () => {
    // Search mode
    if (isSearchMode && searchQuery.trim()) {
      return <NetworkSearch data={data} searchQuery={searchQuery} onResultClick={handleSearchResultClick} />;
    }

    // History mode
    if (isHistoryMode) {
      return <NetworkHistory onSelectHistory={handleSelectHistory} onBack={handleBackFromHistory} />;
    }

    // Viewing history data
    if (historyViewData) {
      return renderNormalContent(historyViewData);
    }

    // Normal mode
    return renderNormalContent(data);
  };

  const renderNormalContent = (scanData: ScanNetworkData | null) => {
    if (!scanData) {
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
          <div className="text-[32px] opacity-15">📡</div>
          <div className="text-[11px] font-mono text-[#2a3548]">
            Enter an IP or CIDR range and click "Scan" to start active network scanning
          </div>
        </div>
      );
    }

    switch (activeSubTab) {
      case 'overview':
        return <NetworkOverview data={scanData} />;
      case 'ping-sweep':
        return <NetworkPingSweep data={scanData} />;
      case 'port-scan':
        return <NetworkPortScan data={scanData} />;
      case 'service-detection':
        return <NetworkServiceDetection data={scanData} />;
      case 'os-fingerprint':
        return <NetworkOSFingerprint data={scanData} />;
      case 'terminal':
        return <NetworkLog data={scanData} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0f1319]">
      {/* Left panel: Target list */}
      <div className="w-[293px] bg-[#0f1319] border-r border-[#1c2333] flex flex-col shrink-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 h-[40px] border-b border-[#1c2333] shrink-0 bg-[#0f1319]">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold tracking-[0.12em] text-[#c8d6f0] font-mono">
              Targets
            </span>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[#2a3548] hover:text-[#ff9f0a] hover:bg-[#ff9f0a15] transition-all p-1 rounded"
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
          <div className="p-2 border-b border-[#1c2333] shrink-0">
            <div className="flex gap-1">
              <input
                autoFocus
                type="text"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addTarget();
                  if (e.key === 'Escape') {
                    setShowAddForm(false);
                    setNewTarget('');
                  }
                }}
                placeholder="192.168.1.0/24"
                spellCheck={false}
                className="flex-1 h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#ff9f0a] outline-none placeholder:text-[#2a3548]"
                style={{ caretColor: '#ff9f0a' }}
              />
              <button
                onClick={addTarget}
                className="h-7 w-7 rounded text-[11px] font-bold font-mono transition-colors"
                style={{ background: '#ff9f0a15', border: '1px solid #ff9f0a30', color: '#ff9f0a' }}
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
            const isActive = sess.target === activeTarget;
            return (
              <div
                key={sess.id}
                onClick={() => setActiveTarget(sess.target)}
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
                    {sess.target}
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
                if (session) runScan(session.target);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-[#ff9f0a] hover:bg-[#1c2333] transition-colors"
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
                removeTarget(contextMenu.sessionId);
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
                className="h-7 w-[21rem] bg-[#0d1017] border border-[#1c2333] rounded text-[#ff9f0a] text-[11px] px-2 outline-none font-mono placeholder:text-[#2a3548]"
              />
              <div className="relative tabs-dropdown-container">
                <button
                  onClick={() => setShowTabsDropdown(!showTabsDropdown)}
                  className="h-6 w-6 flex items-center justify-center bg-[#1c2333] border border-[#2a3548] text-[#6a7a9a] rounded hover:text-[#c8d6f0] hover:border-[#ff9f0a30] transition-colors"
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
                    {SUB_TABS.map((tab) => {
                      const getIcon = () => {
                        switch (tab.id) {
                          case 'overview': return <Activity className="w-3.5 h-3.5" />;
                          case 'ping-sweep': return <Radio className="w-3.5 h-3.5" />;
                          case 'port-scan': return <Plug className="w-3.5 h-3.5" />;
                          case 'service-detection': return <Search className="w-3.5 h-3.5" />;
                          case 'os-fingerprint': return <Cpu className="w-3.5 h-3.5" />;
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
                              ? "bg-[#ff9f0a15] text-[#ff9f0a]"
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