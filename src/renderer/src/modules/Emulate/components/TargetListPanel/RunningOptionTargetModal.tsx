/**
 * ------------------------------------------------------------------
 * RunningOptionTargetModal
 * ------------------------------------------------------------------
 * Modal chọn phương thức bắt HTTPS khi start target. Hiển thị danh sách
 * các capture method (CDP, MITM, Frida, eBPF, PCAP...) theo platform,
 * chọn device cho Android, nhập sudo password cho eBPF/PCAP.
 * Mọi button dùng soft-style.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';

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
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';
import { Button } from '@renderer/components/ui/Button';

import { AppPlatform, PLATFORMS } from '../../constants/platforms';
import { TargetTab } from '../../types/target.types';
import { emulateApi } from '../../services/emulate-api.service';
import { secureStorage } from '../../services/secure-storage.service';
import { cn } from '@renderer/shared/utils/cn';
import { getTargetFavicon } from '.';
import { PLATFORM_STYLES } from './TargetCard';
import { ProfileSelect } from './TargetModal';


const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Monitor,
  Shield,
  Syringe,
  Zap,
  Network,
  Activity,
};

const CANCEL_CLASS =
  'bg-button-soft-background text-text-secondary hover:bg-button-soft-background/80 hover:text-text-primary active:bg-button-soft-background/70 disabled:hover:bg-button-soft-background';

const METHOD_RGB: Record<string, string> = {
  cdp: '14, 165, 233',
  'mitm-normal': '16, 185, 129',
  'mitm-env': '139, 92, 246',
  frida: '236, 72, 153',
  ebpf: '245, 158, 11',
  pcap: '99, 102, 241',
  'app-debug': '20, 184, 166',
  stop: '239, 68, 68',
};

const FALLBACK_RGB = ['14, 165, 233', '16, 185, 129', '139, 92, 246', '236, 72, 153', '245, 158, 11'];

// ─── Interfaces ─────────────────────────────────────────────────────────
interface RunningOptionTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: TargetTab | null;
  platform: AppPlatform | null;
  isRunning: boolean;
  deviceList: { name: string; serial: string; type: string }[];
  onStartCDP: (targetId: string, targetUrl?: string, userDataDir?: string) => Promise<void> | void;
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

// ─── Sub components ─────────────────────────────────────────────────────
const MethodRow: React.FC<{
  icon: React.ComponentType<any>;
  label: string;
  description: string;
  selected: boolean;
  recommended?: boolean;
  rgb: string;
  onClick: () => void;
}> = ({ icon: Icon, label, description, selected, recommended, rgb, onClick }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    style={{
      borderLeft: `3px solid ${selected ? `rgb(${rgb})` : 'transparent'}`,
      backgroundColor: selected ? `rgba(${rgb}, 0.1)` : undefined,
    }}
    className={cn(
      'flex w-full items-center gap-3 px-3 py-3 text-left outline-none transition-colors',
      selected ? 'rounded-l-none rounded-r-lg' : 'rounded-lg',
      !selected && 'bg-input-background hover:bg-dropdown-item-hover/60',
    )}
  >
    <span
      style={
        selected ? { backgroundColor: `rgba(${rgb}, 0.15)`, color: `rgb(${rgb})` } : undefined
      }
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
        !selected && 'bg-border/40 text-text-secondary',
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        {recommended && (
          <span
            style={{ backgroundColor: `rgba(${rgb}, 0.15)`, color: `rgb(${rgb})` }}
            className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
          >
            Recommended
          </span>
        )}
      </span>
      <span className="mt-0.5 block truncate text-xs text-text-secondary">{description}</span>
    </span>
  </button>
);

// ─── Main Modal ─────────────────────────────────────────────────────────
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
  const [sudoPassword, setSudoPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [profilePath, setProfilePath] = useState<string>('');
  const [isLaunching, setIsLaunching] = useState<boolean>(false);

  const hasOpenedRef = React.useRef(false);

  useEffect(() => {
    if (!platform || !isOpen) return;

    let cancelled = false;
    setLoadingMethods(true);

    emulateApi
      .getCaptureMethods(platform as any)
      .then((response) => {
        if (cancelled) return;
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
        if (!cancelled) setAvailableMethods([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingMethods(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platform, isOpen]);

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
        secureStorage.getSudoPassword().then((savedPw) => {
          if (savedPw) setSudoPassword(savedPw);
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

  const handleStart = async () => {
    if (!selectedAction) return;
    if (selectedAction === 'stop') {
      onStopTarget();
      onClose();
      return;
    }

    const method = availableMethods.find((m) => m.id === selectedAction);
    if (!method) return;

    if ((selectedAction === 'ebpf' || selectedAction === 'pcap') && sudoPassword) {
      await secureStorage.setSudoPassword(sudoPassword);
    }

    switch (selectedAction) {
      case 'cdp':
        if (platform === 'cli') {
          onStartCdp(target.id, target.executablePath || target.url);
        } else {
          console.log(`[DEBUG][Modal] Start CDP web: targetId=${target.id} url=${target.url} profilePath=${JSON.stringify(profilePath)}`);
          setIsLaunching(true);
          try {
            await onStartCDP(target.id, target.url, profilePath || undefined);
          } finally {
            setIsLaunching(false);
          }
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

  const renderTargetIcon = () => {
    const fallback = (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-border/40 text-text-secondary">
        <PlatformIcon className="h-4 w-4" />
      </span>
    );
    if (platform === 'web' || platform === 'cli') {
      const faviconSrc = getTargetFavicon(target);
      return faviconSrc ? (
        <img
          src={faviconSrc}
          alt={target.title}
          className="h-9 w-9 shrink-0 rounded-lg object-contain p-1"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        fallback
      );
    }
    if (platform === 'pc' && target.icon) {
      return (
        <img
          src={`media://${target.icon}`}
          alt={target.title}
          className="h-9 w-9 shrink-0 rounded-lg object-contain p-1"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }
    return fallback;
  };

  const renderMethodList = () => {
    if (isRunning) {
      return (
        <MethodRow
          icon={Square}
          label="Stop target"
          description="Stop the running target session"
          selected={selectedAction === 'stop'}
          rgb={METHOD_RGB.stop}
          onClick={() => setSelectedAction('stop')}
        />
      );
    }

    if (loadingMethods) {
      return (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-text-secondary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading methods...
        </div>
      );
    }

    if (availableMethods.length === 0) {
      return (
        <div className="py-6 text-center text-xs text-text-secondary">
          No capture methods available for this platform
        </div>
      );
    }

    return availableMethods.map((method, index) => (
      <MethodRow
        key={method.id}
        rgb={METHOD_RGB[method.id] ?? FALLBACK_RGB[index % FALLBACK_RGB.length]}
        icon={(method.icon && ICON_MAP[method.icon]) || Shield}
        label={method.label}
        description={method.description}
        recommended={method.recommended}
        selected={selectedAction === method.id}
        onClick={() => setSelectedAction(method.id)}
      />
    ));
  };

  const handleClose = () => {
    if (!isLaunching) onClose();
  };

  const selectedDevice = deviceList.find((d) => d.serial === selectedDeviceSerial);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="!max-w-none !w-[44%] min-w-[720px]">
      <ModalHeader
        title="Running Options"
        description={`Configure launch options for ${target.title}`}
        onClose={handleClose}
      />
      <ModalBody>
        {isLaunching ? (
          <div className="flex h-[560px] flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium text-text-primary">Opening browser...</p>
              <p className="mt-1 text-xs text-text-secondary">
                Waiting for {target.title} to launch
              </p>
            </div>
          </div>
        ) : (
        <div className="h-[560px] space-y-5 overflow-y-auto">
          <div className="flex items-center gap-3 rounded-lg bg-input-background px-3 py-2.5">
            {renderTargetIcon()}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-text-primary">{target.title}</span>
                <span
                  className={cn(
                    'shrink-0 px-1 rounded text-[9px] font-semibold uppercase tracking-wide',
                    PLATFORM_STYLES[platform].chip,
                  )}
                >
                  {platformCfg.label}
                </span>
              </div>
              <div className="truncate font-mono text-xs text-text-secondary">
                {getTargetSubtitle()}
              </div>
            </div>
          </div>

          {platform === 'android' && !isRunning && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary/70">
                Device
              </h4>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDeviceDropdownOpen(!isDeviceDropdownOpen)}
                  className="flex w-full items-center justify-between rounded-lg bg-input-background px-3 py-2.5 text-left text-sm text-text-primary outline-none transition-colors hover:bg-dropdown-item-hover/60"
                >
                  <span className="truncate">{selectedDevice?.name || 'Select device'}</span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-text-secondary transition-transform',
                      isDeviceDropdownOpen && 'rotate-180',
                    )}
                  />
                </button>
                {isDeviceDropdownOpen && deviceList.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-input-background shadow-lg">
                    {deviceList.map((device) => (
                      <button
                        key={device.serial}
                        type="button"
                        onClick={() => {
                          setSelectedDeviceSerial(device.serial);
                          setIsDeviceDropdownOpen(false);
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-dropdown-item-hover',
                          selectedDeviceSerial === device.serial && 'bg-primary/10',
                        )}
                      >
                        {device.type === 'physical' ? (
                          <Smartphone className="h-3.5 w-3.5 text-text-secondary" />
                        ) : (
                          <Monitor className="h-3.5 w-3.5 text-text-secondary" />
                        )}
                        <span className="truncate">{device.name}</span>
                        <span className="ml-auto text-[10px] text-text-secondary">
                          {device.type === 'physical' ? 'USB' : 'VM'}
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

          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary/70">
              {isRunning ? 'Actions' : 'HTTPS capture method'}
            </h4>
            <div className="space-y-1.5">{renderMethodList()}</div>
          </div>

          {platform === 'web' && !isRunning && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary/70">
                Browser profile
              </h4>
              <ProfileSelect value={profilePath} onChange={setProfilePath} />
            </div>
          )}

          {(selectedAction === 'ebpf' || selectedAction === 'pcap') && !isRunning && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-secondary/70">
                <Lock className="h-3 w-3" />
                Sudo password
              </h4>
              <div className="flex items-center gap-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={sudoPassword}
                  onChange={(e) => setSudoPassword(e.target.value)}
                  placeholder="Enter your sudo password..."
                  className="h-[42px] w-full flex-1 rounded-lg border border-border bg-input-background px-3 text-sm text-text-primary outline-none transition-colors focus:border-primary"
                />
                <Button
                  variant="soft"
                  title={showPassword ? 'Hide' : 'Show'}
                  className="h-[42px] w-[42px] shrink-0 px-0 py-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-text-secondary" />
                  ) : (
                    <Eye className="h-4 w-4 text-text-secondary" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-text-secondary/70">
                Required for kernel-level traffic capture.
              </p>
            </div>
          )}
        </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button className={CANCEL_CLASS} onClick={handleClose} disabled={isLaunching}>
          Cancel
        </Button>
        <Button
          variant={selectedAction === 'stop' ? 'soft-error' : 'soft'}
          onClick={handleStart}
          disabled={!selectedAction || isLaunching}
        >
          {isRunning ? 'Apply' : 'Start'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default RunningOptionTargetModal;