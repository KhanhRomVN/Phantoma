import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '../../../../../../shared/lib/utils';
import { RepoInfo } from './components/RepoInfo';
import { DeveloperInfo } from './components/DeveloperInfo';
import { DependencyAnalysis } from './components/DependencyAnalysis';
import { SecretExposure } from './components/SecretExposure';
import { InfrastructureInfo } from './components/InfrastructureInfo';
import { AppIntelligence } from './components/AppIntelligence';
import { SourceCodeOverview as Overview } from './components/Overview';
import { SourceCodeLog as Log } from './components/Log';
import { Search } from './components/Search';
import { History } from './components/History';
import type { SourceCodeData } from './types/sourcecode-data';
import sourceCodeData from './data/phantoma-repo.json';
import { GitBranch, Users, Package, Key, Server, Brain, Activity, FileText } from 'lucide-react';

interface RepoSession {
  id: string;
  name: string;
  owner: string;
  status: 'idle' | 'queued' | 'scanning' | 'done' | 'error';
  progress: number;
  riskScore?: number;
}

type RepoStatus = RepoSession['status'];

const STATUS_META: Record<RepoStatus, { label: string; color: string; pulse?: boolean }> = {
  idle: { label: 'IDLE', color: '#3a4558' },
  queued: { label: 'QUEUED', color: '#f5a623', pulse: true },
  scanning: { label: 'SCANNING', color: '#0af', pulse: true },
  done: { label: 'DONE', color: '#30d158' },
  error: { label: 'ERROR', color: '#ff2d55' },
};

const DEFAULT_SESSIONS: RepoSession[] = [
  {
    id: 'sess-1',
    name: 'recon-core',
    owner: 'phantoma',
    status: 'done',
    progress: 100,
    riskScore: 68,
  },
];

async function fetchSourceCodeData(repoName: string): Promise<SourceCodeData | null> {
  console.log(`[SourceCodeRecon] Fetching data for: ${repoName}`);
  const sampleData = sourceCodeData as unknown as SourceCodeData;
  if (sampleData.target?.includes(repoName)) {
    return sampleData;
  }
  return null;
}

const SUB_TABS = [
  { id: 'overview', label: 'Overview', accent: '#0af' },
  { id: 'repo-info', label: 'Repository Info', accent: '#af52de' },
  { id: 'developers', label: 'Developers', accent: '#30d158' },
  { id: 'dependencies', label: 'Dependencies', accent: '#0a84ff' },
  { id: 'secrets', label: 'Secret Exposure', accent: '#ff375f' },
  { id: 'infrastructure', label: 'Infrastructure', accent: '#64d2ff' },
  { id: 'app-intel', label: 'App Intelligence', accent: '#32d74b' },
  { id: 'log', label: 'Log', accent: '#5e5ce6' },
] as const;

type SubTabId = (typeof SUB_TABS)[number]['id'];

interface SourceCodeReconProps {
  initialRepo?: string;
}

export default function SourceCodeRecon({ initialRepo = 'recon-core' }: SourceCodeReconProps) {
  const [sessions, setSessions] = useState<RepoSession[]>(DEFAULT_SESSIONS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRepo, setNewRepo] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    sessionId: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [activeRepo, setActiveRepo] = useState<string>(initialRepo);
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('overview');

  const [showTabsDropdown, setShowTabsDropdown] = useState(false);
  const [showRunSelectedDropdown, setShowRunSelectedDropdown] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [historyViewData, setHistoryViewData] = useState<SourceCodeData | null>(null);
  const [data, setData] = useState<SourceCodeData | null>(null);

  const activeTab = SUB_TABS.find((t) => t.id === activeSubTab)!;

  const fetchData = async (repo: string) => {
    const result = await fetchSourceCodeData(repo);
    setData(result);
  };

  useEffect(() => {
    if (activeRepo) {
      fetchData(activeRepo);
    }
  }, [activeRepo]);

  const addRepo = useCallback(() => {
    const repo = newRepo.trim();
    const owner = newOwner.trim();
    if (!repo || !owner) return;
    if (sessions.some((s) => s.name === repo && s.owner === owner)) return;
    const sess: RepoSession = {
      id: `sess-${Date.now()}`,
      name: repo,
      owner: owner,
      status: 'queued',
      progress: 0,
    };
    setSessions((prev) => [...prev, sess]);
    setNewRepo('');
    setNewOwner('');
    setShowAddForm(false);
  }, [newRepo, newOwner, sessions]);

  const removeRepo = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const runScan = useCallback((repo: string) => {
    console.log('Running full scan for repository:', repo);
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

  const handleSelectHistory = (historyData: SourceCodeData) => {
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
    if (isSearchMode && searchQuery.trim())
      return (
        <Search data={data} searchQuery={searchQuery} onResultClick={handleSearchResultClick} />
      );
    if (isHistoryMode)
      return <History onSelectHistory={handleSelectHistory} onBack={handleBackFromHistory} />;
    if (historyViewData) return renderNormalContent(historyViewData);
    return renderNormalContent(data);
  };

  const renderNormalContent = (reconData: SourceCodeData | null) => {
    if (!reconData) {
      return (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
          <div className="text-[32px] opacity-15">📦</div>
          <div className="text-[12px] font-mono text-[#c8d6f0]">
            Select a repository from the left panel to view source code analysis
          </div>
        </div>
      );
    }

    switch (activeSubTab) {
      case 'overview':
        return <Overview data={reconData} />;
      case 'repo-info':
        return <RepoInfo data={reconData} />;
      case 'developers':
        return <DeveloperInfo data={reconData} />;
      case 'dependencies':
        return <DependencyAnalysis data={reconData} />;
      case 'secrets':
        return <SecretExposure data={reconData} />;
      case 'infrastructure':
        return <InfrastructureInfo data={reconData} />;
      case 'app-intel':
        return <AppIntelligence data={reconData} />;
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
          <span className="text-[15px] font-bold tracking-[0.12em] text-[#c8d6f0] font-mono">
            Repositories
          </span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[#c8d6f0] hover:text-[#0af] hover:bg-[#0af15] transition-all p-1 rounded"
            title="Add repository"
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
            <div className="flex gap-1 mb-1">
              <input
                autoFocus
                type="text"
                value={newRepo}
                onChange={(e) => setNewRepo(e.target.value)}
                placeholder="repo-name"
                spellCheck={false}
                className="flex-1 h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[12px] font-mono text-[#0af] outline-none placeholder:text-[#c8d6f0]"
                style={{ caretColor: '#0af' }}
              />
              <input
                type="text"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                placeholder="owner"
                spellCheck={false}
                className="flex-1 h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[12px] font-mono text-[#0af] outline-none placeholder:text-[#c8d6f0]"
                style={{ caretColor: '#0af' }}
              />
              <button
                onClick={addRepo}
                className="h-7 w-7 rounded text-[12px] font-bold font-mono transition-colors"
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
            const isActive = sess.name === activeRepo;
            return (
              <div
                key={sess.id}
                onClick={() => setActiveRepo(sess.name)}
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
                    className="text-[14px] font-mono font-bold flex-1 truncate"
                    style={{ color: isActive ? '#c8d6f0' : '#6a7a9a' }}
                  >
                    {sess.owner}/{sess.name}
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
              className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-[#0af] hover:bg-[#1c2333] transition-colors"
            >
              ▶ Run (Full Scan)
            </button>
            <button
              onClick={() => {
                handleOpenHistory();
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
                removeRepo(contextMenu.sessionId);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-[#ff2d55] hover:bg-[#1c2333] transition-colors"
            >
              ✕ Delete
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-3 h-10 bg-[#0f1319] border-b border-[#1c2333] shrink-0">
            <span className="text-[13px] font-mono font-bold text-[#c8d6f0]">
              {activeTab.label}
            </span>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search..."
                className="h-7 w-[21rem] bg-[#0d1017] border border-[#1c2333] rounded text-[#0af] text-[12px] px-2 outline-none font-mono placeholder:text-[#c8d6f0]"
              />
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
                  <div className="absolute right-0 top-8 z-50 w-48 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1">
                    {SUB_TABS.map((tab) => {
                      const getIcon = () => {
                        switch (tab.id) {
                          case 'overview':
                            return <Activity className="w-3.5 h-3.5" />;
                          case 'repo-info':
                            return <GitBranch className="w-3.5 h-3.5" />;
                          case 'developers':
                            return <Users className="w-3.5 h-3.5" />;
                          case 'dependencies':
                            return <Package className="w-3.5 h-3.5" />;
                          case 'secrets':
                            return <Key className="w-3.5 h-3.5" />;
                          case 'infrastructure':
                            return <Server className="w-3.5 h-3.5" />;
                          case 'app-intel':
                            return <Brain className="w-3.5 h-3.5" />;
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
                            'w-full flex items-center justify-between px-3 py-1.5 text-[12px] font-mono transition-colors',
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
