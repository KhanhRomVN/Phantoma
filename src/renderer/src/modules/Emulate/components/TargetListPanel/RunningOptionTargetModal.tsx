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
// ── React ──
import React, { useState, useEffect } from 'react';

// ── UI ──
import { Square, Shield, Monitor, Smartphone, Syringe, Lock, LockOpen, Star, Zap, Network, Activity } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';
import { Button } from '@renderer/components/ui/Button';

// ── Constants ──
import { AppPlatform, PLATFORMS } from '../../constants/platforms';

// ── Types ──
import { TargetTab } from '../../types/target.types';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';
import { getTargetFavicon } from '.';

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
  onStartEbpf: (targetId: string, targetUrl?: string, useSandbox?: boolean) => void;
  onStartCdp: (targetId: string, targetUrl?: string, useSandbox?: boolean) => void;
  onStartPcap: (targetId: string, targetUrl?: string, useSandbox?: boolean) => void;
  onStartAppDebug: (targetId: string, targetUrl?: string, useSandbox?: boolean) => void;
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
  onStartEbpf,
  onStartCdp,
  onStartPcap,
  onStartAppDebug,
  onStopTarget,
  onRefreshDevices,
}: RunningOptionTargetModalProps) {
  const [selectedDeviceSerial, setSelectedDeviceSerial] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<
    'cdp' | 'mitm-normal' | 'mitm-env' | 'frida' | 'ebpf' | 'pcap' | 'app-debug' | 'stop' | null
  >(null);
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);
  const [useSandbox, setUseSandbox] = useState(
    platform === 'cli' && target?.title?.toLowerCase() === 'cline' ? false : true
  );
  const hasOpenedRef = React.useRef(false);

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

  const handleActionSelect = (action: 'cdp' | 'mitm-normal' | 'mitm-env' | 'frida' | 'ebpf' | 'pcap' | 'app-debug' | 'stop') => {
    setSelectedAction(action);
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
        } else if (platform === 'cli') {
          onStartMITM(target.id, target.url, false, undefined, useSandbox);
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
        onStartFrida(target.id, target.url, useSandbox);
        break;
      case 'ebpf':
        // Call IPC handler for eBPF
        onStartEbpf(target.id, target.executablePath || target.url, useSandbox);
        break;
      case 'cdp':
        // Call IPC handler for CDP proxy
        onStartCdp(target.id, target.executablePath || target.url, useSandbox);
        break;
      case 'pcap':
        // Call IPC handler for packet capture
        onStartPcap(target.id, target.executablePath || target.url, useSandbox);
        break;
      case 'app-debug':
        // Call IPC handler for app debug
        onStartAppDebug(target.id, target.executablePath || target.url, useSandbox);
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

  // Rating component for capture methods
  const StarRating = ({ rating, maxStars = 5 }: { rating: number; maxStars?: number }) => {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxStars }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              'w-2.5 h-2.5',
              i < rating ? 'fill-amber-400 text-amber-400' : 'text-border',
            )}
          />
        ))}
      </div>
    );
  };

  // Capture method metadata
  const captureMethodInfo = {
    'mitm-normal': {
      dataQuality: 5,
      authCompat: 2,
      complexity: 2,
      pros: ['Full plaintext access', 'Headers & body visible', 'Standard tool'],
      cons: ['Breaks signature validation', 'Auth may fail', 'SSL re-encryption'],
      limitations: 'Cannot preserve auth for apps with certificate pinning',
    },
    ebpf: {
      dataQuality: 5,
      authCompat: 5,
      complexity: 4,
      pros: ['Full plaintext access', 'Auth preserved', 'No SSL interference'],
      cons: ['Linux only', 'Requires root', 'Complex setup'],
      limitations: 'Kernel-level access required. Not available on all systems.',
    },
    frida: {
      dataQuality: 5,
      authCompat: 5,
      complexity: 3,
      pros: ['Full plaintext access', 'Auth preserved', 'Runtime inspection'],
      cons: ['Process injection', 'May trigger anti-debug', 'App-specific'],
      limitations: 'Requires injectable process. May not work with protected apps.',
    },
    pcap: {
      dataQuality: 1,
      authCompat: 5,
      complexity: 1,
      pros: ['Auth preserved', 'Simple setup', 'No app interference'],
      cons: ['Encrypted data only', 'No plaintext', 'Metadata only'],
      limitations: 'Can only capture: host, port, timing, packet sizes. No decryption.',
    },
    'app-debug': {
      dataQuality: 5,
      authCompat: 5,
      complexity: 1,
      pros: ['Full plaintext access', 'Auth preserved', 'Native app logs'],
      cons: ['App must support', 'Verbose output', 'Format varies'],
      limitations: 'Only works if app has debug/verbose logging mode.',
    },
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

    // CDP - only for web
    if (platform === 'web') {
      buttons.push(
        <button
          key="cdp"
          onClick={(e) => {
            e.stopPropagation();
            handleActionSelect('cdp');
          }}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg border transition-all',
            selectedAction === 'cdp'
              ? 'border-sky-400 bg-sky-400/10'
              : 'border-border hover:bg-dropdown-item-hover',
          )}
        >
          <div className="flex items-center gap-3">
            <Monitor className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">CDP</div>
              <div className="text-xs text-text-secondary mt-0.5">
                Chrome DevTools Protocol for debugging and automation
              </div>
            </div>
          </div>
        </button>,
      );
    }

    // MITM - all platforms
    const mitmLabel = platform === 'android' ? 'MITM (select device)' : 'MITM Proxy';
    const mitmInfo = captureMethodInfo['mitm-normal'];
    buttons.push(
      <button
        key="mitm-normal"
        onClick={(e) => {
          e.stopPropagation();
          handleActionSelect('mitm-normal');
        }}
        className={cn(
          'w-full text-left px-4 py-3 rounded-lg border transition-all',
          selectedAction === 'mitm-normal'
            ? 'border-amber-400 bg-amber-400/10'
            : 'border-border hover:bg-dropdown-item-hover',
        )}
      >
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">{mitmLabel}</span>
              {platform === 'cli' && (
                <>
                  <StarRating rating={mitmInfo.dataQuality} />
                  <span className="text-[9px] text-text-secondary">Data</span>
                  <StarRating rating={mitmInfo.authCompat} />
                  <span className="text-[9px] text-text-secondary">Auth</span>
                </>
              )}
            </div>
            <div className="text-xs text-text-secondary mt-0.5">
              {platform === 'cli'
                ? 'SSL interception - may break auth signatures'
                : 'Standard MITM proxy interception for traffic analysis'}
            </div>
            {platform === 'cli' && selectedAction === 'mitm-normal' && (
              <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                <div className="text-[10px] text-emerald-400">
                  ✓ {mitmInfo.pros.join(' • ')}
                </div>
                <div className="text-[10px] text-red-400">✗ {mitmInfo.cons.join(' • ')}</div>
                <div className="text-[10px] text-amber-400/70 italic">
                  ⚠ {mitmInfo.limitations}
                </div>
              </div>
            )}
          </div>
        </div>
      </button>,
    );

    // CDP Proxy - CLI only (Universal solution)
    if (platform === 'cli') {
      buttons.push(
        <button
          key="cdp"
          onClick={(e) => {
            e.stopPropagation();
            handleActionSelect('cdp');
          }}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg border transition-all',
            selectedAction === 'cdp'
              ? 'border-sky-400 bg-sky-400/10'
              : 'border-border hover:bg-dropdown-item-hover',
          )}
        >
          <div className="flex items-center gap-3">
            <Monitor className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">CDP Proxy</span>
                <StarRating rating={5} />
                <span className="text-[9px] text-text-secondary">Data</span>
                <StarRating rating={5} />
                <span className="text-[9px] text-text-secondary">Auth</span>
                <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-sky-500/20 text-sky-400 rounded">
                  RECOMMENDED
                </span>
              </div>
              <div className="text-xs text-text-secondary mt-0.5">
                Chrome-based proxy - universal, no root needed
              </div>
              {selectedAction === 'cdp' && (
                <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                  <div className="text-[10px] text-emerald-400">
                    ✓ Full plaintext access • Auth preserved • Cross-platform • No root required
                  </div>
                  <div className="text-[10px] text-red-400">
                    ✗ Slightly slower • Chrome dependency
                  </div>
                  <div className="text-[10px] text-amber-400/70 italic">
                    ⚠ Traffic proxied through Chrome browser. Best compatibility.
                  </div>
                </div>
              )}
            </div>
          </div>
        </button>,
      );
    }

    // eBPF - CLI only (Linux)
    if (platform === 'cli') {
      const ebpfInfo = captureMethodInfo.ebpf;
      buttons.push(
        <button
          key="ebpf"
          onClick={(e) => {
            e.stopPropagation();
            handleActionSelect('ebpf');
          }}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg border transition-all',
            selectedAction === 'ebpf'
              ? 'border-cyan-400 bg-cyan-400/10'
              : 'border-border hover:bg-dropdown-item-hover',
          )}
        >
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">eBPF Capture</span>
                <StarRating rating={ebpfInfo.dataQuality} />
                <span className="text-[9px] text-text-secondary">Data</span>
                <StarRating rating={ebpfInfo.authCompat} />
                <span className="text-[9px] text-text-secondary">Auth</span>
              </div>
              <div className="text-xs text-text-secondary mt-0.5">
                Kernel-level SSL capture - preserves auth
              </div>
              {selectedAction === 'ebpf' && (
                <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                  <div className="text-[10px] text-emerald-400">
                    ✓ {ebpfInfo.pros.join(' • ')}
                  </div>
                  <div className="text-[10px] text-red-400">✗ {ebpfInfo.cons.join(' • ')}</div>
                  <div className="text-[10px] text-amber-400/70 italic">
                    ⚠ {ebpfInfo.limitations}
                  </div>
                </div>
              )}
            </div>
          </div>
        </button>,
      );

      // Frida - CLI support
      const fridaInfo = captureMethodInfo.frida;
      buttons.push(
        <button
          key="frida"
          onClick={(e) => {
            e.stopPropagation();
            handleActionSelect('frida');
          }}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg border transition-all',
            selectedAction === 'frida'
              ? 'border-purple-400 bg-purple-400/10'
              : 'border-border hover:bg-dropdown-item-hover',
          )}
        >
          <div className="flex items-center gap-3">
            <Syringe className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">Frida Injection</span>
                <StarRating rating={fridaInfo.dataQuality} />
                <span className="text-[9px] text-text-secondary">Data</span>
                <StarRating rating={fridaInfo.authCompat} />
                <span className="text-[9px] text-text-secondary">Auth</span>
              </div>
              <div className="text-xs text-text-secondary mt-0.5">
                Runtime SSL hook - preserves auth
              </div>
              {selectedAction === 'frida' && (
                <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                  <div className="text-[10px] text-emerald-400">
                    ✓ {fridaInfo.pros.join(' • ')}
                  </div>
                  <div className="text-[10px] text-red-400">✗ {fridaInfo.cons.join(' • ')}</div>
                  <div className="text-[10px] text-amber-400/70 italic">
                    ⚠ {fridaInfo.limitations}
                  </div>
                </div>
              )}
            </div>
          </div>
        </button>,
      );

      // Packet Capture (tcpdump)
      const pcapInfo = captureMethodInfo.pcap;
      buttons.push(
        <button
          key="pcap"
          onClick={(e) => {
            e.stopPropagation();
            handleActionSelect('pcap');
          }}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg border transition-all',
            selectedAction === 'pcap'
              ? 'border-blue-400 bg-blue-400/10'
              : 'border-border hover:bg-dropdown-item-hover',
          )}
        >
          <div className="flex items-center gap-3">
            <Network className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">Packet Capture</span>
                <StarRating rating={pcapInfo.dataQuality} />
                <span className="text-[9px] text-text-secondary">Data</span>
                <StarRating rating={pcapInfo.authCompat} />
                <span className="text-[9px] text-text-secondary">Auth</span>
              </div>
              <div className="text-xs text-text-secondary mt-0.5">
                Network-level capture - metadata only
              </div>
              {selectedAction === 'pcap' && (
                <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                  <div className="text-[10px] text-emerald-400">
                    ✓ {pcapInfo.pros.join(' • ')}
                  </div>
                  <div className="text-[10px] text-red-400">✗ {pcapInfo.cons.join(' • ')}</div>
                  <div className="text-[10px] text-amber-400/70 italic">
                    ⚠ {pcapInfo.limitations}
                  </div>
                </div>
              )}
            </div>
          </div>
        </button>,
      );

      // App Debug Logging
      const appDebugInfo = captureMethodInfo['app-debug'];
      buttons.push(
        <button
          key="app-debug"
          onClick={(e) => {
            e.stopPropagation();
            handleActionSelect('app-debug');
          }}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg border transition-all',
            selectedAction === 'app-debug'
              ? 'border-green-400 bg-green-400/10'
              : 'border-border hover:bg-dropdown-item-hover',
          )}
        >
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-green-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">App Debug Mode</span>
                <StarRating rating={appDebugInfo.dataQuality} />
                <span className="text-[9px] text-text-secondary">Data</span>
                <StarRating rating={appDebugInfo.authCompat} />
                <span className="text-[9px] text-text-secondary">Auth</span>
              </div>
              <div className="text-xs text-text-secondary mt-0.5">
                Native app logging - if supported
              </div>
              {selectedAction === 'app-debug' && (
                <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                  <div className="text-[10px] text-emerald-400">
                    ✓ {appDebugInfo.pros.join(' • ')}
                  </div>
                  <div className="text-[10px] text-red-400">
                    ✗ {appDebugInfo.cons.join(' • ')}
                  </div>
                  <div className="text-[10px] text-amber-400/70 italic">
                    ⚠ {appDebugInfo.limitations}
                  </div>
                </div>
              )}
            </div>
          </div>
        </button>,
      );
    }

    // Remove MITM ENV Inject and Frida for CLI platform
    // MITM with ENV Inject - only for PC
    if (platform === 'pc') {
      buttons.push(
        <button
          key="mitm-env"
          onClick={(e) => {
            e.stopPropagation();
            handleActionSelect('mitm-env');
          }}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg border transition-all',
            selectedAction === 'mitm-env'
              ? 'border-green-400 bg-green-400/10'
              : 'border-border hover:bg-dropdown-item-hover',
          )}
        >
          <div className="flex items-center gap-3">
            <Syringe className="w-4 h-4 text-green-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">MITM</span>
                <span className="text-xs text-text-secondary">ENV Inject</span>
              </div>
              <div className="text-xs text-text-secondary mt-0.5">
                Intercept traffic with environment variable injection
              </div>
            </div>
          </div>
        </button>,
      );
    }

    // Frida - only for PC
    if (platform === 'pc') {
      buttons.push(
        <button
          key="frida"
          onClick={(e) => {
            e.stopPropagation();
            handleActionSelect('frida');
          }}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg border transition-all',
            selectedAction === 'frida'
              ? 'border-purple-400 bg-purple-400/10'
              : 'border-border hover:bg-dropdown-item-hover',
          )}
        >
          <div className="flex items-center gap-3">
            <Syringe className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Frida + DLL Injection</div>
              <div className="text-xs text-text-secondary mt-0.5">
                Dynamic instrumentation for runtime manipulation
              </div>
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
            
            {/* Sandbox toggle for CLI - integrated in target card */}
            {platform === 'cli' && !isRunning && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {useSandbox ? (
                      <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <LockOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-medium">
                        {useSandbox ? 'Sandbox Mode' : 'No Sandbox'}
                      </div>
                      <div className="text-[10px] text-text-secondary">
                        {useSandbox ? 'Isolated environment' : 'System environment'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setUseSandbox(!useSandbox)}
                    className={cn(
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                      useSandbox ? 'bg-emerald-500' : 'bg-border',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                        useSandbox ? 'translate-x-5' : 'translate-x-0.5',
                      )}
                    />
                  </button>
                </div>
              </div>
            )}
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
