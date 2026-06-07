import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '../../../../../../shared/lib/utils';
import { PersonIdentity } from './components/PersonIdentity';
import { ContactInfo } from './components/ContactInfo';
import { SocialMedia } from './components/SocialMedia';
import { TechnicalFootprint } from './components/TechnicalFootprint';
import { LeakExposure } from './components/LeakExposure';
import { NoiseResults } from './components/NoiseResults';
import { PersonLog as Log } from './components/Log';
import { Search } from './components/Search';
import { History } from './components/History';
import type { PersonData } from './types/person-data';

import phantomaNameData     from './data/phantoma-name.json';
import phantomaEmailData    from './data/phantoma-email.json';
import phantomaUsernameData from './data/phantoma-username.json';

import {
  User, Mail, Share2, Cpu, AlertTriangle, Activity, FileText, Filter
} from 'lucide-react';

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
  idle:     { label: 'IDLE',     color: '#3a4558' },
  queued:   { label: 'QUEUED',   color: '#f5a623', pulse: true },
  scanning: { label: 'SCANNING', color: '#0af',    pulse: true },
  done:     { label: 'DONE',     color: '#30d158' },
  error:    { label: 'ERROR',    color: '#ff2d55' },
};

const QUERY_TYPE_META: Record<string, { label: string; color: string }> = {
  name:     { label: 'NAME',  color: '#af52de' },
  email:    { label: 'EMAIL', color: '#30d158' },
  username: { label: 'USER',  color: '#0a84ff' },
};

const DEFAULT_SESSIONS: PersonSession[] = [
  { id: 'sess-1', name: 'Phantoma',           queryType: 'name',     status: 'done', progress: 100, riskScore: 72 },
  { id: 'sess-2', name: 'phantoma@gmail.com', queryType: 'email',    status: 'done', progress: 100, riskScore: 44 },
  { id: 'sess-3', name: 'phantoma_123',       queryType: 'username', status: 'done', progress: 100, riskScore: 91 },
];

const DATA_MAP: Record<string, PersonData> = {
  'Phantoma':           phantomaNameData     as unknown as PersonData,
  'phantoma@gmail.com': phantomaEmailData    as unknown as PersonData,
  'phantoma_123':       phantomaUsernameData as unknown as PersonData,
};

function fetchPersonData(personName: string): PersonData | null {
  return DATA_MAP[personName] ?? null;
}

const SUB_TABS = [
  { id: 'identity',  label: 'Identity',    accent: '#af52de' },
  { id: 'contact',   label: 'Contact',     accent: '#30d158' },
  { id: 'social',    label: 'Social',      accent: '#0a84ff' },
  { id: 'technical', label: 'Technical',   accent: '#64d2ff' },
  { id: 'leaks',     label: 'Leaks',       accent: '#ff375f' },
  { id: 'noise',     label: 'Noise / Svc', accent: '#f5a623' },
  { id: 'log',       label: 'Log',         accent: '#5e5ce6' },
] as const;

type SubTabId = (typeof SUB_TABS)[number]['id'];

interface PersonReconProps {
  initialPerson?: string;
}

export default function PersonRecon({ initialPerson = 'Phantoma' }: PersonReconProps) {
  const [sessions, setSessions]               = useState<PersonSession[]>(DEFAULT_SESSIONS);
  const [showAddForm, setShowAddForm]         = useState(false);
  const [newPerson, setNewPerson]             = useState('');
  const [newQueryType, setNewQueryType]       = useState<'name' | 'email' | 'username'>('name');
  const [contextMenu, setContextMenu]         = useState<{ x: number; y: number; sessionId: string } | null>(null);
  const menuRef                               = useRef<HTMLDivElement>(null);

  const [activePerson, setActivePerson]       = useState<string>(initialPerson);
  const [activeSubTab, setActiveSubTab]       = useState<SubTabId>('identity');

  const [showTabsDropdown, setShowTabsDropdown]           = useState(false);
  const [showRunSelectedDropdown, setShowRunSelectedDropdown] = useState(false);

  const [searchQuery, setSearchQuery]         = useState('');
  const [isSearchMode, setIsSearchMode]       = useState(false);
  const [isHistoryMode, setIsHistoryMode]     = useState(false);
  const [historyViewData, setHistoryViewData] = useState<PersonData | null>(null);
  const [data, setData]                       = useState<PersonData | null>(null);

  const activeTab = SUB_TABS.find((t) => t.id === activeSubTab)!;

  useEffect(() => {
    if (activePerson) {
      setData(fetchPersonData(activePerson));
    }
  }, [activePerson]);

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

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.tabs-dropdown-container'))        setShowTabsDropdown(false);
      if (!target.closest('.run-selected-dropdown-container')) setShowRunSelectedDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleOpenHistory        = () => { setIsHistoryMode(true); setHistoryViewData(null); };
  const handleSelectHistory      = (historyData: PersonData) => setHistoryViewData(historyData);
  const handleBackFromHistory    = () => { setIsHistoryMode(false); setHistoryViewData(null); };
  const handleRunSelectedClick   = () => setShowRunSelectedDropdown(!showRunSelectedDropdown);

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
    if (isSearchMode && searchQuery.trim())
      return <Search data={data} searchQuery={searchQuery} onResultClick={handleSearchResultClick} />;
    if (isHistoryMode)
      return <History onSelectHistory={handleSelectHistory} onBack={handleBackFromHistory} />;
    if (historyViewData) return renderNormalContent(historyViewData);
    return renderNormalContent(data);
  };

  const renderNormalContent = (reconData: PersonData | null) => {
    if (!reconData) {
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
          <div className="text-[32px] opacity-15">👤</div>
          <div className="text-[12px] font-mono text-[#c8d6f0]">
            Select a target from the left panel to view reconnaissance data
          </div>
        </div>
      );
    }

    switch (activeSubTab) {
      case 'identity':  return <PersonIdentity data={reconData} />;
      case 'contact':   return <ContactInfo    data={reconData} />;
      case 'social':    return <SocialMedia    data={reconData} />;
      case 'technical': return <TechnicalFootprint data={reconData} />;
      case 'leaks':     return <LeakExposure   data={reconData} />;
      case 'noise':     return <NoiseResults   data={reconData} />;
      case 'log':       return <Log            data={reconData} />;
      default:          return null;
    }
  };

  const getTabIcon = (id: string) => {
    switch (id) {
      case 'identity':  return <User        className="w-3.5 h-3.5" />;
      case 'contact':   return <Mail        className="w-3.5 h-3.5" />;
      case 'social':    return <Share2      className="w-3.5 h-3.5" />;
      case 'technical': return <Cpu        className="w-3.5 h-3.5" />;
      case 'leaks':     return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'noise':     return <Filter     className="w-3.5 h-3.5" />;
      case 'log':       return <FileText   className="w-3.5 h-3.5" />;
      default:          return <Activity   className="w-3.5 h-3.5" />;
    }
  };

  const activeSession = sessions.find((s) => s.name === activePerson);

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0f1319]">
      {/* ── Left sidebar ── */}
      <div className="w-[293px] bg-[#0f1319] border-r border-[#1c2333] flex flex-col shrink-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 h-[40px] border-b border-[#1c2333] shrink-0">
          <span className="text-[15px] font-bold tracking-[0.12em] text-[#c8d6f0] font-mono">
            Targets
          </span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[#c8d6f0] hover:text-[#0af] hover:bg-[#0af15] transition-all p-1 rounded"
            title="Add target"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
                if (e.key === 'Escape') { setShowAddForm(false); setNewPerson(''); }
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
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((sess) => {
            const statusMeta = STATUS_META[sess.status];
            const qMeta      = QUERY_TYPE_META[sess.queryType];
            const isActive   = sess.name === activePerson;
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
                  {/* Query type tag + status */}
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className="text-[9px] font-mono font-bold px-1 py-0.5 rounded tracking-widest"
                      style={{ color: qMeta.color, backgroundColor: `${qMeta.color}18` }}
                    >
                      {qMeta.label}
                    </span>
                    <span
                      className="text-[9px] font-mono"
                      style={{ color: statusMeta.color }}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                  {/* Name */}
                  <span
                    className="text-[12px] font-mono font-bold block truncate"
                    style={{ color: isActive ? '#c8d6f0' : '#6a7a9a' }}
                  >
                    {sess.name}
                  </span>
                  {/* Risk score if available */}
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
              onClick={() => { const s = sessions.find((s) => s.id === contextMenu.sessionId); if (s) runScan(s.name); setContextMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-[#0af] hover:bg-[#1c2333] transition-colors"
            >
              ▶ Run (Full Scan)
            </button>
            <button
              onClick={() => { handleOpenHistory(); setContextMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-[#30d158] hover:bg-[#1c2333] transition-colors"
            >
              📜 Open History
            </button>
            <button
              onClick={() => { handleRunSelectedClick(); setContextMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-[#ff9f0a] hover:bg-[#1c2333] transition-colors"
            >
              ✓ Run Selected
            </button>
            <div className="border-t border-[#1c2333] my-1" />
            <button
              onClick={() => { removePerson(contextMenu.sessionId); setContextMenu(null); }}
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
          {/* Top bar */}
          <div className="flex items-center justify-between px-3 h-10 bg-[#0f1319] border-b border-[#1c2333] shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-mono font-bold text-[#c8d6f0]">
                {activeTab.label}
              </span>
              {/* Active session confidence badge */}
              {activeSession && data?.confidence !== undefined && (
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{
                    color: data.confidence >= 0.8 ? '#30d158' : data.confidence >= 0.55 ? '#f5a623' : '#ff2d55',
                    backgroundColor: data.confidence >= 0.8 ? '#30d15815' : data.confidence >= 0.55 ? '#f5a62315' : '#ff2d5515',
                  }}
                >
                  {Math.round(data.confidence * 100)}% conf
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search within results..."
                className="h-7 w-[21rem] bg-[#0d1017] border border-[#1c2333] rounded text-[#0af] text-[12px] px-2 outline-none font-mono placeholder:text-[#c8d6f0]"
              />
              <div className="relative tabs-dropdown-container">
                <button
                  onClick={() => setShowTabsDropdown(!showTabsDropdown)}
                  className="h-6 w-6 flex items-center justify-center bg-[#1c2333] border border-[#2a3548] text-[#c8d6f0] rounded hover:text-[#c8d6f0] hover:border-[#0af30] transition-colors"
                  title="Switch tab"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="6"  r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="18" r="2" />
                  </svg>
                </button>
                {showTabsDropdown && (
                  <div className="absolute right-0 top-8 z-50 w-52 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1">
                    {SUB_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => { setActiveSubTab(tab.id); setShowTabsDropdown(false); }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-mono transition-colors',
                          activeSubTab === tab.id ? 'bg-[#0af15] text-[#0af]' : 'text-[#c8d6f0] hover:bg-[#1c2333]',
                        )}
                      >
                        <span style={{ color: tab.accent }}>{getTabIcon(tab.id)}</span>
                        <span>{tab.label}</span>
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