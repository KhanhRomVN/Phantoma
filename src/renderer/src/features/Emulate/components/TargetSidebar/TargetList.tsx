import React, { useState } from 'react';
import {
  Plus,
  Play,
  Square,
  Trash2,
  Shield,
  Monitor,
  Globe,
  Smartphone,
  Terminal,
  Pause,
  Pencil,
  Syringe,
} from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { TargetTab } from '../../types/target.types';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '../../../../components/ui/Dropdown';
import { Button } from '../../../../components/ui/Button';
import { RunningOptionTargetModal } from './RunningOptionTargetModal';
import {
  AppPlatform,
  getTargetPlatform,
  getPlatformIcon,
  getPlatformColor,
  getPlatformLabel,
  getTargetFavicon,
} from './utils';

interface TargetListProps {
  targetTabs: TargetTab[];
  activeTargetId: string | null;
  timerDisplay: Record<string, string>;
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
  onStartTarget: (mode: 'mitm' | 'cdp' | 'frida') => void;
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

export function TargetList({
  targetTabs: _targetTabs,
  activeTargetId,
  timerDisplay,
  targetStates,
  accentColor,
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
}: TargetListProps) {
  const [showRunningModal, setShowRunningModal] = useState(false);
  const [selectedTargetForModal, setSelectedTargetForModal] = useState<TargetTab | null>(null);

  const handleStartCDP = (targetId: string, targetUrl?: string) => {
    // Update last_used_at immediately when starting CDP
    onSelectTarget(targetId);
    onStartTarget('cdp');
    if (onLaunchTarget) {
      onLaunchTarget(targetId, 'http://127.0.0.1:8081', targetUrl, 'cdp').then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        // Get the actual CDP port from the launch process
        if (!window.api || typeof window.api.invoke !== 'function') {
          console.error('[TargetList] window.api is not available');
          return;
        }
        const { port: launchPort } = await window.api.invoke('cdp:get-launch-port');
        const ports = launchPort ? [launchPort] : [9222];
        for (const port of ports) {
          try {
            const result = await window.api.invoke('cdp:connect', port);
            if (result?.success) {
              await window.api.invoke('cdp:reload');
              break;
            }
          } catch {
            // Continue trying next port
          }
        }
      });
    }
  };

  const handleStartMITM = (targetId: string, targetUrl?: string, useEnvInject: boolean = false, deviceSerial?: string) => {
    // Update last_used_at immediately when starting MITM
    onSelectTarget(targetId);
    onStartTarget('mitm');
    window.api
      .invoke('proxy:create-session', 'default')
      .then(async () => {
        if (onLaunchTarget) {
          await onLaunchTarget(targetId, 'http://127.0.0.1:8081', targetUrl, 'browser', useEnvInject, deviceSerial);
        }
      })
      .catch(() => {
        onStopTarget();
      });
  };

  const handleStartFrida = (targetId: string, targetUrl?: string) => {
    console.log(`[TargetList] Starting Frida for target: ${targetId}, url: ${targetUrl}`);
    // Update last_used_at immediately when starting Frida
    onSelectTarget(targetId);
    onStartTarget('frida');
    console.log('[TargetList] Creating proxy session...');
    window.api
      .invoke('proxy:create-session', 'default')
      .then(async () => {
        console.log('[TargetList] Proxy session created, launching target...');
        if (onLaunchTarget) {
          await onLaunchTarget(targetId, 'http://127.0.0.1:8081', targetUrl, 'frida');
        }
        console.log('[TargetList] Launch completed.');
      })
      .catch((err) => {
        console.error('[TargetList] Failed to create proxy session:', err);
        onStopTarget();
      });
  };

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
            className="flex-1 h-8 bg-input-background border border-border rounded pl-2 pr-2 text-xs text-text-primary placeholder:text-text-secondary outline-none focus:border-primary/50"
          />
          <Dropdown>
            <DropdownTrigger>
              <Button variant="outline" className="shrink-0 w-7 h-7 p-0">
                <Plus className="w-4 h-4" />
              </Button>
            </DropdownTrigger>
            <DropdownContent className="min-w-[180px]">
              {[
                { id: 'web' as AppPlatform, label: 'Website', icon: Globe },
                { id: 'pc' as AppPlatform, label: 'App', icon: Monitor },
                { id: 'android' as AppPlatform, label: 'Mobile', icon: Smartphone },
                { id: 'cli' as AppPlatform, label: 'CLI', icon: Terminal },
              ].map((platform) => {
                const Icon = platform.icon;
                return (
                  <DropdownItem
                    key={platform.id}
                    icon={<Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />}
                    onClick={() => onOpenAddModal(platform.id)}
                  >
                    {platform.label}
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
            {searchedTargets.map((tab) => {
              const isRunning = targetStates[tab.id]?.isActive || false;
              const elapsed = timerDisplay[tab.id] || '00:00';
              const platform = getTargetPlatform(tab);
              const faviconSrc = getTargetFavicon(tab);
              const isActive = tab.id === activeAppId;
              
              // Check if mobile device is running
              const isMobileDeviceRunning = (() => {
                if (platform !== 'android') return true;
                if (!tab.emulatorSerial) return false;
                return deviceList.some(d => d.serial === tab.emulatorSerial);
              })();
              
              // Card is disabled if it's a mobile target and device is not running
              const isCardDisabled = platform === 'android' && !isMobileDeviceRunning;

              return (
                <Dropdown
                  key={tab.id}
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
                        <span className={cn('shrink-0 p-0.5', getPlatformColor(platform))}>
                          {getPlatformIcon(platform)}
                        </span>
                      )}
                      {/* Title + second line */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{tab.title}</div>
                        <div className="text-[10px] text-text-secondary truncate">
                          {platform === 'web' && tab.url
                            ? tab.url
                            : (platform === 'pc' || platform === 'cli') && tab.executablePath
                              ? tab.executablePath
                              : getPlatformLabel(platform)}
                        </div>
                      </div>
                      {/* Timer - luôn hiển thị ở góc phải trên cùng khi running */}
                      {(() => {
                        console.log(`[TargetList] Timer check for ${tab.id}:`, {
                          isRunning,
                          elapsed,
                          mode: targetStates[tab.id]?.mode,
                          timerDisplayValue: timerDisplay[tab.id]
                        });
                        return null;
                      })()}
                      {isRunning && (
                        <span className="absolute top-1.5 right-2 text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {elapsed}
                        </span>
                      )}
                      {/* Stop session button for active app */}
                      {isActive && onStopSession && (
                        <button
                          onClick={(e) => onStopSession(e, tab.id)}
                          className="flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded transition-all shrink-0"
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
                          console.log('[TargetList] Start target clicked for:', tab.id);
                          console.log('[TargetList] showRunningModal currently:', showRunningModal);
                          // Only open modal if not already open
                          if (!showRunningModal) {
                            // Close the dropdown first
                            onOpenMenuChange(null);
                            // Then open the modal
                            setSelectedTargetForModal(tab);
                            setShowRunningModal(true);
                            console.log('[TargetList] showRunningModal set to true');
                          } else {
                            console.log('[TargetList] Modal already open, skipping');
                          }
                        }}
                      >
                        {isCardDisabled ? 'Device not running' : 'Start target'}
                      </DropdownItem>
                    ) : (
                      <DropdownItem
                        icon={<Square className="w-3.5 h-3.5" />}
                        onClick={() => onStopTarget()}
                      >
                        Stop target
                      </DropdownItem>
                    )}
                    <DropdownSeparator />
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
            })}
          </div>
        ) : (
          <div className="text-center text-text-secondary text-xs py-6">
            {targetSearchQuery ? 'No matching targets' : 'No targets found'}
          </div>
        )}
      </div>
      <RunningOptionTargetModal
        isOpen={showRunningModal}
        onClose={() => {
          console.log('[TargetList] Modal onClose called');
          setShowRunningModal(false);
          setSelectedTargetForModal(null);
        }}
        target={selectedTargetForModal}
        platform={selectedTargetForModal ? getTargetPlatform(selectedTargetForModal) : null}
        isRunning={selectedTargetForModal ? targetStates[selectedTargetForModal.id]?.isActive || false : false}
        deviceList={deviceList}
        onStartCDP={handleStartCDP}
        onStartMITM={handleStartMITM}
        onStartFrida={handleStartFrida}
        onStopTarget={onStopTarget}
        onRefreshDevices={onRefreshDevices}
      />
    </>
  );
}

export default TargetList;
