/**
 * ------------------------------------------------------------------
 * TargetListPanel
 * ------------------------------------------------------------------
 * Sidebar panel hiển thị danh sách targets trong module Emulate.
 * Hỗ trợ search/filter platform, collapse, start/stop target với
 * các chế độ MITM/CDP/Frida.
 *
 * Các functions chính:
 * - getTargetPlatform() : Xác định platform của target
 * - getTargetFavicon()  : Lấy favicon cho target
 *
 * Các chức năng chính:
 * - Hiển thị danh sách targets (RUNNING/IDLE groups)
 * - Search và filter theo platform
 * - Modal chọn platform khi thêm target
 * - Modal chọn launch mode khi start target
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React, { useState, useCallback, useMemo, useEffect } from 'react';

// ── UI ──
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Search,
  Smartphone,
  RefreshCw,
  X,
} from 'lucide-react';

import TargetCard from './TargetCard';
import MobileDeviceCard from './MobileDeviceCard';
import { useMobileConnectionStore } from '../../stores/mobile-connection.store';
import { LaunchTargetModal } from './LaunchTargetModal/LaunchTargetModal';
import { toLaunchPlatform } from '../../constants/launch-platforms';

// ── Constants ──
import { AppPlatform, PLATFORMS } from '../../constants/platforms';

// ── Services ──
import { runtimeApi } from '../../services/runtime-api.service';
import { logcatService } from '../../services/logcat.service';

// ── Types ──
import type { TargetTab } from '../../types/target.types';

// ── Utils ──

import { cn } from '@renderer/utils/cn';
import { getFaviconUrl } from '@renderer/utils/favicon';

// ─── Constants ──────────────────────────────────────────────────────────

// ─── Functions ──────────────────────────────────────────────────────────
const PLATFORM_BADGE_TONE: Record<AppPlatform, { active: string; icon: string }> = {
  web: { active: 'bg-sky-500/15 text-sky-400', icon: 'text-sky-400' },
  pc: { active: 'bg-violet-500/15 text-violet-400', icon: 'text-violet-400' },
  android: { active: 'bg-emerald-500/15 text-emerald-400', icon: 'text-emerald-400' },
  cli: { active: 'bg-amber-500/15 text-amber-400', icon: 'text-amber-400' },
};

export function getTargetPlatform(tab: TargetTab): AppPlatform {
  if (tab.platform) {
    const p = tab.platform.toLowerCase();
    if (p in PLATFORMS) return p as AppPlatform;
  }
  if (tab.url) {
    try {
      const url = new URL(tab.url);
      if (url.protocol === 'http:' || url.protocol === 'https:') return 'web';
    } catch {
      // Invalid URL
    }
  }
  return 'web';
}

export function getTargetFavicon(tab: TargetTab): string | null {
  if (tab.favicon) return tab.favicon;
  if (tab.url) return getFaviconUrl(tab.url, 32);
  return null;
}

// Re-export for external consumers
export type { AppPlatform } from '../../constants/platforms';

interface TargetListPanelProps {
  targetTabs: TargetTab[];
  activeTargetId: string | null;
  targetStates: Record<string, { isActive: boolean; mode?: 'mitm' | 'cdp' | 'frida' }>;
  accentColor: string;
  onSelectTarget: (id: string) => void;
  onRemoveTarget: (id: string) => void;
  onStartTarget: (targetId: string, mode: 'mitm' | 'cdp' | 'frida') => void;
  onStopTarget: () => void;
  onLaunchTarget: (
    appId: string,
    proxyUrl: string,
    customUrl?: string,
    mode?: 'browser' | 'electron' | 'native' | 'cdp' | 'frida',
    useEnvInject?: boolean,
    deviceSerial?: string,
    useSandbox?: boolean,
    userDataDir?: string,
  ) => Promise<void>;
  onStartEbpf: (
    targetId: string,
    executablePath?: string,
    useSandbox?: boolean,
    sudoPassword?: string,
  ) => Promise<void>;
  onStartCdp: (targetId: string, executablePath?: string, useSandbox?: boolean) => Promise<void>;
  onStartPcap: (
    targetId: string,
    executablePath?: string,
    useSandbox?: boolean,
    sudoPassword?: string,
  ) => Promise<void>;
  onStartAppDebug: (
    targetId: string,
    executablePath?: string,
    useSandbox?: boolean,
  ) => Promise<void>;
  onOpenAddModal: (platform: AppPlatform | null) => void;
  onEditTarget?: (id: string) => void;
  onStopSession?: (e: React.MouseEvent, appId: string) => void;
  activeAppId?: string;
}

const TargetListPanel: React.FC<TargetListPanelProps> = ({
  targetTabs,
  activeTargetId,
  targetStates,
  onSelectTarget,
  onRemoveTarget,
  onStartTarget,
  onStopTarget,
  onLaunchTarget,
  onStartEbpf,
  onStartCdp,
  onStartPcap,
  onStartAppDebug,
  onOpenAddModal,
  onEditTarget,
  onStopSession,
  activeAppId,
}) => {
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<'all' | 'running' | AppPlatform>('web');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const [deviceList, setDeviceList] = useState<{ name: string; serial: string; type: string }[]>(
    [],
  );
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  const [showRunningModal, setShowRunningModal] = useState(false);
  const [selectedTargetForModal, setSelectedTargetForModal] = useState<TargetTab | null>(null);

  const effectiveCollapsed = isCollapsed && !isHovering;

  const loadDevices = useCallback(async () => {
    if (isLoadingDevices) return;
    setIsLoadingDevices(true);
    try {
      const detected = await logcatService.detectEmulators();
      setDeviceList(detected);
    } catch (e) {
      console.error('[TargetListPanel] Failed to load devices:', e);
    } finally {
      setIsLoadingDevices(false);
    }
  }, [isLoadingDevices]);

  const allTargets = useMemo(() => targetTabs.filter((tab) => tab.id !== 'default'), [targetTabs]);

  useEffect(() => {
    void loadDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await loadDevices();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, loadDevices]);

  const platformCounts = useMemo(() => {
    const counts: Record<AppPlatform, number> = { web: 0, pc: 0, android: 0, cli: 0 };
    allTargets.forEach((tab) => {
      counts[getTargetPlatform(tab)] += 1;
    });
    counts.android = deviceList.length;
    return counts;
  }, [allTargets, deviceList]);

  const connectedSerial = useMobileConnectionStore((s) => s.serial);
  const connectedDevices = useMemo(
    () => deviceList.filter((d) => d.serial === connectedSerial),
    [deviceList, connectedSerial],
  );

  const runningCount = useMemo(
    () =>
      allTargets.filter((tab) => targetStates[tab.id]?.isActive).length + connectedDevices.length,
    [allTargets, targetStates, connectedDevices],
  );

  useEffect(() => {
    if (runningCount === 0 && filterPlatform === 'running') setFilterPlatform('web');
  }, [runningCount, filterPlatform]);

  const searchedTargets = useMemo(() => {
    return allTargets.filter((tab) => {
      const matchSearch = (tab.title || '').toLowerCase().includes(targetSearchQuery.toLowerCase());
      const matchFilter =
        filterPlatform === 'all' ||
        (filterPlatform === 'running'
          ? !!targetStates[tab.id]?.isActive
          : getTargetPlatform(tab) === filterPlatform);
      return matchSearch && matchFilter;
    });
  }, [allTargets, targetSearchQuery, filterPlatform, targetStates]);

  const visibleTargets = effectiveCollapsed ? allTargets : searchedTargets;
  const visibleRunningTargets = visibleTargets.filter((tab) => targetStates[tab.id]?.isActive);
  const visibleIdleTargets = visibleTargets.filter((tab) => !targetStates[tab.id]?.isActive);
  const showIdle = filterPlatform !== 'running';
  const runningDevices = filterPlatform === 'running' ? connectedDevices : [];
  const totalRunning = visibleRunningTargets.length + runningDevices.length;
  const runningPlatformGroups = (Object.keys(PLATFORMS) as AppPlatform[])
    .map((pid) => ({
      pid,
      tabs: visibleRunningTargets.filter((tab) => getTargetPlatform(tab) === pid),
      devices: pid === 'android' ? runningDevices : [],
    }))
    .filter((group) => group.tabs.length + group.devices.length > 0);
  const splitByLabel =
    filterPlatform === 'running' && !effectiveCollapsed && runningPlatformGroups.length > 1;

  const renderDevice = (device: { name: string; serial: string }) => (
    <MobileDeviceCard key={device.serial} device={device} collapsed={effectiveCollapsed} />
  );

  const renderCard = (tab: TargetTab) => (
    <TargetCard
      key={tab.id}
      tab={tab}
      platform={getTargetPlatform(tab)}
      faviconSrc={getTargetFavicon(tab)}
      activeTargetId={activeTargetId}
      targetStates={targetStates}
      activeAppId={activeAppId}
      openMenuId={openMenuId}
      onOpenMenuChange={setOpenMenuId}
      onSelectTarget={onSelectTarget}
      onRemoveTarget={onRemoveTarget}
      onStopTarget={onStopTarget}
      onEditTarget={onEditTarget}
      onStopSession={onStopSession}
      deviceList={deviceList}
      onOpenRunningModal={openRunningModal}
      collapsed={effectiveCollapsed}
    />
  );

  // ── Running modal handlers ──
  const handleStartCDP = useCallback(
    (targetId: string, targetUrl?: string, userDataDir?: string) => {
      onSelectTarget(targetId);
      onStartTarget(targetId, 'cdp');
      if (onLaunchTarget) {
        return onLaunchTarget(
          targetId,
          'http://127.0.0.1:8081',
          targetUrl,
          'cdp',
          undefined,
          undefined,
          undefined,
          userDataDir,
        ).then(async () => {
          const ports = [9222];
          for (const port of ports) {
            try {
              // Pass both expectedUrl (tab matching hint) and targetId (session key)
              const result = await runtimeApi.connectCdp(port, targetUrl, targetId);
              if (result?.success) {
                await runtimeApi.reloadCdp(targetId);
                break;
              }
            } catch {
              // Continue trying next port
            }
          }
        });
      }
      return Promise.resolve();
    },
    [onSelectTarget, onStartTarget, onLaunchTarget],
  );

  const handleStartMITM = useCallback(
    (
      targetId: string,
      targetUrl?: string,
      useEnvInject?: boolean,
      deviceSerial?: string,
      useSandbox?: boolean,
    ) => {
      onSelectTarget(targetId);
      onStartTarget(targetId, 'mitm');
      runtimeApi
        .createProxySession('default')
        .then(async () => {
          if (onLaunchTarget) {
            await onLaunchTarget(
              targetId,
              'http://127.0.0.1:8081',
              targetUrl,
              'browser',
              useEnvInject,
              deviceSerial,
              useSandbox,
            );
          }
        })
        .catch(() => {
          onStopTarget();
        });
    },
    [onSelectTarget, onStartTarget, onLaunchTarget, onStopTarget],
  );

  const handleStartFrida = useCallback(
    (targetId: string, targetUrl?: string, useSandbox?: boolean) => {
      onSelectTarget(targetId);
      onStartTarget(targetId, 'frida');
      runtimeApi
        .createProxySession('default')
        .then(async () => {
          if (onLaunchTarget) {
            await onLaunchTarget(
              targetId,
              'http://127.0.0.1:8081',
              targetUrl,
              'frida',
              undefined,
              undefined,
              useSandbox,
            );
          }
        })
        .catch((err: unknown) => {
          console.error('[TargetListPanel] Failed to create proxy session:', err);
          onStopTarget();
        });
    },
    [onSelectTarget, onStartTarget, onLaunchTarget, onStopTarget],
  );

  const openRunningModal = useCallback((tab: TargetTab) => {
    setSelectedTargetForModal(tab);
    setShowRunningModal(true);
  }, []);

  return (
    <>
      <div
        className={cn(
          'shrink-0 border-r border-border flex flex-col bg-background relative transition-all',
          effectiveCollapsed ? 'w-fit' : 'w-96',
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Header */}
        <div className="flex items-center px-3 h-10 border-b border-border shrink-0">
          {!effectiveCollapsed && (
            <>
              <span className="text-sm font-medium text-text-secondary">TARGETS</span>
              <span className="ml-2 text-text-secondary text-xs">
                [{allTargets.length}]
              </span>
            </>
          )}
          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            title={isCollapsed ? 'Expand' : 'Collapse'}
            className={cn(
              'shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors',
              effectiveCollapsed ? 'mx-auto' : 'ml-auto',
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {!effectiveCollapsed && (
          <>
            {/* Search + Add */}
            <div className="fade-in pl-3 pr-4 py-2 flex items-center gap-2">
              <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md bg-input-background px-2.5">
                <Search className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search targets..."
                  value={targetSearchQuery}
                  onChange={(e) => setTargetSearchQuery(e.target.value)}
                  className="h-full w-full min-w-0 border-none bg-transparent text-xs text-text-primary ring-0 placeholder:text-text-secondary outline-none focus:outline-none focus-visible:outline-none"
                />
                {targetSearchQuery && (
                  <button
                    onClick={() => setTargetSearchQuery('')}
                    className="shrink-0 text-text-secondary transition-colors hover:text-text-primary outline-none focus:outline-none focus-visible:outline-none"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                title="Refresh"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-input-background text-text-secondary outline-none focus:outline-none focus-visible:ring-0 hover:text-text-primary hover:bg-text-secondary/20 transition-colors disabled:opacity-60"
              >
                <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
              </button>
              <button
                title="Add target"
                onClick={() => onOpenAddModal(null)}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-input-background text-text-secondary outline-none focus:outline-none focus-visible:ring-0 hover:text-text-primary hover:bg-text-secondary/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Filter badges */}
            <div className="fade-in px-3 pt-1 pb-2 flex flex-wrap items-center gap-2 border-b border-border shrink-0">
              {runningCount > 0 && (
                <button
                  onClick={() => setFilterPlatform('running')}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                    filterPlatform === 'running'
                      ? 'bg-success/15 text-success outline outline-1 outline-dashed outline-current'
                      : 'bg-dropdown-item-hover text-text-secondary hover:text-text-primary',
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                  Running
                  <span className="ml-0.5 text-[10px]">
                    [{runningCount}]
                  </span>
                </button>
              )}
              {(Object.keys(PLATFORMS) as AppPlatform[]).map((pid) => {
                const label = PLATFORMS[pid].label;
                const Icon = PLATFORMS[pid].icon;
                const tone = PLATFORM_BADGE_TONE[pid];
                const isActive = filterPlatform === pid;
                return (
                  <button
                    key={pid}
                    onClick={() => setFilterPlatform(pid)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                      isActive
                        ? `${tone.active} outline outline-1 outline-dashed outline-current`
                        : 'bg-dropdown-item-hover text-text-secondary hover:text-text-primary',
                    )}
                  >
                    <Icon className={cn('w-3 h-3 shrink-0', tone.icon)} />
                    {label}
                    <span className="ml-0.5 text-[10px]">
                      [{platformCounts[pid]}]
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Running / Idle labels moved into target list groups */}
          </>
        )}

        {/* Target list */}
        <div className={cn('flex-1 overflow-y-auto', effectiveCollapsed ? 'p-1' : 'px-3 py-1.5')}>
          {filterPlatform === 'android' ? (
            deviceList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-3 text-center gap-3 opacity-70">
                <div className="w-12 h-12 rounded-xl bg-card-hover border border-border grid place-items-center text-text-secondary">
                  <Smartphone className="w-6 h-6" />
                </div>
                {!effectiveCollapsed && (
                  <div>
                    <p className="text-sm font-medium text-text-primary mb-1">No device found</p>
                    <p className="text-xs text-text-secondary max-w-[220px] mx-auto leading-relaxed">
                      Start a Genymotion VM to see it here.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-0.5">{deviceList.map(renderDevice)}</div>
            )
          ) : visibleTargets.length === 0 && runningDevices.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-3 text-center gap-3 opacity-70">
              <div className="w-12 h-12 rounded-xl bg-card-hover border border-border grid place-items-center text-text-secondary">
                {targetSearchQuery || filterPlatform !== 'all' ? (
                  <Search className="w-6 h-6" />
                ) : (
                  <Crosshair className="w-6 h-6" />
                )}
              </div>
              {!effectiveCollapsed && (
                <div>
                  <p className="text-sm font-medium text-text-primary mb-1">
                    {targetSearchQuery || filterPlatform !== 'all'
                      ? 'No matching targets'
                      : 'No targets found'}
                  </p>
                  <p className="text-xs text-text-secondary max-w-[220px] mx-auto leading-relaxed">
                    {targetSearchQuery || filterPlatform !== 'all'
                      ? 'Try a different keyword or platform filter.'
                      : 'Add a target with the + button to start inspecting.'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {totalRunning > 0 && (
                <div>
                  {!effectiveCollapsed && (
                    <div className="py-1.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-success/15 text-success text-xs font-medium flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-success" />
                        Running
                      </span>
                    </div>
                  )}
                  {splitByLabel ? (
                    runningPlatformGroups.map((group) => {
                      const GroupIcon = PLATFORMS[group.pid].icon;
                      return (
                        <div key={group.pid}>
                          <div className="pt-1 pb-0.5 flex items-center gap-1 text-xs text-text-secondary">
                            <GroupIcon
                              className={cn('w-3 h-3 shrink-0', PLATFORM_BADGE_TONE[group.pid].icon)}
                            />
                            <span className="font-medium">{PLATFORMS[group.pid].label}</span>
                            <span>{group.tabs.length + group.devices.length}</span>
                          </div>
                          <div className="space-y-0.5">
                            {group.tabs.map(renderCard)}
                            {group.devices.map(renderDevice)}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="space-y-0.5">
                      {visibleRunningTargets.map(renderCard)}
                      {runningDevices.map(renderDevice)}
                    </div>
                  )}
                </div>
              )}
              {showIdle && visibleIdleTargets.length > 0 && (
                <div>
                  {!effectiveCollapsed && (
                    <div className="py-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-text-secondary/10 text-text-secondary text-xs font-medium flex items-center gap-1 w-fit">
                        <span className="w-2 h-2 rounded-full bg-text-secondary/40" />
                        Idle
                      </span>
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {visibleIdleTargets.map((tab) => (
                      <TargetCard
                        key={tab.id}
                        tab={tab}
                        platform={getTargetPlatform(tab)}
                        faviconSrc={getTargetFavicon(tab)}
                        activeTargetId={activeTargetId}
                        targetStates={targetStates}
                        activeAppId={activeAppId}
                        openMenuId={openMenuId}
                        onOpenMenuChange={setOpenMenuId}
                        onSelectTarget={onSelectTarget}
                        onRemoveTarget={onRemoveTarget}
                        onStopTarget={onStopTarget}
                        onEditTarget={onEditTarget}
                        onStopSession={onStopSession}
                        deviceList={deviceList}
                        onOpenRunningModal={openRunningModal}
                        collapsed={effectiveCollapsed}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <LaunchTargetModal
        isOpen={showRunningModal}
        onClose={() => {
          setShowRunningModal(false);
          setSelectedTargetForModal(null);
        }}
        target={selectedTargetForModal}
        platform={
          selectedTargetForModal
            ? toLaunchPlatform(getTargetPlatform(selectedTargetForModal))
            : null
        }
        isRunning={
          selectedTargetForModal
            ? targetStates[selectedTargetForModal.id]?.isActive || false
            : false
        }
        deviceList={deviceList}
        onStartCDP={handleStartCDP}
        onStartMITM={handleStartMITM}
        onStartFrida={handleStartFrida}
        onStartEbpf={onStartEbpf}
        onStartCdp={onStartCdp}
        onStartPcap={onStartPcap}
        onStartAppDebug={onStartAppDebug}
        onStopTarget={onStopTarget}
        onRefreshDevices={loadDevices}
      />
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default React.memo(TargetListPanel);
