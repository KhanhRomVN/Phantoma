import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '../../../../../../shared/lib/utils';
import { NetworkInfo } from './components/NetworkInfo';
import { IPIntelOverview as Overview } from './components/Overview';
import { IPServerLog as Log } from './components/Log';
import { Search } from './components/Search';
import { History } from './components/History';
import type { IPIntelData } from './types/ip-intel-data';
import ipIntelData from './data/phantoma-server.json';
import { Activity, Globe, Server, Terminal } from 'lucide-react';

interface IPSession {
  id: string;
  ip: string;
  status: 'idle' | 'queued' | 'scanning' | 'done' | 'error';
  progress: number;
  stats: {
    shodanPorts: number;
    reverseIP: number;
  };
}

type IPStatus = IPSession['status'];

const STATUS_META: Record<IPStatus, { label: string; color: string; pulse?: boolean }> = {
  idle: { label: 'IDLE', color: '#3a4558' },
  queued: { label: 'QUEUED', color: '#f5a623', pulse: true },
  scanning: { label: 'SCANNING', color: '#0af', pulse: true },
  done: { label: 'DONE', color: '#30d158' },
  error: { label: 'ERROR', color: '#ff2d55' },
};

const DEFAULT_SESSIONS: IPSession[] = [
  {
    id: 'sess-1',
    ip: '104.18.32.11',
    status: 'done',
    progress: 100,
    stats: { shodanPorts: 3, reverseIP: 4 },
  },
];

async function fetchIPData(ip: string): Promise<IPIntelData | null> {
  console.log(`[IPIntel] Fetching data for: ${ip}`);
  const sampleData = ipIntelData as IPIntelData;
  if (sampleData.networkInfo.ipAddress === ip) {
    return sampleData;
  }
  return null;
}

const SUB_TABS = [
  { id: 'overview', label: 'Overview', accent: '#0af' },
  { id: 'network', label: 'Network', accent: '#af52de' },
  { id: 'log', label: 'Log', accent: '#5e5ce6' },
] as const;

type SubTabId = (typeof SUB_TABS)[number]['id'];

interface IPIntelProps {
  initialIP?: string;
}

export default function IPIntel({ initialIP = '104.18.32.11' }: IPIntelProps) {
  const [sessions, setSessions] = useState<IPSession[]>(DEFAULT_SESSIONS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIP, setNewIP] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    sessionId: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [activeIP, setActiveIP] = useState<string>(initialIP);
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('overview');

  const [showTabsDropdown, setShowTabsDropdown] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [historyViewData, setHistoryViewData] = useState<IPIntelData | null>(null);
  const [data, setData] = useState<IPIntelData | null>(null);

  const activeTab = SUB_TABS.find((t) => t.id === activeSubTab)!;

  const fetchData = async (ip: string) => {
    const result = await fetchIPData(ip);
    setData(result);
  };

  useEffect(() => {
    if (activeIP) {
      fetchData(activeIP);
    }
  }, [activeIP]);

  const addIP = useCallback(() => {
    const ip = newIP.trim();
    if (!ip) return;
    if (sessions.some((s) => s.ip === ip)) return;
    const sess: IPSession = {
      id: `sess-${Date.now()}`,
      ip: ip,
      status: 'queued',
      progress: 0,
      stats: { shodanPorts: 0, reverseIP: 0 },
    };
    setSessions((prev) => [...prev, sess]);
    setNewIP('');
    setShowAddForm(false);
  }, [newIP, sessions]);

  const removeIP = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.tabs-dropdown-container')) setShowTabsDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleOpenHistory = () => {
    setIsHistoryMode(true);
    setHistoryViewData(null);
  };

  const handleSelectHistory = (historyData: IPIntelData) => {
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
    if (isSearchMode && searchQuery.trim()) {
      return (
        <Search data={data} searchQuery={searchQuery} onResultClick={handleSearchResultClick} />
      );
    }
    if (isHistoryMode) {
      return <History onSelectHistory={handleSelectHistory} onBack={handleBackFromHistory} />;
    }
    if (historyViewData) {
      return renderNormalContent(historyViewData);
    }
    return renderNormalContent(data);
  };

  const renderNormalContent = (reconData: IPIntelData | null) => {
    if (!reconData) {
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
          <div className="text-[32px] opacity-15">🌐</div>
          <div className="text-[12px] font-mono text-[#2a3548]">
            Enter an IP address to start passive intelligence gathering
          </div>
        </div>
      );
    }

    switch (activeSubTab) {
      case 'overview':
        return <Overview data={reconData} />;
      case 'network':
        return <NetworkInfo data={reconData} />;
      case 'log':
        return <Log data={reconData} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0f1319]">
      <div className="w-[293px] bg-[#0f1319] border-r border-[#1c2333] flex flex-col shrink-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 h-[40px] border-b border-[#1c2333] shrink-0">
          <span className="text-[14px] font-bold tracking-[0.12em] text-[#c8d6f0] font-mono">
            IP Targets
          </span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[#2a3548] hover:text-[#0af] hover:bg-[#0af15] transition-all p-1 rounded"
            title="Add IP"
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

        {showAddForm && (
          <div className="p-2 border-b border-[#1c2333] shrink-0">
            <div className="flex gap-1">
              <input
                autoFocus
                type="text"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addIP();
                  if (e.key === 'Escape') {
                    setShowAddForm(false);
                    setNewIP('');
                  }
                }}
                placeholder="192.168.1.1"
                spellCheck={false}
                className="flex-1 h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#0af] outline-none placeholder:text-[#2a3548]"
                style={{ caretColor: '#0af' }}
              />
              <button
                onClick={addIP}
                className="h-7 w-7 rounded text-[11px] font-bold font-mono transition-colors"
                style={{ background: '#0af15', border: '1px solid #0af30', color: '#0af' }}
              >
                +
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {sessions.map((sess) => {
            const meta = STATUS_META[sess.status];
            const isActive = sess.ip === activeIP;
            return (
              <div
                key={sess.id}
                onClick={() => setActiveIP(sess.ip)}
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
                    {sess.ip}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {contextMenu && (
          <div
            ref={menuRef}
            className="fixed z-50 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1 min-w-[140px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => {
                handleOpenHistory();
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-[#30d158] hover:bg-[#1c2333] transition-colors"
            >
              📜 Open History
            </button>
            <div className="border-t border-[#1c2333] my-1" />
            <button
              onClick={() => {
                removeIP(contextMenu.sessionId);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-[#ff2d55] hover:bg-[#1c2333] transition-colors"
            >
              ✕ Delete
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
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
                  <div className="absolute right-0 top-8 z-50 w-48 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1">
                    {SUB_TABS.map((tab) => {
                      const getIcon = () => {
                        switch (tab.id) {
                          case 'overview':
                            return <Activity className="w-3.5 h-3.5" />;
                          case 'network':
                            return <Globe className="w-3.5 h-3.5" />;
                          case 'log':
                            return <Terminal className="w-3.5 h-3.5" />;
                          default:
                            return <Activity className="w-3.5 h-3.5" />;
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
                            'w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-mono transition-colors',
                            activeSubTab === tab.id
                              ? 'bg-[#0af15] text-[#0af]'
                              : 'text-[#c8d6f0] hover:bg-[#1c2333]',
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