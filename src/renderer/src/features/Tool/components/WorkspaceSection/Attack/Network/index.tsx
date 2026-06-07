import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { cn } from '../../../../../../shared/lib/utils';
import { TabOverview } from './components/Overview';
import { EternalBlue } from './components/EternalBlue';
import { BruteForce } from './components/BruteForce';
import { ServiceRCE } from './components/ServiceRCE';
import { Log } from './components/Log';
import { History } from './components/History';
import { Search } from './components/Search';
import {
  Activity,
  Radio,
  Key,
  Zap,
  Terminal,
  Globe,
  Shield,
  Wifi,
} from 'lucide-react';

// Import sample data
import sampleData from './data/sample-target.json';

// Types
import type { NetworkAttackData, NetworkSession, NetworkAttackStatus } from './types/network-attack';

// ============================================================================
// Status & Session Data
// ============================================================================

const STATUS_META: Record<NetworkAttackStatus, { label: string; color: string; pulse?: boolean }> = {
  idle: { label: 'IDLE', color: '#3a4558' },
  queued: { label: 'QUEUED', color: '#f5a623', pulse: true },
  scanning: { label: 'SCANNING', color: '#0af', pulse: true },
  exploiting: { label: 'EXPLOITING', color: '#ff2d55', pulse: true },
  shell_obtained: { label: 'SHELL', color: '#30d158' },
  failed: { label: 'FAILED', color: '#ff2d55' },
  error: { label: 'ERROR', color: '#ff2d55' },
};

const DEFAULT_SESSIONS: NetworkSession[] = [
  {
    id: 'sess-1',
    target: '192.168.1.105',
    port: 445,
    service: 'SMB',
    status: 'shell_obtained',
    progress: 100,
    riskLevel: 'critical',
    stats: { exploitsAttempted: 3, exploitsSuccessful: 2, credentialsFound: 1, shellsObtained: 2 },
  },
  {
    id: 'sess-2',
    target: '10.0.0.50',
    port: 22,
    service: 'SSH',
    status: 'shell_obtained',
    progress: 100,
    riskLevel: 'medium',
    stats: { exploitsAttempted: 1, exploitsSuccessful: 1, credentialsFound: 3, shellsObtained: 0 },
  },
];

// TODO: Replace with actual API call
async function fetchNetworkAttackData(target: string): Promise<NetworkAttackData | null> {
  console.log(`[NetworkAttack] Fetching data for: ${target}`);

  try {
    // @ts-ignore - sampleData may be undefined if import is commented
    if (typeof sampleData !== 'undefined' && sampleData && sampleData.targetIp === target) {
      console.log('[NetworkAttack] Using sample data from sample-target.json');
      // @ts-ignore
      return sampleData;
    }
  } catch (e) {
    console.log('[NetworkAttack] Sample data not available, using API');
  }

  console.log('[NetworkAttack] No data source available, returning null');
  return null;
}

// ============================================================================
// Data Context (internal)
// ============================================================================

interface NetworkAttackContextType {
  data: NetworkAttackData | null;
  fetchData: (target: string) => Promise<void>;
  isLoading: boolean;
}

const NetworkAttackContext = createContext<NetworkAttackContextType | undefined>(undefined);

function useNetworkAttackData() {
  const context = useContext(NetworkAttackContext);
  if (!context) throw new Error('useNetworkAttackData must be used within NetworkAttackProvider');
  return context;
}

// ============================================================================
// Tab Configuration
// ============================================================================

const SUB_TABS = [
  { id: 'overview', label: 'Overview', accent: '#0af' },
  { id: 'eternalblue', label: 'EternalBlue', accent: '#ff2d55' },
  { id: 'bruteforce', label: 'BruteForce', accent: '#f5a623' },
  { id: 'service-rce', label: 'Service RCE', accent: '#ff6b35' },
  { id: 'terminal', label: 'Log', accent: '#30d158' },
] as const;

type SubTabId = (typeof SUB_TABS)[number]['id'];

// ============================================================================
// Main Component
// ============================================================================

interface NetworkAttackProps {
  initialTarget?: string;
}

export default function NetworkAttack({ initialTarget = '192.168.1.105' }: NetworkAttackProps) {
  // State for sessions (target list)
  const [sessions, setSessions] = useState<NetworkSession[]>(DEFAULT_SESSIONS);
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
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('overview');
  const [targetInput, setTargetInput] = useState(activeTarget);

  // State for dropdowns
  const [showTabsDropdown, setShowTabsDropdown] = useState(false);
  const [showRunSelectedDropdown, setShowRunSelectedDropdown] = useState(false);
  const [selectedTabs, setSelectedTabs] = useState<Set<SubTabId>>(new Set());

  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  // State for history mode
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [historyViewData, setHistoryViewData] = useState<NetworkAttackData | null>(null);

  // Data fetching state
  const [data, setData] = useState<NetworkAttackData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const activeTab = SUB_TABS.find((t) => t.id === activeSubTab)!;

  // Fetch data for a target
  const fetchData = async (target: string) => {
    setIsLoading(true);
    const result = await fetchNetworkAttackData(target);
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

  const handleAttack = () => {
    if (!targetInput.trim()) return;
    setActiveTarget(targetInput.trim());
  };

  // Target list functions
  const addTarget = useCallback(() => {
    const t = newTarget.trim();
    if (!t) return;
    if (sessions.some((s) => s.target === t)) return;
    const sess: NetworkSession = {
      id: `sess-${Date.now()}`,
      target: t,
      status: 'queued',
      progress: 0,
      stats: { exploitsAttempted: 0, exploitsSuccessful: 0, credentialsFound: 0, shellsObtained: 0 },
    };
    setSessions((prev) => [...prev, sess]);
    setNewTarget('');
    setShowAddForm(false);
  }, [newTarget, sessions]);

  const removeTarget = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const runTarget = useCallback((target: string) => {
    console.log('Running full attack on:', target);
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

  const handleSelectHistory = (historyData: NetworkAttackData) => {
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
    setActiveSubTab(tabId as SubTabId);
    setIsSearchMode(false);
    setSearchQuery('');
  };

  const renderContent = () => {
    // Search mode
    if (isSearchMode && searchQuery.trim()) {
      return <Search data={data} searchQuery={searchQuery} onResultClick={handleSearchResultClick} />;
    }

    // History mode
    if (isHistoryMode) {
      return <History onSelectHistory={handleSelectHistory} onBack={handleBackFromHistory} />;
    }

    // Viewing history data
    if (historyViewData) {
      return renderNormalContent(historyViewData);
    }

    // Normal mode
    return renderNormalContent(data);
  };

  const renderNormalContent = (attackData: NetworkAttackData | null) => {
    if (!attackData) {
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
          <div className="text-[32px] opacity-15">💣</div>
          <div className="text-[11px] font-mono text-[#2a3548]">
            Enter a target IP and click "Attack" to launch network exploits
          </div>
        </div>
      );
    }

    switch (activeSubTab) {
      case 'overview':
        return <TabOverview data={attackData} />;
      case 'eternalblue':
        return <EternalBlue data={attackData} />;
      case 'bruteforce':
        return <BruteForce data={attackData} />;
      case 'service-rce':
        return <ServiceRCE data={attackData} />;
      case 'terminal':
        return <Log data={attackData} />;
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
            <span className="text-[14px] font-bold tracking-[0.12em] text-[#ff2d55] font-mono">
              Targets
            </span>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[#2a3548] hover:text-[#ff2d55] hover:bg-[#ff2d5515] transition-all p-1 rounded"
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
                placeholder="192.168.1.1"
                spellCheck={false}
                className="flex-1 h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#ff2d55] outline-none placeholder:text-[#2a3548]"
                style={{ caretColor: '#ff2d55' }}
              />
              <button
                onClick={addTarget}
                className="h-7 w-7 rounded text-[11px] font-bold font-mono transition-colors"
                style={{ background: '#ff2d5515', border: '1px solid #ff2d5530', color: '#ff2d55' }}
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
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      color: meta.color,
                      background: `${meta.color}12`,
                      border: `1px solid ${meta.color}30`,
                    }}
                  >
                    {meta.label}
                  </span>
                </div>
                {sess.service && (
                  <div className="text-[10px] font-mono text-[#2a3548] mt-0.5 pl-1">
                    {sess.service}:{sess.port}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            ref={menuRef}
            className="fixed z-50 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1 min-w-[140px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => {
                const session = sessions.find((s) => s.id === contextMenu.sessionId);
                if (session) runTarget(session.target);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-[#ff2d55] hover:bg-[#1c2333] transition-colors"
            >
              ▶ Run (Full Attack)
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
                className="h-7 w-[21rem] bg-[#0d1017] border border-[#1c2333] rounded text-[#ff2d55] text-[11px] px-2 outline-none font-mono placeholder:text-[#2a3548]"
              />
              <div className="relative tabs-dropdown-container">
                <button
                  onClick={() => setShowTabsDropdown(!showTabsDropdown)}
                  className="h-6 w-6 flex items-center justify-center bg-[#1c2333] border border-[#2a3548] text-[#6a7a9a] rounded hover:text-[#c8d6f0] hover:border-[#ff2d5530] transition-colors"
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
                          case 'eternalblue': return <Radio className="w-3.5 h-3.5" />;
                          case 'bruteforce': return <Key className="w-3.5 h-3.5" />;
                          case 'service-rce': return <Zap className="w-3.5 h-3.5" />;
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
                              ? "bg-[#ff2d5515] text-[#ff2d55]"
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