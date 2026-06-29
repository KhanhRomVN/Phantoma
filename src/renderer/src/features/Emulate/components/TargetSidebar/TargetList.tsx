import React from 'react';
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
  DropdownSub,
  DropdownSubTrigger,
  DropdownSubContent,
  DropdownTrigger,
} from '../../../../components/ui/Dropdown';
import { Button } from '../../../../components/ui/Button';
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
  const handleStartCDP = (targetId: string, targetUrl?: string) => {
    // Update last_used_at immediately when starting CDP
    onSelectTarget(targetId);
    onStartTarget('cdp');
    if (onLaunchTarget) {
      onLaunchTarget(targetId, 'http://127.0.0.1:8081', targetUrl, 'cdp').then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const ports = [9223, 9224, 9225, 9222];
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
                        'flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all text-sm group relative',
                        activeTargetId === tab.id
                          ? 'bg-dropdown-item-hover text-text-primary'
                          : 'text-text-secondary hover:bg-dropdown-item-hover hover:text-text-primary',
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
                      {/* Timer */}
                      {isRunning && (
                        <span className="text-xs font-mono text-text-secondary shrink-0 transition-transform group-hover:-translate-x-4">
                          {elapsed}
                        </span>
                      )}
                      {/* Hover pause icon (only when running) */}
                      {isRunning && (
                        <span
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary"
                          title="Running"
                        >
                          <Pause className="w-3.5 h-3.5" />
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
                      <DropdownSub>
                        <DropdownSubTrigger icon={<Play className="w-3.5 h-3.5" />}>
                          Start target
                        </DropdownSubTrigger>
                        <DropdownSubContent>
                          <DropdownItem
                            icon={<Monitor className="w-3.5 h-3.5 text-sky-400" />}
                            onClick={() => handleStartCDP(tab.id, tab.url)}
                          >
                            CDP
                          </DropdownItem>
                          {platform === 'android' ? (
                            <DropdownSub>
                              <DropdownSubTrigger
                                icon={<Shield className="w-3.5 h-3.5 text-amber-400" />}
                                onMouseEnter={() => {
                                  if (onRefreshDevices) {
                                    onRefreshDevices();
                                  }
                                }}
                              >
                                MITM
                              </DropdownSubTrigger>
                              <DropdownSubContent>
                                {deviceList.length === 0 ? (
                                  <div className="px-3 py-2 text-xs text-text-secondary">
                                    No device found
                                  </div>
                                ) : (
                                  deviceList.map((device) => (
                                    <DropdownItem
                                      key={device.serial}
                                      icon={
                                        device.type === 'physical' ? (
                                          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                                        ) : (
                                          <Monitor className="w-3.5 h-3.5 text-blue-400" />
                                        )
                                      }
                                      onClick={() =>
                                        handleStartMITM(tab.id, tab.url, false, device.serial)
                                      }
                                    >
                                      {device.name}
                                      <span className="ml-1 text-[9px] text-text-secondary">
                                        ({device.type === 'physical' ? 'USB' : 'VM'})
                                      </span>
                                    </DropdownItem>
                                  ))
                                )}
                              </DropdownSubContent>
                            </DropdownSub>
                          ) : (
                            <DropdownSub>
                              <DropdownSubTrigger icon={<Shield className="w-3.5 h-3.5 text-amber-400" />}>
                                MITM
                              </DropdownSubTrigger>
                              <DropdownSubContent>
                                <DropdownItem
                                  icon={<Play className="w-3.5 h-3.5" />}
                                  onClick={() => handleStartMITM(tab.id, tab.url, false)}
                                >
                                  Chạy bình thường
                                </DropdownItem>
                                <DropdownItem
                                  icon={<Syringe className="w-3.5 h-3.5 text-green-400" />}
                                  onClick={() => handleStartMITM(tab.id, tab.url, true)}
                                >
                                  Chạy với ENV Inject
                                </DropdownItem>
                              </DropdownSubContent>
                            </DropdownSub>
                          )}
                          {platform !== 'web' && platform !== 'android' && (
                            <DropdownItem
                              icon={<Syringe className="w-3.5 h-3.5 text-purple-400" />}
                              onClick={() => handleStartFrida(tab.id, tab.url)}
                            >
                              Frida + DLL Injection
                            </DropdownItem>
                          )}
                        </DropdownSubContent>
                      </DropdownSub>
                    ) : (
                      <DropdownItem
                        icon={<Square className="w-3.5 h-3.5" />}
                        onClick={() => onStopTarget()}
                      >
                        Stop target
                      </DropdownItem>
                    )}
                    <DropdownSeparator />
                    {onEditTarget && (
                      <DropdownItem
                        icon={<Pencil className="w-3.5 h-3.5" />}
                        onClick={() => onEditTarget(tab.id)}
                      >
                        Chỉnh sửa
                      </DropdownItem>
                    )}
                    <DropdownItem
                      icon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
                      variant="error"
                      onClick={() => onRemoveTarget(tab.id)}
                    >
                      Xóa target
                    </DropdownItem>
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
    </>
  );
}

export default TargetList;
