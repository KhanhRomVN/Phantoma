import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserApp, AppPlatform } from '../../../types/apps';
import {
  Plus,
  Globe,
  Monitor,
  Smartphone,
  Search,
  Square,
  Terminal,
  Trash2,
  PenSquare,
} from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import { AddTargetModal } from './AddTargetModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ConfirmLaunchModal } from './ConfirmLaunchModal';

const PLATFORM_TABS: { id: AppPlatform; icon: React.ElementType; label: string; color: string }[] =
  [
    { id: 'web', icon: Globe, label: 'Web', color: 'sky' },
    { id: 'pc', icon: Monitor, label: 'PC', color: 'violet' },
    { id: 'android', icon: Smartphone, label: 'Android', color: 'emerald' },
    { id: 'cli', icon: Terminal, label: 'CLI', color: 'amber' },
  ];

const FaviconImage: React.FC<{ app: UserApp }> = ({ app }) => {
  const [hasError, setHasError] = useState(false);
  const faviconUrl = app.url
    ? `https://www.google.com/s2/favicons?domain=${new URL(app.url).hostname}&sz=64`
    : undefined;

  if (hasError || !faviconUrl) {
    return (
      <span className="text-text-secondary text-xs">{app.name.slice(0, 2).toUpperCase()}</span>
    );
  }

  return (
    <img
      src={faviconUrl}
      alt={app.name}
      className="w-full h-full object-cover p-1"
      onError={() => setHasError(true)}
    />
  );
};

interface TargetPanelProps {
  activeAppId: string;
  activeAppName: string;
  onSelectApp: (
    appId: string,
    proxyUrl: string,
    customUrl?: string,
    mode?: 'browser' | 'electron' | 'native',
  ) => Promise<void>;
  onStopSession: () => Promise<void>;
  onTargetSelected?: (target: UserApp) => void;
  openTargetIds?: string[];
}
export const TargetPanel: React.FC<TargetPanelProps> = ({
  activeAppId,
  onSelectApp,
  onStopSession,
  onTargetSelected,
  openTargetIds = [],
}) => {
  const [activeTab, setActiveTab] = useState<AppPlatform>('web');
  const [apps, setApps] = useState<UserApp[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ appId: string; x: number; y: number } | null>(
    null,
  );
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalPlatform, setAddModalPlatform] = useState<'web' | 'pc' | 'android' | 'cli'>('web');
  const [editingApp, setEditingApp] = useState<{
    id: string;
    name: string;
    url?: string;
    executablePath?: string;
  } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState<UserApp | null>(null);
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [appToLaunch, setAppToLaunch] = useState<UserApp | null>(null);

  const fetchApps = async () => {
    try {
      console.log('[DEBUG] fetchApps: Calling apps:get-all...');
      const result = await window.api.invoke('apps:get-all');
      console.log('[DEBUG] fetchApps: Received data:', result);
      console.log('[DEBUG] fetchApps: Number of apps:', result?.length || 0);
      if (result && result.length > 0) {
        console.log('[DEBUG] fetchApps: First 3 apps sample:', result.slice(0, 3));
        const appNames = result.map((app: any) => ({
          id: app.id,
          name: app.name,
          platform: app.platform,
        }));
        console.log('[DEBUG] fetchApps: All apps:', appNames);
      }
      if (result) setApps(result);
    } catch (e) {
      console.error('[DEBUG] fetchApps: Error fetching apps:', e);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const appsByPlatform = useMemo(() => {
    const map: Record<AppPlatform, UserApp[]> = { web: [], pc: [], android: [], cli: [] };
    apps.forEach((app) => {
      if (map[app.platform]) map[app.platform].push(app);
    });
    return map;
  }, [apps]);

  const filteredApps = useMemo(
    () =>
      (appsByPlatform[activeTab] || []).filter((app) =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [appsByPlatform, activeTab, searchQuery],
  );

  const handleAddApp = async (appData: any) => {
    try {
      console.log('[AddTarget] Adding app:', appData);
      const newApp = await window.api.invoke('apps:add', appData);
      console.log('[AddTarget] App added successfully:', newApp);
      await fetchApps();
      console.log('[AddTarget] Apps refreshed, total:', apps.length);
    } catch (e) {
      console.error('[AddTarget] Failed to add app:', e);
    }
  };

  const handleEditApp = async (
    id: string,
    data: { name: string; url?: string; executablePath?: string },
  ) => {
    try {
      console.log('[EditTarget] Updating app:', id, data);
      await window.api.invoke('apps:update', id, data);
      console.log('[EditTarget] App updated successfully');
      await fetchApps();
      setEditingApp(null);
    } catch (e) {
      console.error('[EditTarget] Failed to update app:', e);
    }
  };

  const handleDeleteApp = async () => {
    if (!appToDelete) return;
    try {
      console.log('[DeleteTarget] Deleting app:', appToDelete.id);
      await window.api.invoke('apps:delete', appToDelete.id);
      console.log('[DeleteTarget] App deleted successfully');
      await fetchApps();
      setAppToDelete(null);
    } catch (e) {
      console.error('[DeleteTarget] Failed to delete app:', e);
    }
  };

  const handleLaunchApp = async (app: UserApp) => {
    if (isLaunching) return;
    setIsLaunching(true);
    try {
      onTargetSelected?.(app);
      await onSelectApp(
        app.id,
        'http://127.0.0.1:8081',
        app.url,
        app.platform === 'web' ? 'browser' : 'electron',
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsLaunching(false);
    }
  };

  const handleLaunchWithConfirm = (app: UserApp) => {
    if (activeAppId && activeAppId !== app.id) {
      setAppToLaunch(app);
      setIsLaunchModalOpen(true);
    } else {
      handleLaunchApp(app);
    }
  };

  const handleClearAndLaunch = async () => {
    if (appToLaunch) {
      await onStopSession();
      await handleLaunchApp(appToLaunch);
      setAppToLaunch(null);
    }
  };

  const handleKeepAndLaunch = async () => {
    if (appToLaunch) {
      await handleLaunchApp(appToLaunch);
      setAppToLaunch(null);
    }
  };

  const handleStop = async (e: React.MouseEvent, _appId: string) => {
    e.stopPropagation();
    if (confirm('Stop the current tracking session?')) {
      await onStopSession();
    }
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Compact Header - All in one row: Left (Title), Center (Tabs), Right (Search + Add) */}
        <div className="px-3 py-2 border-b border-[#1e2535] shrink-0 flex flex-wrap items-center justify-between gap-2">
          {/* Platform tabs - NeonUI style with white text and colored backgrounds */}
          <div className="flex items-center gap-1.5 flex-wrap justify-start flex-1">
            {PLATFORM_TABS.map(({ id, icon: Icon, label, color }) => {
              const count = appsByPlatform[id]?.length ?? 0;
              const isActive = activeTab === id;

              const activeBgClass = {
                sky: 'bg-sky-500/20',
                violet: 'bg-violet-500/20',
                emerald: 'bg-emerald-500/20',
                amber: 'bg-amber-500/20',
              }[color];

              const inactiveBgClass = {
                sky: 'bg-sky-500/5 hover:bg-sky-500/15',
                violet: 'bg-violet-500/5 hover:bg-violet-500/15',
                emerald: 'bg-emerald-500/5 hover:bg-emerald-500/15',
                amber: 'bg-amber-500/5 hover:bg-amber-500/15',
              }[color];

              const badgeActiveClass = {
                sky: 'bg-sky-400/30',
                violet: 'bg-violet-400/30',
                emerald: 'bg-emerald-400/30',
                amber: 'bg-amber-400/30',
              }[color];

              const badgeInactiveClass = {
                sky: 'bg-sky-500/10',
                violet: 'bg-violet-500/10',
                emerald: 'bg-emerald-500/10',
                amber: 'bg-amber-500/10',
              }[color];

              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 rounded-lg text-[11px] font-medium transition-all h-7',
                    isActive
                      ? `${activeBgClass} text-${color}-200`
                      : `${inactiveBgClass} text-${color}-400/70`,
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{label}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        'text-[9px] px-1 rounded-full font-medium',
                        isActive ? badgeActiveClass : badgeInactiveClass,
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Right: Search + Add button */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-72 md:w-80 h-8 bg-[#1a1f2a] border border-[#1e2535] rounded-md pl-8 pr-3 text-sm text-text-primary focus:border-purple-500/50 outline-none"
              />
            </div>
            <button
              onClick={() => {
                setAddModalPlatform(activeTab);
                setEditingApp(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center justify-center w-7 h-7 bg-[#1a1f2a] hover:bg-purple-500/20 hover:text-purple-400 text-gray-400 rounded-md border border-[#1e2535] hover:border-purple-500/30 transition-all"
              title="Add Target"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* App Cards - Grid layout with compact cards */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">
            {filteredApps.map((app) => {
              const isActive = app.id === activeAppId;
              const isOpen = openTargetIds.includes(app.id);
              const platformColor =
                PLATFORM_TABS.find((p) => p.id === app.platform)?.color || 'gray';
              return (
                <div
                  key={app.id}
                  onClick={(e) => {
                    if (isActive || isOpen) return;
                    setContextMenu({ appId: app.id, x: e.clientX, y: e.clientY });
                  }}
                  onContextMenu={(e) => {
                    if (isActive || isOpen) return;
                    e.preventDefault();
                    setContextMenu({ appId: app.id, x: e.clientX, y: e.clientY });
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border transition-all p-1.5',
                    isActive
                      ? `bg-${platformColor}-500/5 border-${platformColor}-500/30`
                      : isOpen
                        ? 'bg-[#0f1319] border-[#1e2535] opacity-50 cursor-not-allowed'
                        : 'bg-[#0f1319] border-[#1e2535] hover:border-purple-500/30 hover:scale-[1.02] cursor-pointer',
                  )}
                >
                  {/* Left icon - square favicon, compact */}
                  <div className="w-7 h-7 rounded-lg bg-[#1a1f2a] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {app.platform === 'web' ? (
                      <FaviconImage app={app} />
                    ) : (
                      <span className="text-gray-300 text-xs font-bold">
                        {app.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* Right content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-text-primary truncate">
                      {app.name}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">
                      {app.platform === 'web' && app.url
                        ? app.url
                        : app.platform === 'pc' && app.executablePath
                          ? app.executablePath
                          : app.platform === 'android' && app.packageName
                            ? app.packageName
                            : app.platform === 'cli' && app.executablePath
                              ? app.executablePath
                              : app.url || (app.platform === 'cli' ? 'CLI Command' : 'Native App')}
                    </div>
                  </div>
                  {/* Stop button if active - compact */}
                  {isActive && (
                    <button
                      onClick={(e) => handleStop(e, app.id)}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-md transition-all shrink-0"
                    >
                      <Square className="w-2 h-2 fill-current" /> Stop
                    </button>
                  )}
                </div>
              );
            })}
            {/* Add button card - compact */}
            <button
              onClick={() => {
                setAddModalPlatform(activeTab);
                setEditingApp(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-[#1e2535] bg-[#0f1319] hover:border-purple-500/30 hover:bg-[#1a1f2a] transition-all cursor-pointer p-1.5"
            >
              <div className="w-7 h-7 rounded-lg bg-[#1a1f2a] flex items-center justify-center flex-shrink-0">
                <Plus className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-xs font-medium text-gray-400">Add Target</span>
              </div>
            </button>
          </div>
          {filteredApps.length === 0 && (
            <div className="text-center text-gray-500 py-12 text-sm">No targets found</div>
          )}
        </div>

        {/* Context Menu */}
        {contextMenu &&
          (() => {
            const app = apps.find((a) => a.id === contextMenu.appId);
            if (!app) return null;
            const platformColor = PLATFORM_TABS.find((p) => p.id === app.platform)?.color || 'gray';

            return (
              <div
                ref={contextMenuRef}
                className="fixed z-50 bg-[#1a1f2a] border border-[#1e2535] rounded-lg shadow-2xl py-1 min-w-[180px]"
                style={{ left: contextMenu.x, top: contextMenu.y }}
              >
                {/* App info */}
                <div className="px-3 py-2 border-b border-[#1e2535] mb-1">
                  <div className="text-xs font-semibold text-text-primary truncate">{app.name}</div>
                  <div className="text-[10px] text-gray-400 truncate mt-0.5">
                    {app.url || (app.platform === 'cli' ? 'CLI Command' : 'Native App')}
                  </div>
                </div>

                {/* Launch options */}
                {app.platform === 'web' && (
                  <button
                    onClick={() => {
                      handleLaunchWithConfirm(app);
                      setContextMenu(null);
                    }}
                    disabled={isLaunching}
                    className="w-full px-3 py-1.5 text-xs text-left hover:bg-[#252a3a] flex items-center gap-2"
                  >
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    Launch Browser
                  </button>
                )}
                {app.platform === 'pc' && (
                  <button
                    onClick={() => {
                      handleLaunchWithConfirm(app);
                      setContextMenu(null);
                    }}
                    disabled={isLaunching}
                    className="w-full px-3 py-1.5 text-xs text-left hover:bg-[#252a3a] flex items-center gap-2"
                  >
                    <Monitor className="w-3.5 h-3.5 text-violet-400" />
                    Launch App
                  </button>
                )}
                {app.platform === 'android' && (
                  <button
                    onClick={() => {
                      handleLaunchWithConfirm(app);
                      setContextMenu(null);
                    }}
                    disabled={isLaunching}
                    className="w-full px-3 py-1.5 text-xs text-left hover:bg-[#252a3a] flex items-center gap-2"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    Connect & Inspect
                  </button>
                )}
                {app.platform === 'cli' && (
                  <button
                    onClick={() => {
                      handleLaunchWithConfirm(app);
                      setContextMenu(null);
                    }}
                    disabled={isLaunching}
                    className="w-full px-3 py-1.5 text-xs text-left hover:bg-[#252a3a] flex items-center gap-2"
                  >
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    Run in Terminal
                  </button>
                )}

                <div className="border-t border-[#1e2535] mt-1 pt-1">
                  <button
                    onClick={() => {
                      setEditingApp({
                        id: app.id,
                        name: app.name,
                        url: app.url,
                        executablePath: app.executablePath,
                      });
                      setAddModalPlatform(app.platform as any);
                      setIsAddModalOpen(true);
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-xs text-left hover:bg-[#252a3a] flex items-center gap-2"
                  >
                    <PenSquare className="w-3.5 h-3.5 text-gray-400" />
                    Edit Target
                  </button>
                  <button
                    onClick={() => {
                      setAppToDelete(app);
                      setIsDeleteModalOpen(true);
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-xs text-left hover:bg-red-500/10 text-red-400 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Target
                  </button>
                </div>
              </div>
            );
          })()}
      </div>
      {/* Modals */}
      <AddTargetModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingApp(null);
        }}
        platform={addModalPlatform}
        onAdd={handleAddApp}
        existingApps={apps}
        editApp={editingApp}
        onEdit={handleEditApp}
      />
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setAppToDelete(null);
        }}
        onConfirm={handleDeleteApp}
        appName={appToDelete?.name || ''}
      />
      <ConfirmLaunchModal
        isOpen={isLaunchModalOpen}
        onClose={() => {
          setIsLaunchModalOpen(false);
          setAppToLaunch(null);
        }}
        onClearAndLaunch={handleClearAndLaunch}
        onKeepAndLaunch={handleKeepAndLaunch}
        appName={appToLaunch?.name || ''}
      />
    </>
  );
};

export default TargetPanel;
