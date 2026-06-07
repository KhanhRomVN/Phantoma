import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { cn } from '../../../../../../shared/lib/utils';
import { TabOverview } from './components/Overview';
import { SQLi } from './components/SQLi';
import { XSS } from './components/XSS';
import { LFI_RFI } from './components/LFI_RFI';
import { SSRF } from './components/SSRF';
import { XXE } from './components/XXE';
import { Deserialization } from './components/Deserialization';
import { CommandInjection } from './components/CommandInjection';
import { Log } from './components/Log';
import { History } from './components/History';
import { Search } from './components/Search';
import {
  Activity,
  Droplets,
  Tags,
  FolderOpen,
  RefreshCw,
  FileCode,
  Dna,
  Terminal,
  Globe,
} from 'lucide-react';

import sampleData from './data/sample-target.json';

import type { WebsiteAttackData, WebsiteSession, WebsiteAttackStatus } from './types/website-attack';

const STATUS_META: Record<WebsiteAttackStatus, { label: string; color: string; pulse?: boolean }> = {
  idle: { label: 'IDLE', color: '#3a4558' },
  queued: { label: 'QUEUED', color: '#f5a623', pulse: true },
  scanning: { label: 'SCANNING', color: '#0af', pulse: true },
  exploiting: { label: 'EXPLOITING', color: '#ff2d55', pulse: true },
  success: { label: 'DONE', color: '#30d158' },
  failed: { label: 'FAILED', color: '#ff2d55' },
  error: { label: 'ERROR', color: '#ff2d55' },
};

const DEFAULT_SESSIONS: WebsiteSession[] = [
  {
    id: 'sess-1',
    url: 'http://testphp.vulnweb.com',
    status: 'success',
    progress: 100,
    riskLevel: 'critical',
    stats: { exploitsAttempted: 7, exploitsSuccessful: 6, vulnsFound: 6, dataExtracted: true },
  },
  {
    id: 'sess-2',
    url: 'http://demo.testfire.net',
    status: 'success',
    progress: 100,
    riskLevel: 'high',
    stats: { exploitsAttempted: 5, exploitsSuccessful: 2, vulnsFound: 2, dataExtracted: true },
  },
];

async function fetchWebsiteAttackData(url: string): Promise<WebsiteAttackData | null> {
  console.log(`[WebAttack] Fetching data for: ${url}`);
  try {
    // @ts-ignore
    if (typeof sampleData !== 'undefined' && sampleData && sampleData.targetUrl === url) {
      console.log('[WebAttack] Using sample data');
      // @ts-ignore
      return sampleData;
    }
  } catch (e) {
    console.log('[WebAttack] Sample data not available');
  }
  return null;
}

const SUB_TABS = [
  { id: 'overview', label: 'Overview', accent: '#0af' },
  { id: 'sqli', label: 'SQLi', accent: '#ff2d55' },
  { id: 'xss', label: 'XSS', accent: '#ff9f0a' },
  { id: 'lfi-rfi', label: 'LFI/RFI', accent: '#30d158' },
  { id: 'ssrf', label: 'SSRF', accent: '#bf5af2' },
  { id: 'xxe', label: 'XXE', accent: '#5e5ce6' },
  { id: 'deserialization', label: 'Deserialize', accent: '#ff6b35' },
  { id: 'command-injection', label: 'Cmd Injection', accent: '#ff2d55' },
  { id: 'terminal', label: 'Log', accent: '#30d158' },
] as const;

type SubTabId = (typeof SUB_TABS)[number]['id'];

interface WebsiteAttackProps {
  initialUrl?: string;
}

export default function WebsiteAttack({ initialUrl = 'http://testphp.vulnweb.com' }: WebsiteAttackProps) {
  const [sessions, setSessions] = useState<WebsiteSession[]>(DEFAULT_SESSIONS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sessionId: string } | null>(null);

  const [activeUrl, setActiveUrl] = useState<string>(initialUrl);
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('overview');
  const [urlInput, setUrlInput] = useState(activeUrl);

  const [showTabsDropdown, setShowTabsDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [historyViewData, setHistoryViewData] = useState<WebsiteAttackData | null>(null);

  const [data, setData] = useState<WebsiteAttackData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const activeTab = SUB_TABS.find((t) => t.id === activeSubTab)!;

  const fetchData = async (url: string) => {
    setIsLoading(true);
    const result = await fetchWebsiteAttackData(url);
    setData(result);
    setIsLoading(false);
  };

  useEffect(() => { setUrlInput(activeUrl); }, [activeUrl]);
  useEffect(() => { if (activeUrl) fetchData(activeUrl); }, [activeUrl]);

  const handleAttack = () => {
    if (!urlInput.trim()) return;
    setActiveUrl(urlInput.trim());
  };

  const addUrl = useCallback(() => {
    const u = newUrl.trim().toLowerCase().replace(/\/$/, '');
    if (!u) return;
    if (sessions.some((s) => s.url === u)) return;
    const sess: WebsiteSession = {
      id: `sess-${Date.now()}`,
      url: u,
      status: 'queued',
      progress: 0,
      stats: { exploitsAttempted: 0, exploitsSuccessful: 0, vulnsFound: 0, dataExtracted: false },
    };
    setSessions((prev) => [...prev, sess]);
    setNewUrl('');
    setShowAddForm(false);
  }, [newUrl, sessions]);

  const removeUrl = useCallback((id: string) => {
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
      if (!(e.target as HTMLElement).closest('.tabs-dropdown-container')) setShowTabsDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleOpenHistory = () => { setIsHistoryMode(true); setHistoryViewData(null); };
  const handleSelectHistory = (hData: WebsiteAttackData) => { setHistoryViewData(hData); };
  const handleBackFromHistory = () => { setIsHistoryMode(false); setHistoryViewData(null); };

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
    if (isSearchMode && searchQuery.trim()) return <Search data={data} searchQuery={searchQuery} onResultClick={handleSearchResultClick} />;
    if (isHistoryMode) return <History onSelectHistory={handleSelectHistory} onBack={handleBackFromHistory} />;
    if (historyViewData) return renderNormalContent(historyViewData);
    return renderNormalContent(data);
  };

  const renderNormalContent = (attackData: WebsiteAttackData | null) => {
    if (!attackData) {
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
          <div className="text-[32px] opacity-15">🌐</div>
          <div className="text-[11px] font-mono text-[#2a3548]">Enter a target URL and click "Attack" to launch web exploits</div>
        </div>
      );
    }

    switch (activeSubTab) {
      case 'overview': return <TabOverview data={attackData} />;
      case 'sqli': return <SQLi data={attackData} />;
      case 'xss': return <XSS data={attackData} />;
      case 'lfi-rfi': return <LFI_RFI data={attackData} />;
      case 'ssrf': return <SSRF data={attackData} />;
      case 'xxe': return <XXE data={attackData} />;
      case 'deserialization': return <Deserialization data={attackData} />;
      case 'command-injection': return <CommandInjection data={attackData} />;
      case 'terminal': return <Log data={attackData} />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0f1319]">
      {/* Left panel: Target list */}
      <div className="w-[293px] bg-[#0f1319] border-r border-[#1c2333] flex flex-col shrink-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 h-[40px] border-b border-[#1c2333] shrink-0 bg-[#0f1319]">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold tracking-[0.12em] text-[#0af] font-mono">Targets</span>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} className="text-[#2a3548] hover:text-[#0af] hover:bg-[#0af15] transition-all p-1 rounded" title="Add URL">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        {showAddForm && (
          <div className="p-2 border-b border-[#1c2333] shrink-0">
            <div className="flex gap-1">
              <input autoFocus type="text" value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addUrl(); if (e.key === 'Escape') { setShowAddForm(false); setNewUrl(''); } }}
                placeholder="https://example.com" spellCheck={false}
                className="flex-1 h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#0af] outline-none placeholder:text-[#2a3548]" style={{ caretColor: '#0af' }} />
              <button onClick={addUrl} className="h-7 w-7 rounded text-[11px] font-bold font-mono transition-colors" style={{ background: '#0af15', border: '1px solid #0af30', color: '#0af' }}>+</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-[#0f1319]">
          {sessions.map((sess) => {
            const meta = STATUS_META[sess.status];
            const isActive = sess.url === activeUrl;
            return (
              <div key={sess.id} onClick={() => setActiveUrl(sess.url)} onContextMenu={(e) => handleContextMenu(e, sess.id)}
                className={cn('p-2 rounded cursor-pointer transition-all relative', isActive ? 'bg-[#0d1017]' : 'bg-[#0a0e14] hover:bg-[#111827]')}>
                {isActive && <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full" style={{ background: meta.color }} />}
                <div className="flex items-center gap-2 pl-1">
                  <span className="text-[13px] font-mono font-bold flex-1 truncate" style={{ color: isActive ? '#c8d6f0' : '#6a7a9a' }}>{sess.url.replace(/^https?:\/\//, '')}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: meta.color, background: `${meta.color}12`, border: `1px solid ${meta.color}30` }}>{meta.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {contextMenu && (
          <div className="fixed z-50 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1 min-w-[140px]" style={{ top: contextMenu.y, left: contextMenu.x }}>
            <button onClick={() => { handleOpenHistory(); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-[#30d158] hover:bg-[#1c2333] transition-colors">📜 Open History</button>
            <div className="border-t border-[#1c2333] my-1" />
            <button onClick={() => { removeUrl(contextMenu.sessionId); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-[#ff2d55] hover:bg-[#1c2333] transition-colors">✕ Delete</button>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0f1319]">
        <div className="flex flex-col flex-1 overflow-hidden bg-[#0f1319]">
          <div className="flex items-center justify-between px-3 h-10 bg-[#0f1319] border-b border-[#1c2333] shrink-0">
            <span className="text-[12px] font-mono font-bold text-[#c8d6f0]">{activeTab.label}</span>
            <div className="flex items-center gap-3">
              <input type="text" value={searchQuery} onChange={handleSearchChange} placeholder="Search..." className="h-7 w-[21rem] bg-[#0d1017] border border-[#1c2333] rounded text-[#0af] text-[11px] px-2 outline-none font-mono placeholder:text-[#2a3548]" />
              <div className="relative tabs-dropdown-container">
                <button onClick={() => setShowTabsDropdown(!showTabsDropdown)} className="h-6 w-6 flex items-center justify-center bg-[#1c2333] border border-[#2a3548] text-[#6a7a9a] rounded hover:text-[#c8d6f0] hover:border-[#0af30] transition-colors" title="Switch tab">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="6" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="18" r="2" /></svg>
                </button>
                {showTabsDropdown && (
                  <div className="absolute right-0 top-8 z-50 w-48 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1">
                    {SUB_TABS.map((tab) => {
                      const getIcon = () => {
                        switch (tab.id) {
                          case 'overview': return <Activity className="w-3.5 h-3.5" />;
                          case 'sqli': return <Droplets className="w-3.5 h-3.5" />;
                          case 'xss': return <Tags className="w-3.5 h-3.5" />;
                          case 'lfi-rfi': return <FolderOpen className="w-3.5 h-3.5" />;
                          case 'ssrf': return <RefreshCw className="w-3.5 h-3.5" />;
                          case 'xxe': return <FileCode className="w-3.5 h-3.5" />;
                          case 'deserialization': return <Dna className="w-3.5 h-3.5" />;
                          case 'command-injection': return <Terminal className="w-3.5 h-3.5" />;
                          case 'terminal': return <Terminal className="w-3.5 h-3.5" />;
                          default: return <Activity className="w-3.5 h-3.5" />;
                        }
                      };
                      return (
                        <button key={tab.id} onClick={() => { setActiveSubTab(tab.id); setShowTabsDropdown(false); }}
                          className={cn("w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-mono transition-colors", activeSubTab === tab.id ? "bg-[#0af15] text-[#0af]" : "text-[#c8d6f0] hover:bg-[#1c2333]")}>
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