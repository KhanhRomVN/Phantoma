import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '../../../../../../shared/lib/utils';
import { WebsiteOverview } from './components/Overview';
import { WebsiteDirectoryFuzz } from './components/DirectoryFuzz';
import { WebsiteVulnScan } from './components/VulnScan';
import { WebsiteSSLTest } from './components/SSLTest';
import { WebsiteHeaders } from './components/Headers';
import { WebsiteLog } from './components/Log';
import { WebsiteSearch } from './components/Search';
import { WebsiteHistory } from './components/History';
import {
  Activity,
  FolderSearch,
  Shield,
  Lock,
  FileText,
  Terminal,
} from 'lucide-react';

// Optional sample data
import sampleData from './data/website-sample.json';

// Types
import type { WebsiteScanSession, ScanWebsiteStatus, ScanWebsiteData, ScanWebsiteSubTabId } from './types/scan-website-data';

// ============================================================================
// Status & Session Data
// ============================================================================

const STATUS_META: Record<ScanWebsiteStatus, { label: string; color: string; pulse?: boolean }> = {
  idle: { label: 'IDLE', color: '#3a4558' },
  queued: { label: 'QUEUED', color: '#f5a623', pulse: true },
  scanning: { label: 'SCANNING', color: '#0af', pulse: true },
  done: { label: 'DONE', color: '#30d158' },
  error: { label: 'ERROR', color: '#ff2d55' },
};

const DEFAULT_SESSIONS: WebsiteScanSession[] = [
  {
    id: 'web-sess-1',
    url: 'https://example.com',
    status: 'done',
    progress: 100,
    riskScore: 72,
    stats: { directoriesFound: 12, vulnerabilities: 7, sslGrade: 'A', headersPassed: 5 },
  },
];

// TODO: Replace with actual API call
async function fetchWebsiteData(url: string): Promise<ScanWebsiteData | null> {
  console.log(`[WebsiteScan] Fetching data for: ${url}`);

  try {
    if (typeof sampleData !== 'undefined' && sampleData && sampleData.target === url) {
      console.log('[WebsiteScan] Using sample data from website-sample.json');
      // @ts-ignore
      return sampleData;
    }
  } catch (e) {
    console.log('[WebsiteScan] Sample data not available, using API');
  }

  console.log('[WebsiteScan] No data source available, returning null');
  return null;
}

// ============================================================================
// Tab Configuration
// ============================================================================

const SUB_TABS = [
  { id: 'overview', label: 'Overview', accent: '#0af' },
  { id: 'directory-fuzz', label: 'Dir Fuzz', accent: '#0af' },
  { id: 'vuln-scan', label: 'Vuln Scan', accent: '#ff2d55' },
  { id: 'ssl-test', label: 'SSL/TLS', accent: '#30d158' },
  { id: 'headers', label: 'Headers', accent: '#5e5ce6' },
  { id: 'terminal', label: 'Log', accent: '#30d158' },
] as const;

// ============================================================================
// Main Component
// ============================================================================

interface WebsiteScanProps {
  initialUrl?: string;
}

export default function WebsiteScan({ initialUrl = 'https://example.com' }: WebsiteScanProps) {
  // State for sessions (target list)
  const [sessions, setSessions] = useState<WebsiteScanSession[]>(DEFAULT_SESSIONS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    sessionId: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // State for active target and panel
  const [activeUrl, setActiveUrl] = useState<string>(initialUrl);
  const [activeSubTab, setActiveSubTab] = useState<ScanWebsiteSubTabId>('overview');
  const [urlInput, setUrlInput] = useState(activeUrl);

  // State for dropdowns
  const [showTabsDropdown, setShowTabsDropdown] = useState(false);
  const [showRunSelectedDropdown, setShowRunSelectedDropdown] = useState(false);
  const [selectedTabs, setSelectedTabs] = useState<Set<ScanWebsiteSubTabId>>(new Set());

  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  // State for history mode
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [historyViewData, setHistoryViewData] = useState<ScanWebsiteData | null>(null);

  // Data fetching state
  const [data, setData] = useState<ScanWebsiteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const activeTab = SUB_TABS.find((t) => t.id === activeSubTab)!;

  // Fetch data for a URL
  const fetchData = async (url: string) => {
    setIsLoading(true);
    const result = await fetchWebsiteData(url);
    setData(result);
    setIsLoading(false);
  };

  // Update input when activeUrl changes
  useEffect(() => {
    setUrlInput(activeUrl);
  }, [activeUrl]);

  // Fetch data when activeUrl changes
  useEffect(() => {
    if (activeUrl) {
      fetchData(activeUrl);
    }
  }, [activeUrl]);

  const handleLookup = () => {
    if (!urlInput.trim()) return;
    setActiveUrl(urlInput.trim());
  };

  // Target list functions
  const addUrl = useCallback(() => {
    const u = newUrl.trim();
    if (!u) return;
    if (sessions.some((s) => s.url === u)) return;
    const sess: WebsiteScanSession = {
      id: `web-sess-${Date.now()}`,
      url: u,
      status: 'queued',
      progress: 0,
      stats: { directoriesFound: 0, vulnerabilities: 0, sslGrade: 'N/A', headersPassed: 0 },
    };
    setSessions((prev) => [...prev, sess]);
    setNewUrl('');
    setShowAddForm(false);
  }, [newUrl, sessions]);

  const removeUrl = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const runScan = useCallback((url: string) => {
    console.log('Running full web scan for:', url);
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

  const handleSelectHistory = (historyData: ScanWebsiteData) => {
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
    setActiveSubTab(tabId as ScanWebsiteSubTabId);
    setIsSearchMode(false);
    setSearchQuery('');
  };

  const renderContent = () => {
    if (isSearchMode && searchQuery.trim()) {
      return <WebsiteSearch data={data} searchQuery={searchQuery} onResultClick={handleSearchResultClick} />;
    }
    if (isHistoryMode) {
      return <WebsiteHistory onSelectHistory={handleSelectHistory} onBack={handleBackFromHistory} />;
    }
    if (historyViewData) {
      return renderNormalContent(historyViewData);
    }
    return renderNormalContent(data);
  };

  const renderNormalContent = (scanData: ScanWebsiteData | null) => {
    if (!scanData) {
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
          <div className="text-[32px] opacity-15">🌐</div>
          <div className="text-[11px] font-mono text-[#2a3548]">
            Enter a URL and click "Scan" to start active web application scanning
          </div>
        </div>
      );
    }

    switch (activeSubTab) {
      case 'overview':
        return <WebsiteOverview data={scanData} />;
      case 'directory-fuzz':
        return <WebsiteDirectoryFuzz data={scanData} />;
      case 'vuln-scan':
        return <WebsiteVulnScan data={scanData} />;
      case 'ssl-test':
        return <WebsiteSSLTest data={scanData} />;
      case 'headers':
        return <WebsiteHeaders data={scanData} />;
      case 'terminal':
        return <WebsiteLog data={scanData} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0f1319]">
      {/* Left panel: Target list */}
      <div className="w-[293px] bg-[#0f1319] border-r border-[#1c2333] flex flex-col shrink-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 h-[40px] border-b border-[#1c2333] shrink-0 bg-[#0f1319]">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold tracking-[0.12em] text-[#c8d6f0] font-mono">
              URLs
            </span>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[#2a3548] hover:text-[#ff2d55] hover:bg-[#ff2d5515] transition-all p-1 rounded"
            title="Add URL"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {showAddForm && (
          <div className="p-2 border-b border-[#1c2333] shrink-0">
            <div className="flex gap-1">
              <input
                autoFocus
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addUrl();
                  if (e.key === 'Escape') { setShowAddForm(false); setNewUrl(''); }
                }}
                placeholder="https://example.com"
                spellCheck={false}
                className="flex-1 h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#ff2d55] outline-none placeholder:text-[#2a3548]"
                style={{ caretColor: '#ff2d55' }}
              />
              <button
                onClick={addUrl}
                className="h-7 w-7 rounded text-[11px] font-bold font-mono transition-colors"
                style={{ background: '#ff2d5515', border: '1px solid #ff2d5530', color: '#ff2d55' }}
              >
                +
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-[#0f1319]">
          {sessions.map((sess) => {
            const meta = STATUS_META[sess.status];
            const isActive = sess.url === activeUrl;
            return (
              <div
                key={sess.id}
                onClick={() => setActiveUrl(sess.url)}
                onContextMenu={(e) => handleContextMenu(e, sess.id)}
                className={cn(
                  'p-2 rounded cursor-pointer transition-all relative',
                  isActive ? 'bg-[#0d1017]' : 'bg-[#0a0e14] hover:bg-[#111827]',
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full" style={{ background: meta.color }} />
                )}
                <div className="flex items-center gap-2 pl-1">
                  <span
                    className="text-[13px] font-mono font-bold flex-1 truncate"
                    style={{ color: isActive ? '#c8d6f0' : '#6a7a9a' }}
                  >
                    {sess.url.replace('https://', '')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {contextMenu && (
          <div
            ref={menuRef}
            className="fixed z-50 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => {
                const session = sessions.find((s) => s.id === contextMenu.sessionId);
                if (session) runScan(session.url);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-[#ff2d55] hover:bg-[#1c2333] transition-colors"
            >
              ▶ Run Full Scan
            </button>
            <button
              onClick={() => { handleOpenHistory(); setContextMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-[#30d158] hover:bg-[#1c2333] transition-colors"
            >
              📜 Open History
            </button>
            <button
              onClick={() => { handleRunSelectedClick(); setContextMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-[#ff9f0a] hover:bg-[#1c2333] transition-colors"
            >
              ✓ Run Selected
            </button>
            <div className="border-t border-[#1c2333] my-1" />
            <button
              onClick={() => { removeUrl(contextMenu.sessionId); setContextMenu(null); }}
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
                    <circle cx="12" cy="6" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="18" r="2" />
                  </svg>
                </button>
                {showTabsDropdown && (
                  <div className="absolute right-0 top-8 z-50 w-48 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1">
                    {SUB_TABS.map((tab) => {
                      const getIcon = () => {
                        switch (tab.id) {
                          case 'overview': return <Activity className="w-3.5 h-3.5" />;
                          case 'directory-fuzz': return <FolderSearch className="w-3.5 h-3.5" />;
                          case 'vuln-scan': return <Shield className="w-3.5 h-3.5" />;
                          case 'ssl-test': return <Lock className="w-3.5 h-3.5" />;
                          case 'headers': return <FileText className="w-3.5 h-3.5" />;
                          case 'terminal': return <Terminal className="w-3.5 h-3.5" />;
                          default: return <Activity className="w-3.5 h-3.5" />;
                        }
                      };
                      return (
                        <button
                          key={tab.id}
                          onClick={() => { setActiveSubTab(tab.id); setShowTabsDropdown(false); }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-mono transition-colors",
                            activeSubTab === tab.id
                              ? "bg-[#ff2d5515] text-[#ff2d55]"
                              : "text-[#c8d6f0] hover:bg-[#1c2333]"
                          )}
                        >
                          <div className="flex items-center gap-2">{getIcon()}<span>{tab.label}</span></div>
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