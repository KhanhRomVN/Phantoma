import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Search,
  Plus,
  Globe,
  Monitor,
  Smartphone,
  Terminal,
  Code,
  ChevronRight,
  Play,
  Square,
} from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { UserApp, AppPlatform } from '../../types/apps';
import { TargetTab } from '../../types/target.types';
import { CircleStopIcon } from '../common/Icons';

interface TargetSidebarProps {
  targetTabs: TargetTab[];
  activeTargetId: string | null;
  timerDisplay: Record<string, string>;
  targetStates: Record<string, { isActive: boolean }>;
  apps: UserApp[];
  activeAppId?: string;
  accentColor: string;
  onSelectTarget: (id: string) => void;
  onRemoveTarget: (id: string) => void;
  onStartTarget: (mode: 'mitm' | 'cdp') => void;
  onStopTarget: () => void;
  onLaunchTarget: (
    appId: string,
    proxyUrl: string,
    customUrl?: string,
    mode?: 'browser' | 'electron' | 'native' | 'cdp',
  ) => Promise<void>;
  onAddApp: (appData: any) => Promise<void>;
  onStopSession: (e: React.MouseEvent, appId: string) => void;
  onOpenAddModal: () => void;
}

export function TargetSidebar({
  targetTabs,
  activeTargetId,
  timerDisplay,
  targetStates,
  apps,
  activeAppId,
  accentColor,
  onSelectTarget,
  onRemoveTarget,
  onStartTarget,
  onStopTarget,
  onLaunchTarget,
  onStopSession,
  onOpenAddModal,
}: TargetSidebarProps) {
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<AppPlatform | null>(null);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; app: UserApp } | null>(
    null,
  );
  const [targetContextMenu, setTargetContextMenu] = useState<{
    x: number;
    y: number;
    tab: TargetTab;
  } | null>(null);
  const [subMenuHover, setSubMenuHover] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTargets = targetTabs.filter((tab) => tab.id !== 'default');

  // Close context menus on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
      setTargetContextMenu(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const getPlatformIcon = (platform: AppPlatform) => {
    switch (platform) {
      case 'web':
        return <Globe className="w-3 h-3" />;
      case 'pc':
        return <Monitor className="w-3 h-3" />;
      case 'android':
        return <Smartphone className="w-3 h-3" />;
      case 'cli':
        return <Terminal className="w-3 h-3" />;
      default:
        return <Code className="w-3 h-3" />;
    }
  };

  const getPlatformColor = (platform: AppPlatform) => {
    switch (platform) {
      case 'web':
        return 'text-sky-400';
      case 'pc':
        return 'text-violet-400';
      case 'android':
        return 'text-emerald-400';
      case 'cli':
        return 'text-amber-400';
      default:
        return 'text-text-secondary';
    }
  };

  return (
    <div className="w-80 shrink-0 border-r border-border flex flex-col bg-background relative">
      <div className="flex items-center justify-between px-3 h-10 border-b border-border shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-text-secondary">Targets</span>
          {selectedPlatform !== null && (
            <>
              <ChevronRight className="w-3 h-3 text-text-secondary" />
              <span className="text-xs font-medium text-text-primary">
                {selectedPlatform === 'web'
                  ? 'Website'
                  : selectedPlatform === 'pc'
                    ? 'App'
                    : selectedPlatform === 'android'
                      ? 'Mobile'
                      : 'CLI'}
              </span>
            </>
          )}
        </div>
        {selectedPlatform !== null && (
          <button
            onClick={() => {
              setSelectedPlatform(null);
              setTargetSearchQuery('');
            }}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {selectedPlatform === null ? (
        // Default state: show search + "+ Target" button + active targets
        <>
          <div className="px-3 py-1.5 border-b border-border shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Search targets..."
                value={targetSearchQuery}
                onChange={(e) => setTargetSearchQuery(e.target.value)}
                className="w-full h-8 bg-input-background border border-border rounded pl-2 pr-2 text-xs text-text-primary placeholder:text-text-secondary outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5">
            <div className="relative mb-3" ref={dropdownRef}>
              <button
                onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
                className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover text-xs font-medium border border-dashed border-border transition-all"
              >
                <Plus className="w-3 h-3" /> Target
              </button>
              {showPlatformDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-md border border-border bg-dropdown-background shadow-lg z-10 overflow-hidden">
                  {[
                    { id: 'web', label: 'Website', icon: Globe },
                    { id: 'pc', label: 'App', icon: Monitor },
                    { id: 'android', label: 'Mobile', icon: Smartphone },
                    { id: 'cli', label: 'CLI', icon: Terminal },
                  ].map((platform) => {
                    const Icon = platform.icon;
                    return (
                      <button
                        key={platform.id}
                        onClick={() => {
                          setSelectedPlatform(platform.id as AppPlatform);
                          setShowPlatformDropdown(false);
                          setTargetSearchQuery('');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-dropdown-item-hover transition-all border-b border-border last:border-b-0"
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
                        {platform.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {activeTargets.length > 0 && (
              <div className="space-y-0.5">
                {activeTargets.map((tab) => {
                  const isRunning = targetStates[tab.id]?.isActive || false;
                  const elapsed = timerDisplay[tab.id] || '00:00';

                  return (
                    <div
                      key={tab.id}
                      onClick={() => onSelectTarget(tab.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setTargetContextMenu({ x: e.clientX, y: e.clientY, tab });
                      }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-all text-sm group relative',
                        activeTargetId === tab.id
                          ? 'bg-dropdown-item-hover text-text-primary'
                          : 'text-text-secondary hover:bg-dropdown-item-hover hover:text-text-primary',
                      )}
                    >
                      {tab.favicon ? (
                        <img
                          src={tab.favicon}
                          alt={tab.title}
                          className="w-5 h-5 shrink-0 rounded"
                        />
                      ) : (
                        <Code className="w-4 h-4 shrink-0" />
                      )}
                      <span className="flex-1 truncate font-medium">{tab.title}</span>
                      {isRunning && (
                        <span className="text-xs font-mono text-text-secondary shrink-0">
                          {elapsed}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {targetContextMenu && (
              <div
                className="fixed z-50 bg-dropdown-background border border-border rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.15)] py-1 min-w-[200px]"
                style={{ top: targetContextMenu.y, left: targetContextMenu.x }}
                onClick={(e) => e.stopPropagation()}
                onMouseLeave={() => setSubMenuHover(null)}
              >
                {!targetStates[targetContextMenu.tab.id]?.isActive && (
                  <div
                    className="relative"
                    onMouseEnter={() => setSubMenuHover('start')}
                    onMouseLeave={() => setSubMenuHover(null)}
                  >
                    <button className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-dropdown-item-hover transition-all">
                      <div className="flex items-center gap-2">
                        <Play className="w-3.5 h-3.5" />
                        <span>Start target</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
                    </button>
                    {subMenuHover === 'start' && (
                      <div
                        className="absolute left-full top-0 ml-1 z-50 bg-dropdown-background border border-border rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.15)] py-1 min-w-[140px]"
                        onMouseEnter={() => setSubMenuHover('start')}
                        onMouseLeave={() => setSubMenuHover(null)}
                      >
                        <button
                          onClick={() => {
                            onStartTarget('cdp');
                            setTargetContextMenu(null);
                            setSubMenuHover(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-dropdown-item-hover transition-all"
                        >
                          <span>CDP</span>
                        </button>
                        <button
                          onClick={() => {
                            onStartTarget('mitm');
                            setTargetContextMenu(null);
                            setSubMenuHover(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-dropdown-item-hover transition-all"
                        >
                          <span>MITM</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {targetStates[targetContextMenu.tab.id]?.isActive && (
                  <button
                    onClick={() => {
                      onStopTarget();
                      setTargetContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-dropdown-item-hover transition-all"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Stop target</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    const tab = targetContextMenu.tab;
                    onRemoveTarget(tab.id);
                    setTargetContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-dropdown-item-hover transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Xóa target</span>
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        // Platform-specific view
        <>
          <div className="px-2 py-1.5 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
              <input
                type="text"
                placeholder={`Search ${selectedPlatform === 'web' ? 'websites' : selectedPlatform === 'pc' ? 'apps' : selectedPlatform === 'android' ? 'mobile apps' : 'CLI tools'}...`}
                value={targetSearchQuery}
                onChange={(e) => setTargetSearchQuery(e.target.value)}
                className="w-full h-7 bg-input-background border border-border rounded pl-7 pr-2 text-xs text-text-primary placeholder:text-text-secondary outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 relative">
            <button
              onClick={() => {
                onOpenAddModal();
              }}
              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover text-xs font-medium border border-dashed border-border transition-all mb-3"
              style={{ borderColor: accentColor + '60' }}
            >
              <Plus className="w-3 h-3" style={{ color: accentColor }} />
              Create{' '}
              {selectedPlatform === 'web'
                ? 'Website'
                : selectedPlatform === 'pc'
                  ? 'App'
                  : selectedPlatform === 'android'
                    ? 'Mobile'
                    : 'CLI'}
            </button>

            {apps
              .filter(
                (app) =>
                  app.platform === selectedPlatform &&
                  app.name.toLowerCase().includes(targetSearchQuery.toLowerCase()),
              )
              .map((app) => {
                const isActive = app.id === activeAppId;
                const isOpen = activeTargets.some((t) => t.id === app.id);
                let faviconUrl: string | undefined = undefined;
                if (app.url) {
                  try {
                    const hostname = new URL(app.url).hostname;
                    faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
                  } catch {
                    // Invalid URL, skip favicon
                  }
                }
                return (
                  <div
                    key={app.id}
                    onClick={() => {
                      if (!isOpen) {
                        onSelectTarget(app.id);
                        setSelectedPlatform(null);
                        setTargetSearchQuery('');
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, app });
                    }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md transition-all text-sm group',
                      isOpen
                        ? 'bg-dropdown-item-hover/30 cursor-pointer hover:bg-dropdown-item-hover/50'
                        : 'hover:bg-dropdown-item-hover cursor-pointer',
                    )}
                  >
                    {faviconUrl ? (
                      <img src={faviconUrl} alt={app.name} className="w-5 h-5 shrink-0 rounded" />
                    ) : (
                      <span className={cn('shrink-0', getPlatformColor(app.platform))}>
                        {getPlatformIcon(app.platform)}
                      </span>
                    )}
                    <span className="flex-1 truncate text-text-primary font-medium">
                      {app.name}
                    </span>
                    {isActive && (
                      <button
                        onClick={(e) => onStopSession(e, app.id)}
                        className="flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded transition-all shrink-0"
                      >
                        <CircleStopIcon className="w-2 h-2 text-red-400 pointer-events-none" /> Stop
                      </button>
                    )}
                  </div>
                );
              })}
            {apps.filter(
              (app) =>
                app.platform === selectedPlatform &&
                app.name.toLowerCase().includes(targetSearchQuery.toLowerCase()),
            ).length === 0 && (
              <div className="text-center text-text-secondary text-xs py-6">
                {targetSearchQuery ? 'No matching targets' : 'No targets found for this platform'}
              </div>
            )}
          </div>

          {contextMenu && (
            <div
              className="fixed z-50 bg-dropdown-background border border-border rounded-md shadow-lg py-1 min-w-[160px]"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  const app = contextMenu.app;
                  onLaunchTarget(
                    app.id,
                    'http://127.0.0.1:8081',
                    app.url,
                    app.platform === 'web' ? 'browser' : 'electron',
                  );
                  setSelectedPlatform(null);
                  setTargetSearchQuery('');
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-dropdown-item-hover transition-all"
              >
                <Play className="w-3.5 h-3.5 text-primary" />
                <span>Chạy target</span>
              </button>
              <button
                onClick={() => {
                  onRemoveTarget(contextMenu.app.id);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-error hover:bg-dropdown-item-hover transition-all"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa target</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TargetSidebar;
