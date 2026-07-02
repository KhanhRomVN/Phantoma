import React, { useState, useEffect } from 'react';
import { Play, Square, Shield, Monitor, Smartphone, Syringe, X } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { TargetTab } from '../../types/target.types';
import { AppPlatform, getTargetPlatform, getPlatformLabel, getPlatformIcon, getPlatformColor, getTargetFavicon } from './utils';

interface RunningOptionTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: TargetTab | null;
  platform: AppPlatform | null;
  isRunning: boolean;
  deviceList: { name: string; serial: string; type: string }[];
  onStartCDP: (targetId: string, targetUrl?: string) => void;
  onStartMITM: (targetId: string, targetUrl?: string, useEnvInject?: boolean, deviceSerial?: string) => void;
  onStartFrida: (targetId: string, targetUrl?: string) => void;
  onStopTarget: () => void;
  onRefreshDevices?: () => Promise<void>;
}

export function RunningOptionTargetModal({
  isOpen,
  onClose,
  target,
  platform,
  isRunning,
  deviceList,
  onStartCDP,
  onStartMITM,
  onStartFrida,
  onStopTarget,
  onRefreshDevices,
}: RunningOptionTargetModalProps) {
  const [selectedDeviceSerial, setSelectedDeviceSerial] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<'cdp' | 'mitm-normal' | 'mitm-env' | 'frida' | 'stop' | null>(null);
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);
  const hasOpenedRef = React.useRef(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!hasOpenedRef.current) {
        console.log('[RunningOptionTargetModal] Modal opened, resetting state (first time)');
        hasOpenedRef.current = true;
        setSelectedAction(null);
        setSelectedDeviceSerial(deviceList.length > 0 ? deviceList[0].serial : '');
        setIsDeviceDropdownOpen(false);
        if (onRefreshDevices && platform === 'android') {
          onRefreshDevices();
        }
      } else {
        console.log('[RunningOptionTargetModal] Modal already opened, skipping reset');
      }
    } else {
      console.log('[RunningOptionTargetModal] Modal closed');
      hasOpenedRef.current = false;
    }
  }, [isOpen, platform, deviceList, onRefreshDevices, setSelectedAction, setSelectedDeviceSerial, setIsDeviceDropdownOpen]);

  if (!target || !platform) return null;

  const handleActionSelect = (action: 'cdp' | 'mitm-normal' | 'mitm-env' | 'frida' | 'stop') => {
    console.log('[RunningOptionTargetModal] handleActionSelect called with:', action);
    console.log('[RunningOptionTargetModal] Current selectedAction:', selectedAction);
    setSelectedAction(action);
    console.log('[RunningOptionTargetModal] New selectedAction set to:', action);
  };

  const handleStart = () => {
    if (!selectedAction) return;
    if (selectedAction === 'stop') {
      onStopTarget();
      onClose();
      return;
    }
    switch (selectedAction) {
      case 'cdp':
        onStartCDP(target.id, target.url);
        break;
      case 'mitm-normal':
        if (platform === 'android') {
          onStartMITM(target.id, target.url, false, selectedDeviceSerial || undefined);
        } else {
          onStartMITM(target.id, target.url, false);
        }
        break;
      case 'mitm-env':
        if (platform === 'android') {
          onStartMITM(target.id, target.url, true, selectedDeviceSerial || undefined);
        } else {
          onStartMITM(target.id, target.url, true);
        }
        break;
      case 'frida':
        onStartFrida(target.id, target.url);
        break;
    }
    onClose();
  };

  const getTargetSubtitle = (): string => {
    if (platform === 'web' && target.url) return target.url;
    if ((platform === 'pc' || platform === 'cli') && target.executablePath) return target.executablePath;
    return getPlatformLabel(platform);
  };

  const renderActionButtons = () => {
    const buttons: React.ReactNode[] = [];

    if (isRunning) {
      buttons.push(
        <button
          key="stop"
          onClick={(e) => {
            e.stopPropagation();
            console.log('[RunningOptionTargetModal] Stop card clicked');
            handleActionSelect('stop');
          }}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg border transition-all',
            selectedAction === 'stop'
              ? 'border-red-500 bg-red-500/10'
              : 'border-border hover:bg-dropdown-item-hover'
          )}
        >
          <div className="flex items-center gap-3">
            <Square className="w-4 h-4 text-red-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Stop target</div>
              <div className="text-xs text-text-secondary mt-0.5">Stop the running target session</div>
            </div>
          </div>
        </button>
      );
      return buttons;
    }

    // CDP - only for web
    if (platform === 'web') {
      buttons.push(
        <button
          key="cdp"
          onClick={(e) => {
            e.stopPropagation();
            console.log('[RunningOptionTargetModal] CDP card clicked');
            handleActionSelect('cdp');
          }}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg border transition-all',
            selectedAction === 'cdp'
              ? 'border-sky-400 bg-sky-400/10'
              : 'border-border hover:bg-dropdown-item-hover'
          )}
        >
          <div className="flex items-center gap-3">
            <Monitor className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">CDP</div>
              <div className="text-xs text-text-secondary mt-0.5">Chrome DevTools Protocol for debugging and automation</div>
            </div>
          </div>
        </button>
      );
    }

    // MITM - all platforms
    const mitmLabel = platform === 'android' ? 'MITM (select device)' : 'MITM';
    buttons.push(
      <button
        key="mitm-normal"
        onClick={(e) => {
          e.stopPropagation();
          console.log('[RunningOptionTargetModal] MITM Normal card clicked');
          handleActionSelect('mitm-normal');
        }}
        className={cn(
          'w-full text-left px-4 py-3 rounded-lg border transition-all',
          selectedAction === 'mitm-normal'
            ? 'border-amber-400 bg-amber-400/10'
            : 'border-border hover:bg-dropdown-item-hover'
        )}
      >
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{mitmLabel}</span>
              <span className="text-xs text-text-secondary">Normal</span>
            </div>
            <div className="text-xs text-text-secondary mt-0.5">Standard MITM proxy interception for traffic analysis</div>
          </div>
        </div>
      </button>
    );

    // MITM with ENV Inject - only for PC and CLI
    if (platform === 'pc' || platform === 'cli') {
      buttons.push(
        <button
          key="mitm-env"
          onClick={(e) => {
            e.stopPropagation();
            console.log('[RunningOptionTargetModal] MITM ENV Inject card clicked');
            handleActionSelect('mitm-env');
          }}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg border transition-all',
            selectedAction === 'mitm-env'
              ? 'border-green-400 bg-green-400/10'
              : 'border-border hover:bg-dropdown-item-hover'
          )}
        >
          <div className="flex items-center gap-3">
            <Syringe className="w-4 h-4 text-green-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">MITM</span>
                <span className="text-xs text-text-secondary">ENV Inject</span>
              </div>
              <div className="text-xs text-text-secondary mt-0.5">Intercept traffic with environment variable injection</div>
            </div>
          </div>
        </button>
      );
    }

    // Frida - only for PC and CLI
    if (platform === 'pc' || platform === 'cli') {
      buttons.push(
        <button
          key="frida"
          onClick={(e) => {
            e.stopPropagation();
            console.log('[RunningOptionTargetModal] Frida card clicked');
            handleActionSelect('frida');
          }}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg border transition-all',
            selectedAction === 'frida'
              ? 'border-purple-400 bg-purple-400/10'
              : 'border-border hover:bg-dropdown-item-hover'
          )}
        >
          <div className="flex items-center gap-3">
            <Syringe className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Frida + DLL Injection</div>
              <div className="text-xs text-text-secondary mt-0.5">Dynamic instrumentation for runtime manipulation</div>
            </div>
          </div>
        </button>
      );
    }

    return buttons;
  };

  const getPlatformDisplayName = (): string => {
    const map: Record<AppPlatform, string> = {
      web: 'Website',
      pc: 'App',
      android: 'Mobile',
      cli: 'CLI',
    };
    return map[platform] || platform;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <ModalHeader
        title="Running Options"
        description={`Configure launch options for ${target.title}`}
        onClose={onClose}
      />
      <ModalBody>
        <div className="space-y-4">
          {/* Target Info */}
          <div className="bg-input-background rounded-lg p-4 border border-border">
            <div className="flex items-center gap-3">
              {platform === 'web' ? (
                (() => {
                  const faviconSrc = getTargetFavicon(target);
                  return faviconSrc ? (
                    <img
                      src={faviconSrc}
                      alt={target.title}
                      className="w-8 h-8 shrink-0 rounded p-0.5"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className={cn('shrink-0 p-1.5', getPlatformColor(platform))}>
                      {getPlatformIcon(platform)}
                    </div>
                  );
                })()
              ) : platform === 'pc' && target.icon ? (
                <img
                  src={`media://${target.icon}`}
                  alt={target.title}
                  className="w-8 h-8 shrink-0 rounded p-0.5 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className={cn('shrink-0 p-1.5', getPlatformColor(platform))}>
                  {getPlatformIcon(platform)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text-primary truncate">{target.title}</div>
                <div className="text-xs text-text-secondary truncate font-mono">{getTargetSubtitle()}</div>
              </div>
              <div className="shrink-0">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-dropdown-item-hover text-text-secondary">
                  {getPlatformDisplayName()}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-secondary">Status:</span>
                <span className={cn(
                  'font-medium',
                  isRunning ? 'text-green-400' : 'text-text-secondary'
                )}>
                  {isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
            </div>
          </div>

          {/* Device selector for Android */}
          {platform === 'android' && !isRunning && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-secondary">Select device</label>
              <div className="relative">
                <button
                  onClick={() => setIsDeviceDropdownOpen(!isDeviceDropdownOpen)}
                  className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary text-left flex items-center justify-between hover:bg-dropdown-item-hover transition-colors"
                >
                  <span>
                    {selectedDeviceSerial
                      ? deviceList.find(d => d.serial === selectedDeviceSerial)?.name || 'Select device'
                      : 'Select device'}
                  </span>
                  <span className="text-text-secondary">▼</span>
                </button>
                {isDeviceDropdownOpen && deviceList.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-input-background border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {deviceList.map((device) => (
                      <button
                        key={device.serial}
                        onClick={() => {
                          setSelectedDeviceSerial(device.serial);
                          setIsDeviceDropdownOpen(false);
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-dropdown-item-hover transition-colors flex items-center gap-2',
                          selectedDeviceSerial === device.serial && 'bg-primary/10'
                        )}
                      >
                        {device.type === 'physical' ? (
                          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Monitor className="w-3.5 h-3.5 text-blue-400" />
                        )}
                        <span>{device.name}</span>
                        <span className="text-[9px] text-text-secondary ml-auto">
                          ({device.type === 'physical' ? 'USB' : 'VM'})
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {deviceList.length === 0 && (
                <p className="text-xs text-text-secondary">No devices found. Please connect a device.</p>
              )}
            </div>
          )}

          {/* Action buttons */}
          {!isRunning && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-secondary">Select launch mode</label>
              <div className="space-y-1.5">
                {renderActionButtons()}
              </div>
            </div>
          )}
          {isRunning && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-secondary">Actions</label>
              <div className="space-y-1.5">
                {renderActionButtons()}
              </div>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="solid" onClick={handleStart} disabled={!selectedAction}>
          {isRunning ? 'Apply' : 'Start'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default RunningOptionTargetModal;