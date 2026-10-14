/**
 * ------------------------------------------------------------------
 * RunningOptionTargetModal
 * ------------------------------------------------------------------
 * Modal chọn launch mode khi start target — CDP, MITM, MITM+ENV,
 * Frida hoặc Stop. Hỗ trợ chọn device cho Android target.
 *
 * Các chức năng chính:
 * - Hiển thị thông tin target và trạng thái
 * - Chọn launch mode phù hợp theo platform
 * - Chọn device cho Android targets
 * - Start/stop target với mode đã chọn
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ─
import React, { useState, useEffect } from 'react';

// ── UI ──
import {
  Square,
  Shield,
  Monitor,
  Smartphone,
  Syringe,
  Lock,
  Zap,
  Network,
  Activity,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';
import { Button } from '@renderer/components/ui/Button';

// ── Constants ──
import { AppPlatform, PLATFORMS } from '../../constants/platforms';

// ── Types ─
import { TargetTab } from '../../types/target.types';

// ── Services ──
import { emulateApi } from '../../services/emulate-api.service';
import { secureStorage } from '../../services/secure-storage.service';

// ── Utils ─
import { cn } from '@renderer/shared/utils/cn';
import { getTargetFavicon } from '.';

// Map icon name string to Lucide component
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Monitor,
  Shield,
  Syringe,
  Zap,
  Network,
  Activity,
};
// ─── Interfaces ─────────────────────────────────────────────────────────
interface RunningOptionTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: TargetTab | null;
  platform: AppPlatform | null;
  isRunning: boolean;
  deviceList: { name: string; serial: string; type: string }[];
  onStartCDP: (targetId: string, targetUrl?: string) => void;
  onStartMITM: (
    targetId: string,
    targetUrl?: string,
    useEnvInject?: boolean,
    deviceSerial?: string,
    useSandbox?: boolean,
  ) => void;
  onStartFrida: (targetId: string, targetUrl?: string, useSandbox?: boolean) => void;
  onStartEbpf: (targetId: string, targetUrl?: string, useSandbox?: boolean, sudoPassword?: string) => void;
  onStartCdp: (targetId: string, targetUrl?: string, useSandbox?: boolean) => void;
  onStartPcap: (targetId: string, targetUrl?: string, useSandbox?: boolean, sudoPassword?: string) => void;
  onStartAppDebug: (targetId: string, targetUrl?: string, useSandbox?: boolean) => void;
  onStopTarget: () => void;
  onRefreshDevices?: () => Promise<void>;
}

interface CaptureMethodMeta {
  id: string;
  label: string;
  description: string;
  icon?: string;
  color?: string;
  ratings: { dataQuality: number; authCompat: number; complexity: number };
  pros: string[];
  cons: string[];
  limitations: string;
  recommended?: boolean;
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
  onStartEbpf,
  onStartCdp,
  onStartPcap,
  onStartAppDebug,
  onStopTarget,
  onRefreshDevices,
}: RunningOptionTargetModalProps) {
  const [selectedDeviceSerial, setSelectedDeviceSerial] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<CaptureMethodMeta[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  
  // Sudo Password State
  const [sudoPassword, setSudoPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  const hasOpenedRef = React.useRef(false);

  // Fetch capture methods from backend
  useEffect(() => {
    if (!platform || !isOpen) return;

    let cancelled = false;
    setLoadingMethods(true);

    emulateApi
      .getCaptureMethods(platform as any)
      .then((response) => {
        if (cancelled) return;

        // Response is expected to be { platform: string, methods: CaptureMethodMeta[] }
        const methods = response?.methods;

        if (Array.isArray(methods)) {
          setAvailableMethods(methods);
        } else {
          console.warn('[Modal] No valid methods array found in response.', response);
          setAvailableMethods([]);
        }
      })
      .catch((err) => {
        console.error('[Modal] Failed to load capture methods:', err);
        if (!cancelled) {
          setAvailableMethods([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingMethods(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [platform, isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!hasOpenedRef.current) {
        hasOpenedRef.current = true;
        setSelectedAction(null);
        setSelectedDeviceSerial(deviceList.length > 0 ? deviceList[0].serial : '');
        setIsDeviceDropdownOpen(false);
        if (onRefreshDevices && platform === 'android') {
          onRefreshDevices();
        }
        
        // Load saved sudo password from secure storage asynchronously
        secureStorage.getSudoPassword().then((savedPw) => {
          if (savedPw) {
            setSudoPassword(savedPw);
          }
        });
      }
    } else {
      hasOpenedRef.current = false;
    }
  }, [
    isOpen,
    platform,
    deviceList,
    onRefreshDevices,
    setSelectedAction,
    setSelectedDeviceSerial,
    setIsDeviceDropdownOpen,
  ]);

  if (!target || !platform) return null;

  const platformCfg = PLATFORMS[platform];
  const PlatformIcon = platformCfg.icon;
  const platformColor = platformCfg.color;

  const handleActionSelect = (action: string) => {
    setSelectedAction(action);
  };

  const handleStart = async () => {
    if (!selectedAction) return;
    if (selectedAction === 'stop') {
      onStopTarget();
      onClose();
      return;
    }

    // Map action ID to appropriate callback based on platform and method type
    const method = availableMethods.find((m) => m.id === selectedAction);
    if (!method) return;

    // Auto-save password to secure storage if provided for modes requiring sudo
    if ((selectedAction === 'ebpf' || selectedAction === 'pcap') && sudoPassword) {
      await secureStorage.setSudoPassword(sudoPassword);
    }

    switch (selectedAction) {
      case 'cdp':
        if (platform === 'cli') {
          onStartCdp(target.id, target.executablePath || target.url);
        } else {
          onStartCDP(target.id, target.url);
        }
        break;
      case 'mitm-normal':
        if (platform === 'android') {
          onStartMITM(target.id, target.url, false, selectedDeviceSerial || undefined);
        } else if (platform === 'cli') {
          onStartMITM(target.id, undefined, false, undefined); // CLI url chỉ dùng cho favicon, không dùng để launch
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
        onStartFrida(target.id, platform === 'cli' ? undefined : target.url); // CLI url chỉ dùng cho favicon
        break;
      case 'ebpf':
        onStartEbpf(target.id, target.executablePath || target.url, undefined, sudoPassword);
        break;
      case 'pcap':
        onStartPcap(target.id, target.executablePath || target.url, undefined, sudoPassword);
        break;
      case 'app-debug':
        onStartAppDebug(target.id, target.executablePath || target.url);
        break;
    }
    onClose();
  };

  const getTargetSubtitle = (): string => {
    if (platform === 'web' && target.url) return target.url;
    if ((platform === 'pc' || platform === 'cli') && target.executablePath)
      return target.executablePath;
    return platformCfg.label;
  };

  const renderActionButtons = () => {
    const buttons: React.ReactNode[] = [];

    if (isRunning) {
      buttons.push(
        <button
          key="stop"
          onClick={(e) => {
            e.stopPropagation();
            handleActionSelect('stop');
          }}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg border transition-all',
            selectedAction === 'stop'
              ? 'border-red-500 bg-red-500/10'
              : 'border-border hover:bg-dropdown-item-hover',
          )}
        >
          <div className="flex items-center gap-3">
            <Square className="w-4 h-4 text-red-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Stop target</div>
              <div className="text-xs text-text-secondary mt-0.5">
                Stop the running target session
              </div>
            </div>
          </div>
        </button>,
      );
      return buttons;
    }

    if (loadingMethods) {
      return <div className="text-center py-4 text-xs text-text-secondary">Loading methods...</div>;
    }

    // Render dynamic buttons based on availableMethods from backend
    for (const method of availableMethods) {
      const IconComp = method.icon ? ICON_MAP[method.icon] : Shield; // Fallback to Shield

      buttons.push(
        <button
          key={method.id}
          onClick={(e) => {
            e.stopPropagation();
            handleActionSelect(method.id);
          }}
          className={cn(
            'relative w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 ease-out overflow-hidden',
            selectedAction === method.id
              ? 'border-border/60 bg-input-background'
              : 'border-transparent hover:bg-dropdown-item-hover',
          )}
        >
          {/* Selected Accent Bar (Gradient Line Left) */}
          {selectedAction === method.id && (
            <div
              className={cn(
                'absolute left-0 top-1/2 -translate-y-1/2 h-[80%] w-1 rounded-r-md',
                `bg-gradient-to-r from-${method.color || 'sky-400'} to-transparent`,
              )}
            />
          )}

          <div className="flex items-center gap-3 relative z-10">
            <IconComp
              className={`w-4 h-4 ${selectedAction === method.id ? `text-${method.color || 'sky-400'}` : 'text-text-secondary'} shrink-0`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{method.label}</span>
                {method.recommended && (
                  <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-sky-500/20 text-sky-400 rounded">
                    RECOMMENDED
                  </span>
                )}
              </div>
              <div className="text-xs text-text-secondary mt-0.5">{method.description}</div>
            </div>
          </div>
        </button>,
      );
    }

    return buttons;
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
              {platform === 'web' || platform === 'cli' ? (
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
                    <div className={cn('shrink-0 p-1.5', `text-${platformColor}-400`)}>
                      <PlatformIcon className="w-3 h-3" />
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
                <div className={cn('shrink-0 p-1.5', `text-${platformColor}-400`)}>
                  <PlatformIcon className="w-3 h-3" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text-primary truncate">
                  {target.title}
                </div>
                <div className="text-xs text-text-secondary truncate font-mono">
                  {getTargetSubtitle()}
                </div>
              </div>
              <div className="shrink-0">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-dropdown-item-hover text-text-secondary">
                  {platformCfg.label}
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
                      ? deviceList.find((d) => d.serial === selectedDeviceSerial)?.name ||
                        'Select device'
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
                          selectedDeviceSerial === device.serial && 'bg-primary/10',
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
                <p className="text-xs text-text-secondary">
                  No devices found. Please connect a device.
                </p>
              )}
            </div>
          )}

          {/* Sudo Password Input for eBPF/PCAP */}
          {(selectedAction === 'ebpf' || selectedAction === 'pcap') && !isRunning && (
            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <Lock className="w-3 h-3" />
                Sudo Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={sudoPassword}
                  onChange={(e) => setSudoPassword(e.target.value)}
                  placeholder="Enter your sudo password..."
                  className="w-full bg-input-background border border-border rounded-lg px-3 py-2 pr-10 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-text-secondary italic">
                Required for kernel-level traffic capture. Stored temporarily in session memory only.
              </p>
            </div>
          )}

          {/* Action buttons */}
          {!isRunning && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-secondary">
                Select launch mode
              </label>
              <div className="space-y-1.5">{renderActionButtons()}</div>
            </div>
          )}
          {isRunning && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-secondary">Actions</label>
              <div className="space-y-1.5">{renderActionButtons()}</div>
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
