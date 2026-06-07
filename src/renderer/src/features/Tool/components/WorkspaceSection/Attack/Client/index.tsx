import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '../../../../../../shared/lib/utils';
import { TabOverview } from './components/Overview';
import { Phishing } from './components/Phishing';
import { MalwareDropper } from './components/MalwareDropper';
import { Log } from './components/Log';
import { History } from './components/History';
import { Search } from './components/Search';
import { Activity, Fish, Bomb, Terminal } from 'lucide-react';

import sampleData from './data/sample-campaign.json';

import type { ClientAttackData, ClientSession, ClientAttackStatus } from './types/client-attack';

const STATUS_META: Record<ClientAttackStatus, { label: string; color: string; pulse?: boolean }> = {
  idle: { label: 'IDLE', color: '#3a4558' },
  queued: { label: 'QUEUED', color: '#f5a623', pulse: true },
  building: { label: 'BUILDING', color: '#0af', pulse: true },
  deploying: { label: 'DEPLOYING', color: '#ff2d55', pulse: true },
  success: { label: 'DONE', color: '#30d158' },
  failed: { label: 'FAILED', color: '#ff2d55' },
  error: { label: 'ERROR', color: '#ff2d55' },
};

const DEFAULT_SESSIONS: ClientSession[] = [
  { id: 'sess-1', target: 'corp-target.com', campaign: 'Q4 Security Test', status: 'success', progress: 100, riskLevel: 'critical', stats: { payloadsCreated: 2, emailsSent: 150, credentialsCaptured: 6, sessionsEstablished: 4 } },
  { id: 'sess-2', target: 'acme-corp.com', campaign: 'Vendor Assessment', status: 'done', progress: 100, riskLevel: 'medium', stats: { payloadsCreated: 1, emailsSent: 50, credentialsCaptured: 2, sessionsEstablished: 1 } },
];

async function fetchClientAttackData(target: string): Promise<ClientAttackData | null> {
  console.log(`[ClientAttack] Fetching data for: ${target}`);
  try { // @ts-ignore
    if (typeof sampleData !== 'undefined' && sampleData && sampleData.target === target) { console.log('[ClientAttack] Using sample data'); return sampleData as ClientAttackData; }
  } catch (e) { console.log('[ClientAttack] Sample data not available'); }
  return null;
}

const SUB_TABS = [
  { id: 'overview', label: 'Overview', accent: '#0af' },
  { id: 'phishing', label: 'Phishing', accent: '#f5a623' },
  { id: 'malware-dropper', label: 'Malware Dropper', accent: '#ff2d55' },
  { id: 'terminal', label: 'Log', accent: '#30d158' },
] as const;

type SubTabId = (typeof SUB_TABS)[number]['id'];

interface ClientAttackProps { initialTarget?: string; }

export default function ClientAttack({ initialTarget = 'corp-target.com' }: ClientAttackProps) {
  const [sessions, setSessions] = useState<ClientSession[]>(DEFAULT_SESSIONS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTarget, setNewTarget] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sessionId: string } | null>(null);

  const [activeTarget, setActiveTarget] = useState<string>(initialTarget);
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('overview');
  const [showTabsDropdown, setShowTabsDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [historyViewData, setHistoryViewData] = useState<ClientAttackData | null>(null);

  const [data, setData] = useState<ClientAttackData | null>(null);

  const activeTab = SUB_TABS.find((t) => t.id === activeSubTab)!;

  const fetchData = async (target: string) => {
    const result = await fetchClientAttackData(target);
    setData(result);
  };

  useEffect(() => { if (activeTarget) fetchData(activeTarget); }, [activeTarget]);

  const addTarget = useCallback(() => {
    const t = newTarget.trim();
    if (!t || sessions.some((s) => s.target === t)) return;
    setSessions((prev) => [...prev, { id: `sess-${Date.now()}`, target: t, campaign: '', status: 'queued', progress: 0, stats: { payloadsCreated: 0, emailsSent: 0, credentialsCaptured: 0, sessionsEstablished: 0 } }]);
    setNewTarget(''); setShowAddForm(false);
  }, [newTarget, sessions]);

  const removeTarget = useCallback((id: string) => setSessions((prev) => prev.filter((s) => s.id !== id)), []);

  const handleContextMenu = (e: React.MouseEvent, sessionId: string) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, sessionId }); };

  useEffect(() => { const h = () => setContextMenu(null); document.addEventListener('click', h); return () => document.removeEventListener('click', h); }, []);
  useEffect(() => { const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.tabs-dropdown-container')) setShowTabsDropdown(false); }; document.addEventListener('click', h); return () => document.removeEventListener('click', h); }, []);

  const handleOpenHistory = () => { setIsHistoryMode(true); setHistoryViewData(null); };
  const handleSelectHistory = (hData: ClientAttackData) => { setHistoryViewData(hData); };
  const handleBackFromHistory = () => { setIsHistoryMode(false); setHistoryViewData(null); };
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchQuery(e.target.value); setIsSearchMode(e.target.value.trim().length > 0); };
  const handleSearchResultClick = (tabId: string) => { setActiveSubTab(tabId as SubTabId); setIsSearchMode(false); setSearchQuery(''); };

  const renderContent = () => {
    if (isSearchMode && searchQuery.trim()) return <Search data={data} searchQuery={searchQuery} onResultClick={handleSearchResultClick} />;
    if (isHistoryMode) return <History onSelectHistory={handleSelectHistory} onBack={handleBackFromHistory} />;
    if (historyViewData) return renderNormalContent(historyViewData);
    return renderNormalContent(data);
  };

  const renderNormalContent = (d: ClientAttackData | null) => {
    if (!d) return <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]"><div className="text-[32px] opacity-15">🎯</div><div className="text-[11px] font-mono text-[#2a3548]">Enter a target organization and click "Attack" to launch client-side campaign</div></div>;
    switch (activeSubTab) {
      case 'overview': return <TabOverview data={d} />;
      case 'phishing': return <Phishing data={d} />;
      case 'malware-dropper': return <MalwareDropper data={d} />;
      case 'terminal': return <Log data={d} />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0f1319]">
      <div className="w-[293px] bg-[#0f1319] border-r border-[#1c2333] flex flex-col shrink-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 h-[40px] border-b border-[#1c2333] shrink-0 bg-[#0f1319]">
          <span className="text-[14px] font-bold tracking-[0.12em] text-[#f5a623] font-mono">Campaigns</span>
          <button onClick={() => setShowAddForm(!showAddForm)} className="text-[#2a3548] hover:text-[#f5a623] hover:bg-[#f5a62315] transition-all p-1 rounded" title="Add target">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        {showAddForm && (
          <div className="p-2 border-b border-[#1c2333] shrink-0">
            <div className="flex gap-1">
              <input autoFocus type="text" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addTarget(); if (e.key === 'Escape') { setShowAddForm(false); setNewTarget(''); } }} placeholder="company.com" spellCheck={false} className="flex-1 h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#f5a623] outline-none placeholder:text-[#2a3548]" style={{ caretColor: '#f5a623' }} />
              <button onClick={addTarget} className="h-7 w-7 rounded text-[11px] font-bold font-mono" style={{ background: '#f5a62315', border: '1px solid #f5a62330', color: '#f5a623' }}>+</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-[#0f1319]">
          {sessions.map((sess) => {
            const meta = STATUS_META[sess.status];
            const isActive = sess.target === activeTarget;
            return (
              <div key={sess.id} onClick={() => setActiveTarget(sess.target)} onContextMenu={(e) => handleContextMenu(e, sess.id)} className={cn('p-2 rounded cursor-pointer transition-all relative', isActive ? 'bg-[#0d1017]' : 'bg-[#0a0e14] hover:bg-[#111827]')}>
                {isActive && <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full" style={{ background: meta.color }} />}
                <div className="flex items-center gap-2 pl-1">
                  <span className="text-[13px] font-mono font-bold flex-1 truncate" style={{ color: isActive ? '#c8d6f0' : '#6a7a9a' }}>{sess.target}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: meta.color, background: `${meta.color}12`, border: `1px solid ${meta.color}30` }}>{meta.label}</span>
                </div>
                {sess.campaign && <div className="text-[10px] font-mono text-[#2a3548] mt-0.5 pl-1">{sess.campaign}</div>}
              </div>
            );
          })}
        </div>

        {contextMenu && (
          <div className="fixed z-50 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1 min-w-[140px]" style={{ top: contextMenu.y, left: contextMenu.x }}>
            <button onClick={() => { handleOpenHistory(); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-[#30d158] hover:bg-[#1c2333] transition-colors">📜 Open History</button>
            <div className="border-t border-[#1c2333] my-1" />
            <button onClick={() => { removeTarget(contextMenu.sessionId); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-[#ff2d55] hover:bg-[#1c2333] transition-colors">✕ Delete</button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-[#0f1319]">
        <div className="flex flex-col flex-1 overflow-hidden bg-[#0f1319]">
          <div className="flex items-center justify-between px-3 h-10 bg-[#0f1319] border-b border-[#1c2333] shrink-0">
            <span className="text-[12px] font-mono font-bold text-[#c8d6f0]">{activeTab.label}</span>
            <div className="flex items-center gap-3">
              <input type="text" value={searchQuery} onChange={handleSearchChange} placeholder="Search..." className="h-7 w-[21rem] bg-[#0d1017] border border-[#1c2333] rounded text-[#f5a623] text-[11px] px-2 outline-none font-mono placeholder:text-[#2a3548]" />
              <div className="relative tabs-dropdown-container">
                <button onClick={() => setShowTabsDropdown(!showTabsDropdown)} className="h-6 w-6 flex items-center justify-center bg-[#1c2333] border border-[#2a3548] text-[#6a7a9a] rounded hover:text-[#c8d6f0] hover:border-[#f5a62330] transition-colors" title="Switch tab">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="6" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="18" r="2" /></svg>
                </button>
                {showTabsDropdown && (
                  <div className="absolute right-0 top-8 z-50 w-48 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1">
                    {SUB_TABS.map((tab) => (
                      <button key={tab.id} onClick={() => { setActiveSubTab(tab.id); setShowTabsDropdown(false); }} className={cn("w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-mono transition-colors", activeSubTab === tab.id ? "bg-[#f5a62315] text-[#f5a623]" : "text-[#c8d6f0] hover:bg-[#1c2333]")}>
                        <div className="flex items-center gap-2">
                          {tab.id === 'overview' ? <Activity className="w-3.5 h-3.5" /> : tab.id === 'phishing' ? <Fish className="w-3.5 h-3.5" /> : tab.id === 'malware-dropper' ? <Bomb className="w-3.5 h-3.5" /> : <Terminal className="w-3.5 h-3.5" />}
                          <span>{tab.label}</span>
                        </div>
                      </button>
                    ))}
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