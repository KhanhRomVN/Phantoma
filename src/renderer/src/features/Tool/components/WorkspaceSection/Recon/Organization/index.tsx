import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '../../../../../../shared/lib/utils';
import { CompanyInfo } from './components/CompanyInfo';
import { DigitalAssets } from './components/DigitalAssets';
import { EmployeeIntel } from './components/EmployeeIntel';
import { ExternalExposure } from './components/ExternalExposure';
import { OrganizationOverview as Overview } from './components/Overview';
import { OrganizationLog as Log } from './components/Log';
import { Search } from './components/Search';
import { History } from './components/History';
import type { OrganizationData } from './types/organization-data';
import organizationData from './data/phantoma-org.json';
import { Building2, Globe, Users, Shield, FileText, Activity } from 'lucide-react';

interface OrgSession {
  id: string;
  name: string;
  status: 'idle' | 'queued' | 'scanning' | 'done' | 'error';
  progress: number;
  riskScore?: number;
}

type OrgStatus = OrgSession['status'];

const STATUS_META: Record<OrgStatus, { label: string; color: string; pulse?: boolean }> = {
  idle: { label: 'IDLE', color: '#3a4558' },
  queued: { label: 'QUEUED', color: '#f5a623', pulse: true },
  scanning: { label: 'SCANNING', color: '#0af', pulse: true },
  done: { label: 'DONE', color: '#30d158' },
  error: { label: 'ERROR', color: '#ff2d55' },
};

const DEFAULT_SESSIONS: OrgSession[] = [
  { id: 'sess-1', name: 'Phantoma', status: 'done', progress: 100, riskScore: 58 },
];

async function fetchOrgData(orgName: string): Promise<OrganizationData | null> {
  console.log(`[OrganizationRecon] Fetching data for: ${orgName}`);
  const sampleData = organizationData as OrganizationData;
  if (sampleData.target === orgName) {
    return sampleData;
  }
  return null;
}

const SUB_TABS = [
  { id: 'overview', label: 'Overview', accent: '#0af' },
  { id: 'company', label: 'Company Info', accent: '#af52de' },
  { id: 'digital-assets', label: 'Digital Assets', accent: '#30d158' },
  { id: 'employees', label: 'Employee Intel', accent: '#0a84ff' },
  { id: 'exposure', label: 'External Exposure', accent: '#64d2ff' },
  { id: 'log', label: 'Log', accent: '#5e5ce6' },
] as const;

type SubTabId = (typeof SUB_TABS)[number]['id'];

interface OrganizationReconProps {
  initialOrg?: string;
}

export default function OrganizationRecon({ initialOrg = 'Phantoma' }: OrganizationReconProps) {
  const [sessions, setSessions] = useState<OrgSession[]>(DEFAULT_SESSIONS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOrg, setNewOrg] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    sessionId: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [activeOrg, setActiveOrg] = useState<string>(initialOrg);
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('overview');

  const [showTabsDropdown, setShowTabsDropdown] = useState(false);
  const [showRunSelectedDropdown, setShowRunSelectedDropdown] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [historyViewData, setHistoryViewData] = useState<OrganizationData | null>(null);
  const [data, setData] = useState<OrganizationData | null>(null);

  const activeTab = SUB_TABS.find((t) => t.id === activeSubTab)!;

  const fetchData = async (org: string) => {
    const result = await fetchOrgData(org);
    setData(result);
  };

  useEffect(() => {
    if (activeOrg) {
      fetchData(activeOrg);
    }
  }, [activeOrg]);

  const addOrg = useCallback(() => {
    const org = newOrg.trim();
    if (!org) return;
    if (sessions.some((s) => s.name === org)) return;
    const sess: OrgSession = {
      id: `sess-${Date.now()}`,
      name: org,
      status: 'queued',
      progress: 0,
    };
    setSessions((prev) => [...prev, sess]);
    setNewOrg('');
    setShowAddForm(false);
  }, [newOrg, sessions]);

  const removeOrg = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const runScan = useCallback((org: string) => {
    console.log('Running full scan for organization:', org);
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
      if (!target.closest('.run-selected-dropdown-container')) setShowRunSelectedDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleRunSelectedClick = () => setShowRunSelectedDropdown(!showRunSelectedDropdown);

  const handleOpenHistory = () => {
    setIsHistoryMode(true);
    setHistoryViewData(null);
  };

  const handleSelectHistory = (historyData: OrganizationData) => {
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

  const renderNormalContent = (reconData: OrganizationData | null) => {
    if (!reconData) {
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#080b10]">
          <div className="text-[32px] opacity-15">🏢</div>
          <div className="text-[11px] font-mono text-[#2a3548]">
            Select an organization from the left panel to view reconnaissance data
          </div>
        </div>
      );
    }

    switch (activeSubTab) {
      case 'overview':
        return <Overview data={reconData} />;
      case 'company':
        return <CompanyInfo data={reconData} />;
      case 'digital-assets':
        return <DigitalAssets data={reconData} />;
      case 'employees':
        return <EmployeeIntel data={reconData} />;
      case 'exposure':
        return <ExternalExposure data={reconData} />;
      case 'log':
        return <Log data={reconData} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#080b10]">
      <div className="w-[293px] bg-[#060810] border-r border-[#1c2333] flex flex-col shrink-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 h-[40px] border-b border-[#1c2333] shrink-0">
          <span className="text-[14px] font-bold tracking-[0.12em] text-[#c8d6f0] font-mono">
            Organizations
          </span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[#2a3548] hover:text-[#0af] hover:bg-[#0af15] transition-all p-1 rounded"
            title="Add organization"
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
                value={newOrg}
                onChange={(e) => setNewOrg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addOrg();
                  if (e.key === 'Escape') {
                    setShowAddForm(false);
                    setNewOrg('');
                  }
                }}
                placeholder="Company Name"
                spellCheck={false}
                className="flex-1 h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#0af] outline-none placeholder:text-[#2a3548]"
                style={{ caretColor: '#0af' }}
              />
              <button
                onClick={addOrg}
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
            const isActive = sess.name === activeOrg;
            return (
              <div
                key={sess.id}
                onClick={() => setActiveOrg(sess.name)}
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
                    {sess.name}
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
                const session = sessions.find((s) => s.id === contextMenu.sessionId);
                if (session) runScan(session.name);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-[#0af] hover:bg-[#1c2333] transition-colors"
            >
              ▶ Run (Full Scan)
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
                removeOrg(contextMenu.sessionId);
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
          <div className="flex items-center justify-between px-3 h-10 bg-[#060810] border-b border-[#1c2333] shrink-0">
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
                          case 'company':
                            return <Building2 className="w-3.5 h-3.5" />;
                          case 'digital-assets':
                            return <Globe className="w-3.5 h-3.5" />;
                          case 'employees':
                            return <Users className="w-3.5 h-3.5" />;
                          case 'exposure':
                            return <Shield className="w-3.5 h-3.5" />;
                          case 'log':
                            return <FileText className="w-3.5 h-3.5" />;
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
