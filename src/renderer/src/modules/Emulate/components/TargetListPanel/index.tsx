import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { logger } from '@renderer/utils/logger';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

// ── Components ──
import { Modal, ModalHeader, ModalBody } from '@renderer/components/ui/Modal';
import TargetCard from './TargetCard';
import { RunningOptionTargetModal } from './RunningOptionTargetModal';

// ── Types ──
import type { TargetTab } from '../../types/target.types';

// ── Constants ──
import { AppPlatform, PLATFORMS } from '../../constants/platforms';

const PLATFORM_COLOR_RGB: Record<AppPlatform, string> = {
  web: '14, 165, 233',
  pc: '167, 139, 250',
  android: '52, 211, 153',
  cli: '251, 191, 36',
};

// ── Services ──
import { ipcService } from '../../../../services/ipc.service';
import { logcatService } from '../../services/logcat.service';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';
import { getFaviconUrl } from '../../../../shared/utils/faviconUtils';

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
  ) => Promise<void>;
  onOpenAddModal: (platform: AppPlatform) => void;
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
  onOpenAddModal,
  onEditTarget,
  onStopSession,
  activeAppId,
}) => {
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<'all' | AppPlatform>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);

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
      logger.error('[TargetListPanel] Failed to load devices:', e);
    } finally {
      setIsLoadingDevices(false);
    }
  }, [isLoadingDevices]);

  const allTargets = useMemo(() => targetTabs.filter((tab) => tab.id !== 'default'), [targetTabs]);

  const searchedTargets = useMemo(() => {
    return allTargets.filter((tab) => {
      const matchSearch = (tab.title || '').toLowerCase().includes(targetSearchQuery.toLowerCase());
      const matchFilter = filterPlatform === 'all' || getTargetPlatform(tab) === filterPlatform;
      return matchSearch && matchFilter;
    });
  }, [allTargets, targetSearchQuery, filterPlatform]);

  const visibleTargets = effectiveCollapsed ? allTargets : searchedTargets;
  const visibleRunningTargets = visibleTargets.filter((tab) => targetStates[tab.id]?.isActive);
  const visibleIdleTargets = visibleTargets.filter((tab) => !targetStates[tab.id]?.isActive);

  // ── Running modal handlers ──
  const handleStartCDP = useCallback(
    (targetId: string, targetUrl?: string) => {
      onSelectTarget(targetId);
      onStartTarget(targetId, 'cdp');
      if (onLaunchTarget) {
        onLaunchTarget(targetId, 'http://127.0.0.1:8081', targetUrl, 'cdp').then(async () => {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          if (!window.api || typeof window.api.invoke !== 'function') {
            logger.warn('[TargetListPanel] window.api is not available');
            return;
          }
          const portRes = await ipcService.getCdpLaunchPort();
          const launchPort = portRes.success ? portRes.data?.port : null;
          const ports = launchPort ? [launchPort] : [9222];
          for (const port of ports) {
            try {
              const result = await ipcService.connectCdp(port);
              if (result?.success) {
                await ipcService.reloadCdp();
                break;
              }
            } catch {
              // Continue trying next port
            }
          }
        });
      }
    },
    [onSelectTarget, onStartTarget, onLaunchTarget],
  );

  const handleStartMITM = useCallback(
    (
      targetId: string,
      targetUrl?: string,
      useEnvInject: boolean = false,
      deviceSerial?: string,
    ) => {
      onSelectTarget(targetId);
      onStartTarget(targetId, 'mitm');
      ipcService
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
    (targetId: string, targetUrl?: string) => {
      onSelectTarget(targetId);
      onStartTarget(targetId, 'frida');
      ipcService
        .createProxySession('default')
        .then(async () => {
          if (onLaunchTarget) {
            await onLaunchTarget(targetId, 'http://127.0.0.1:8081', targetUrl, 'frida');
          }
        })
        .catch((err: unknown) => {
          logger.error('[TargetListPanel] Failed to create proxy session:', err);
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
              <span className="ml-2 px-1.5 py-0.5 rounded-md bg-dropdown-item-hover text-text-secondary text-xs">
                {allTargets.length}
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
            <div className="px-3 py-2 flex items-center gap-2">
              <input
                type="text"
                placeholder="Search targets..."
                value={targetSearchQuery}
                onChange={(e) => setTargetSearchQuery(e.target.value)}
                className="flex-1 h-10 bg-input-background border border-border rounded-lg pl-3 pr-3 text-sm text-text-primary placeholder:text-text-secondary outline-none focus:border-primary/50"
              />
              <button
                title="Add target"
                onClick={() => setIsPlatformModalOpen(true)}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg border border-border bg-input-background text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Filter badges */}
            <div className="px-3 pt-1 pb-2 flex items-center gap-2 overflow-x-auto border-b border-border shrink-0">
              {(['all', ...(Object.keys(PLATFORMS) as AppPlatform[])] as const).map((pid) => {
                const label = pid === 'all' ? 'All' : PLATFORMS[pid].label;
                const isActive = filterPlatform === pid;
                return (
                  <button
                    key={pid}
                    onClick={() => setFilterPlatform(pid as 'all' | AppPlatform)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-dropdown-item-hover text-text-secondary hover:text-text-primary',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Running / Idle labels moved into target list groups */}
          </>
        )}

        {/* Target list */}
        <div className={cn('flex-1 overflow-y-auto', effectiveCollapsed ? 'p-1' : 'px-3 py-1.5')}>
          {visibleTargets.length === 0 ? (
            <div className="text-center text-text-secondary text-sm py-6">
              {targetSearchQuery || filterPlatform !== 'all'
                ? 'No matching targets'
                : 'No targets found'}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleRunningTargets.length > 0 && (
                <div>
                  {!effectiveCollapsed && (
                    <div className="py-1.5 flex items-center gap-1.5 text-text-secondary">
                      <span className="text-sm font-semibold tracking-wide">RUNNING</span>
                      <span className="w-2 h-2 rounded-full bg-success" />
                      <span className="text-sm">{visibleRunningTargets.length}</span>
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {visibleRunningTargets.map((tab) => (
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
              {visibleIdleTargets.length > 0 && (
                <div>
                  {!effectiveCollapsed && (
                    <div className="py-1.5 flex items-center gap-1.5 text-text-secondary">
                      <span className="text-sm font-semibold tracking-wide">IDLE</span>
                      <span className="w-2 h-2 rounded-full bg-text-secondary/40" />
                      <span className="text-sm">{visibleIdleTargets.length}</span>
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

      {isPlatformModalOpen && (
        <Modal
          isOpen={isPlatformModalOpen}
          onClose={() => setIsPlatformModalOpen(false)}
          className="max-w-lg"
        >
          <ModalHeader
            title="Add Target"
            description="Choose a platform"
            onClose={() => setIsPlatformModalOpen(false)}
          />
          <ModalBody>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(PLATFORMS) as AppPlatform[]).map((pid) => {
                const p = PLATFORMS[pid];
                const Icon = p.icon;
                const rgb = PLATFORM_COLOR_RGB[pid];
                return (
                  <button
                    key={pid}
                    onClick={() => {
                      setIsPlatformModalOpen(false);
                      onOpenAddModal(pid);
                    }}
                    className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border bg-input-background hover:bg-dropdown-item-hover transition-colors"
                  >
                    <span
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `rgba(${rgb}, 0.12)`, color: `rgb(${rgb})` }}
                    >
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="text-sm font-semibold text-text-primary">{p.label}</span>
                    <span className="text-xs text-text-secondary">{p.description}</span>
                  </button>
                );
              })}
            </div>
          </ModalBody>
        </Modal>
      )}

      <RunningOptionTargetModal
        isOpen={showRunningModal}
        onClose={() => {
          setShowRunningModal(false);
          setSelectedTargetForModal(null);
        }}
        target={selectedTargetForModal}
        platform={selectedTargetForModal ? getTargetPlatform(selectedTargetForModal) : null}
        isRunning={
          selectedTargetForModal
            ? targetStates[selectedTargetForModal.id]?.isActive || false
            : false
        }
        deviceList={deviceList}
        onStartCDP={handleStartCDP}
        onStartMITM={handleStartMITM}
        onStartFrida={handleStartFrida}
        onStopTarget={onStopTarget}
        onRefreshDevices={loadDevices}
      />
    </>
  );
};

export default React.memo(TargetListPanel);
