import React, { useState, useCallback, memo } from 'react';
import { Plus, Play, Square, Trash2, Pencil } from 'lucide-react';

// Components
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import { Button } from '@renderer/components/ui/Button';
import { RunningOptionTargetModal } from './RunningOptionTargetModal';

// Types
import { TargetTab } from '../../types/target.types';

// Constants
import { AppPlatform, PLATFORMS } from '../../constants/platforms';

// Utils
import { cn } from '@renderer/shared/utils/cn';
import { getTargetPlatform, getTargetFavicon } from '.';

// Services
import { ipcService } from '../../../../services/ipc.service';

// STORE
import { useTimerStore } from '../../../../stores/timerStore';

interface TargetListProps {
  targetTabs: TargetTab[];
  activeTargetId: string | null;
  targetStates: Record<string, { isActive: boolean; mode?: 'mitm' | 'cdp' | 'frida' }>;
  accentColor: string;
  activeAppId?: string;
  targetSearchQuery: string;
  onSearchChange: (query: string) => void;
  openMenuId: string | null;
  onOpenMenuChange: (id: string | null) => void;
  searchedTargets: TargetTab[];
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
  deviceList?: { name: string; serial: string; type: string }[];
  onRefreshDevices?: () => Promise<void>;
}

// TargetItem component with timer selector for optimal re-render
const TargetItem = memo(
  ({
    tab,
    activeTargetId,
    targetStates,
    activeAppId,
    openMenuId,
    onOpenMenuChange,
    onSelectTarget,
    onRemoveTarget,
    onStopTarget,
    onEditTarget,
    onStopSession,
    deviceList,
    showRunningModal,
    setShowRunningModal,
    setSelectedTargetForModal,
  }: {
    tab: TargetTab;
    activeTargetId: string | null;
    targetStates: Record<string, { isActive: boolean; mode?: 'mitm' | 'cdp' | 'frida' }>;
    activeAppId?: string;
    openMenuId: string | null;
    onOpenMenuChange: (id: string | null) => void;
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
    onEditTarget?: (id: string) => void;
    onStopSession?: (e: React.MouseEvent, appId: string) => void;
    deviceList: { name: string; serial: string; type: string }[];
    showRunningModal: boolean;
    setShowRunningModal: (open: boolean) => void;
    setSelectedTargetForModal: (tab: TargetTab | null) => void;
    handleStartCDP: (targetId: string, targetUrl?: string) => void;
    handleStartMITM: (
      targetId: string,
      targetUrl?: string,
      useEnvInject?: boolean,
      deviceSerial?: string,
    ) => void;
    handleStartFrida: (targetId: string, targetUrl?: string) => void;
  }) => {
    const isRunning = targetStates[tab.id]?.isActive || false;
    const elapsed = useTimerStore((state) => state.timerDisplay[tab.id] || '00:00');
    const platform = getTargetPlatform(tab);
    const faviconSrc = getTargetFavicon(tab);
    const isActive = tab.id === activeAppId;

    // Check if mobile device is running
    const isMobileDeviceRunning = (() => {
      if (platform !== 'android') return true;
      if (!tab.emulatorSerial) return false;
      return deviceList.some((d) => d.serial === tab.emulatorSerial);
    })();

    // Card is disabled if it's a mobile target and device is not running
    const isCardDisabled = platform === 'android' && !isMobileDeviceRunning;

    const platformCfg = PLATFORMS[platform];
    const PlatformIcon = platformCfg.icon;
    const platformColor = platformCfg.color;

    return (
      <Dropdown
        open={openMenuId === tab.id}
        onOpenChange={(open) => onOpenMenuChange(open ? tab.id : null)}
        className="w-full"
      >
        <DropdownTrigger>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelectTarget(tab.id);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenMenuChange(tab.id);
            }}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm group relative',
              isCardDisabled
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer hover:bg-dropdown-item-hover',
              activeTargetId === tab.id
                ? 'bg-dropdown-item-hover text-text-primary'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {/* Badge icon: favicon for web, app icon for pc, lucide fallback */}
            {platform === 'web' && faviconSrc ? (
              <img
                src={faviconSrc}
                alt={tab.title}
                className="w-6 h-6 shrink-0 rounded p-0.5"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : platform === 'pc' && tab.icon ? (
              <img
                src={`media://${tab.icon}`}
                alt={tab.title}
                className="w-6 h-6 shrink-0 rounded p-0.5 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className={cn('shrink-0 p-0.5', `text-${platformColor}-400`)}>
                <PlatformIcon className="w-3 h-3" />
              </span>
            )}
            {/* Title + second line */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{tab.title}</div>
              <div className="text-[11px] text-text-secondary truncate">
                {platform === 'web' && tab.url
                  ? tab.url
                  : (platform === 'pc' || platform === 'cli') && tab.executablePath
                    ? tab.executablePath
                    : platformCfg.label}
              </div>
            </div>
            {isRunning && (
              <span className="absolute top-1.5 right-2 text-[11px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                {elapsed}
              </span>
            )}
            {/* Stop session button for active app */}
            {isActive && onStopSession && (
              <button
                onClick={(e) => onStopSession(e, tab.id)}
                className="flex items-center gap-0.5 px-1 py-0.5 text-[10px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded transition-all shrink-0"
              >
                <Square className="w-2 h-2 text-red-400 pointer-events-none" /> Stop
              </button>
            )}
          </div>
        </DropdownTrigger>
        <DropdownContent>
          {!isRunning ? (
            <DropdownItem
              icon={<Play className="w-3.5 h-3.5" />}
              disabled={isCardDisabled}
              onClick={() => {
                if (isCardDisabled) return;
                if (!showRunningModal) {
                  onOpenMenuChange(null);
                  setSelectedTargetForModal(tab);
                  setShowRunningModal(true);
                }
              }}
            >
              {isCardDisabled ? 'Device not running' : 'Start'}
            </DropdownItem>
          ) : (
            <DropdownItem icon={<Square className="w-3.5 h-3.5" />} onClick={() => onStopTarget()}>
              Stop target
            </DropdownItem>
          )}
          {!isRunning && (
            <>
              {onEditTarget && (
                <DropdownItem
                  icon={<Pencil className="w-3.5 h-3.5" />}
                  onClick={() => onEditTarget(tab.id)}
                >
                  Edit
                </DropdownItem>
              )}
              <DropdownItem
                icon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
                variant="error"
                onClick={() => onRemoveTarget(tab.id)}
              >
                Delete
              </DropdownItem>
            </>
          )}
        </DropdownContent>
      </Dropdown>
    );
  },
);

TargetItem.displayName = 'TargetItem';

const TargetList: React.FC<TargetListProps> = ({
  targetTabs: _targetTabs,
  activeTargetId,
  targetStates,
  activeAppId,
  targetSearchQuery,
  onSearchChange,
  openMenuId,
  onOpenMenuChange,
  searchedTargets,
  onSelectTarget,
  onRemoveTarget,
  onStartTarget,
  onStopTarget,
  onLaunchTarget,
  onOpenAddModal,
  onEditTarget,
  onStopSession,
  deviceList = [],
  onRefreshDevices,
}) => {
  const [showRunningModal, setShowRunningModal] = useState(false);
  const [selectedTargetForModal, setSelectedTargetForModal] = useState<TargetTab | null>(null);

  const handleStartCDP = useCallback(
    (targetId: string, targetUrl?: string) => {
      // Update last_used_at immediately when starting CDP
      onSelectTarget(targetId);
      onStartTarget(targetId, 'cdp');
      if (onLaunchTarget) {
        onLaunchTarget(targetId, 'http://127.0.0.1:8081', targetUrl, 'cdp').then(async () => {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          // Get the actual CDP port from the launch process
          if (!window.api || typeof window.api.invoke !== 'function') {
            console.error('[TargetList] window.api is not available');
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
      // Update last_used_at immediately when starting MITM
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
    [onSelectTarget, onStartTarget, onLaunchTarget],
  );

  const handleStartFrida = useCallback(
    (targetId: string, targetUrl?: string) => {
      // Update last_used_at immediately when starting Frida
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
          console.error('[TargetList] Failed to create proxy session:', err);
          onStopTarget();
        });
    },
    [onSelectTarget, onStartTarget, onLaunchTarget, onStopTarget],
  );

  return (
    <>
      {/* Search + Add */}
      <div className="px-1 py-1 border-b border-border shrink-0">
        <div className="flex items-center gap-1">
          <input
            type="text"
            placeholder="Search targets..."
            value={targetSearchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 h-8 bg-input-background border border-border rounded pl-2 pr-2 text-sm text-text-primary placeholder:text-text-secondary outline-none focus:border-primary/50"
          />
          <Dropdown>
            <DropdownTrigger>
              <Button variant="outline" className="shrink-0 w-7 h-7 p-0">
                <Plus className="w-4 h-4" />
              </Button>
            </DropdownTrigger>
            <DropdownContent className="min-w-[180px]">
              {(Object.keys(PLATFORMS) as AppPlatform[]).map((pid) => {
                const p = PLATFORMS[pid];
                const Icon = p.icon;
                return (
                  <DropdownItem
                    key={pid}
                    icon={
                      <Icon className="w-3.5 h-3.5" style={{ color: `var(--${p.color}-400)` }} />
                    }
                    onClick={() => onOpenAddModal(pid)}
                  >
                    {p.label}
                  </DropdownItem>
                );
              })}
            </DropdownContent>
          </Dropdown>
        </div>
      </div>

      {/* Target list */}
      <div className="flex-1 overflow-y-auto p-1.5">
        {searchedTargets.length > 0 ? (
          <div className="space-y-0.5">
            {searchedTargets.map((tab) => (
              <TargetItem
                key={tab.id}
                tab={tab}
                activeTargetId={activeTargetId}
                targetStates={targetStates}
                activeAppId={activeAppId}
                openMenuId={openMenuId}
                onOpenMenuChange={onOpenMenuChange}
                onSelectTarget={onSelectTarget}
                onRemoveTarget={onRemoveTarget}
                onStartTarget={onStartTarget}
                onStopTarget={onStopTarget}
                onLaunchTarget={onLaunchTarget}
                onEditTarget={onEditTarget}
                onStopSession={onStopSession}
                deviceList={deviceList}
                showRunningModal={showRunningModal}
                setShowRunningModal={setShowRunningModal}
                setSelectedTargetForModal={setSelectedTargetForModal}
                handleStartCDP={handleStartCDP}
                handleStartMITM={handleStartMITM}
                handleStartFrida={handleStartFrida}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-text-secondary text-sm py-6">
            {targetSearchQuery ? 'No matching targets' : 'No targets found'}
          </div>
        )}
      </div>

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
        onRefreshDevices={onRefreshDevices}
      />
    </>
  );
};

export default React.memo(TargetList);
