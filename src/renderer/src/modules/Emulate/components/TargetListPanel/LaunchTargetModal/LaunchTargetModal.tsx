/**
 * Modal start/stop target gồm 3 cột: thông tin target (browser, profile,
 * device), cấu hình launch (capture method, proxy, footprint) và detail
 * (proxy/fingerprint cho web & PC, device cho mobile).
 */

import { useEffect, useRef, useState } from 'react';
import { Play, Rocket, X } from 'lucide-react';

import { Button } from '@renderer/components/ui/Button';
import { cn } from '@renderer/utils/cn';
import { ModalShell } from '@renderer/components/common/LaunchConfig/ModalShell';
import { Favicon, getFaviconUrl } from '@renderer/utils/favicon';
import { DetailPanel } from '@renderer/components/common/LaunchConfig/detail/DetailPanel';
import { TONE_CLASS } from '@renderer/components/common/LaunchConfig/constants/tone';
import type { DetailTab, ProxyItem } from '@renderer/components/common/LaunchConfig/types';
import type { FootprintPreset } from '@renderer/services/fingerprint-generator';

import { LaunchPlatform } from '@renderer/modules/Emulate/constants/launch-platforms';
import { TargetTab } from '@renderer/modules/Emulate/types/target.types';
import { emulateApi } from '@renderer/modules/Emulate/services/emulate-api.service';
import { secureStorage } from '@renderer/modules/Emulate/services/secure-storage.service';
import { MethodPanel, METHOD_RGB, TONE_STYLE, getMethodTone } from './MethodPanel';
import type { CaptureMethodMeta } from './MethodPanel';
import { CliInfoPanel } from './CliInfoPanel';
import { MobileInfoPanel } from './MobileInfoPanel';
import { TargetPanel } from './TargetPanel';
import type { DeviceItem } from './TargetPanel';
import { logger } from '@renderer/modules/Emulate/utils/logger.util';
import { useDeviceFingerprint } from '@renderer/modules/Profile/features/browser/hooks/useDeviceFingerprint';
import { Fork } from '@renderer/modules/Profile/shared/types';
import { profileApi } from '@renderer/modules/Profile/shared/api/profile.api';

const CANCEL_CLASS =
  'bg-primary/10 text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30 disabled:hover:bg-primary/10';
const CONFIRM_CLASS = 'bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30';
const STOP_CLASS = 'bg-error/10 text-error hover:bg-error/20 active:bg-error/30';

export interface LaunchExtras {
  browser: string;
  proxy: ProxyItem | null;
  footprint: FootprintPreset | null;
}

interface LaunchTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: TargetTab | null;
  platform: LaunchPlatform | null;
  isRunning: boolean;
  deviceList: DeviceItem[];
  onStartCDP: (
    targetId: string,
    targetUrl?: string,
    userDataDir?: string,
    extras?: LaunchExtras,
  ) => Promise<void> | void;
  onStartMITM: (
    targetId: string,
    targetUrl?: string,
    useEnvInject?: boolean,
    deviceSerial?: string,
    useSandbox?: boolean,
    extras?: LaunchExtras,
  ) => void;
  onStartFrida: (targetId: string, targetUrl?: string, useSandbox?: boolean) => void;
  onStartEbpf: (
    targetId: string,
    targetUrl?: string,
    useSandbox?: boolean,
    sudoPassword?: string,
  ) => void;
  onStartCdp: (targetId: string, targetUrl?: string, useSandbox?: boolean) => void;
  onStartPcap: (
    targetId: string,
    targetUrl?: string,
    useSandbox?: boolean,
    sudoPassword?: string,
  ) => void;
  onStartAppDebug: (targetId: string, targetUrl?: string, useSandbox?: boolean) => void;
  onStopTarget: () => void;
  onRefreshDevices?: () => Promise<void>;
}

export function LaunchTargetModal({
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
}: LaunchTargetModalProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [deviceSerial, setDeviceSerial] = useState('');
  const [methods, setMethods] = useState<CaptureMethodMeta[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [sudoPassword, setSudoPassword] = useState('');
  const [profilePath, setProfilePath] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [browserId, setBrowserId] = useState('chrome');
  const [forks, setForks] = useState<Fork[]>([]);
  const [loadingForks, setLoadingForks] = useState(false);
  const [proxy, setProxy] = useState<ProxyItem | null>(null);
  const [preset, setPreset] = useState<FootprintPreset | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('proxy');

  const hasOpenedRef = useRef(false);

  const isWeb = platform === 'website';
  const isMobile = platform === 'android';
  const isCli = platform === 'terminal' || platform === 'application'; // ASSUMED: app desktop dùng chung layout + luồng eBPF với CLI
  const isChrome = browserId === 'chrome';
  const showProxy = !isRunning && !isMobile && !isCli && (!isWeb || !isChrome);
  const showFootprint = !isRunning && isWeb && !isChrome;
  const devicePreset = useDeviceFingerprint(isOpen && !!platform && !isMobile && !isCli);

  useEffect(() => {
    if (!platform || !isOpen) return;
    let cancelled = false;
    setLoadingMethods(true);
    emulateApi
      .getCaptureMethods(platform as any)
      .then((response) => {
        if (cancelled) return;
        const list = response?.methods;
        setMethods(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        logger.error('[LaunchTargetModal] Failed to load capture methods:', err);
        if (!cancelled) setMethods([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingMethods(false);
      });
    return () => {
      cancelled = true;
    };
  }, [platform, isOpen]);

  useEffect(() => {
    if (!isOpen || !isWeb) return;
    let alive = true;
    setLoadingForks(true);
    profileApi.browser
      .forks()
      .then((list) => alive && setForks(list as Fork[]))
      .catch(() => alive && setForks([]))
      .finally(() => alive && setLoadingForks(false));
    return () => {
      alive = false;
    };
  }, [isOpen, isWeb]);

  useEffect(() => {
    if (isOpen) {
      if (!hasOpenedRef.current) {
        hasOpenedRef.current = true;
        setSelectedAction(null);
        setDeviceSerial(deviceList.length > 0 ? deviceList[0].serial : '');
        setBrowserId('chrome');
        setProxy(null);
        setPreset(null);
        setDetailTab('proxy');
        if (onRefreshDevices && platform === 'android') onRefreshDevices();
        secureStorage.getSudoPassword().then((savedPw) => {
          if (savedPw) setSudoPassword(savedPw);
        });
      }
    } else {
      hasOpenedRef.current = false;
    }
  }, [isOpen, platform, deviceList, onRefreshDevices]);

  if (!target || !platform) return null;

  const handleClose = (): void => {
    if (!isLaunching) onClose();
  };

  const handleStart = async (): Promise<void> => {
    if (!selectedAction) return;
    if (selectedAction === 'stop') {
      onStopTarget();
      onClose();
      return;
    }
    const picked = methods.find((m) => m.id === selectedAction);
    if (!picked || picked.implemented === false) return;

    if ((selectedAction === 'ebpf' || selectedAction === 'pcap') && sudoPassword) {
      await secureStorage.setSudoPassword(sudoPassword);
    }

    const extras: LaunchExtras = {
      browser: browserId,
      proxy: showProxy ? proxy : null,
      footprint: showFootprint ? preset : null,
    };

    switch (selectedAction) {
      case 'cdp':
        if (platform === 'terminal') {
          onStartCdp(target.id, target.executablePath || target.url);
        } else {
          setIsLaunching(true);
          try {
            await onStartCDP(target.id, target.url, profilePath || undefined, extras);
          } finally {
            setIsLaunching(false);
          }
        }
        break;
      case 'mitm-normal':
        if (platform === 'android') {
          onStartMITM(target.id, target.url, false, deviceSerial || undefined, undefined, extras);
        } else if (platform === 'terminal') {
          onStartMITM(target.id, undefined, false, undefined, undefined, extras);
        } else {
          onStartMITM(target.id, target.url, false, undefined, undefined, extras);
        }
        break;
      case 'mitm-env':
        if (platform === 'android') {
          onStartMITM(target.id, target.url, true, deviceSerial || undefined, undefined, extras);
        } else {
          onStartMITM(target.id, target.url, true, undefined, undefined, extras);
        }
        break;
      case 'frida':
        onStartFrida(target.id, platform === 'terminal' ? undefined : target.url);
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

  const selectedMethod = methods.find((m) => m.id === selectedAction);
  const methodTone = TONE_STYLE[getMethodTone(selectedAction ?? '')];
  const notImplemented = selectedMethod?.implemented === false;

  const details = isRunning
    ? []
    : [
        ...(isWeb
          ? [isChrome ? 'Chrome' : (forks.find((f) => f.id === browserId)?.name ?? 'Chromium')]
          : []),
        ...(showProxy ? [proxy ? `${proxy.protocol} ${proxy.host}` : 'Direct'] : []),
        ...(showFootprint ? [preset?.name ?? 'System footprint'] : []),
      ];

  const detailPreset = showFootprint && preset ? preset : devicePreset;
  const siteUrl = target.url && /^https?:\/\//i.test(target.url) ? target.url : undefined;
  const faviconSrc =
    platform === 'application'
      ? target.icon
        ? `media://${target.icon}`
        : undefined
      : target.favicon || (siteUrl ? getFaviconUrl(siteUrl, 64) : undefined);

  return (
    <ModalShell
      open={isOpen}
      onClose={handleClose}
      busy={isLaunching}
      width={isCli ? 1560 : '96vw'}
      left={
        isCli ? undefined : (
          <TargetPanel
            target={target}
            platform={platform}
            isRunning={isRunning}
            forks={forks}
            loadingForks={loadingForks}
            browserId={browserId}
            onBrowserChange={setBrowserId}

            deviceList={deviceList}
            deviceSerial={deviceSerial}
            onDeviceChange={setDeviceSerial}
          />
        )
      }
      header={
        <>
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                !faviconSrc && TONE_CLASS.primary.icon,
              )}
            >
              <Favicon
                url={faviconSrc}
                size={28}
                className="rounded-md"
                fallbackIcon={<Rocket className="h-4 w-4" />}
              />
            </span>
            <div className="flex min-w-0 flex-col">
              <h2 className="text-sm font-semibold text-text-primary">Running Options</h2>
              <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-text-secondary">
                <span className="truncate">{target.title}</span>
                {siteUrl && <span className="truncate text-text-secondary/60">{siteUrl}</span>}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-error/15 hover:text-error"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      }
      footer={
        <>
          <div className="flex min-w-0 items-center gap-2 text-[11px] text-text-secondary">
            {selectedAction ? (
              <>
                <span className={cn('shrink-0 rounded-md px-2 py-1 font-medium', methodTone.chip)}>
                  {selectedAction === 'stop'
                    ? 'Stop target'
                    : (selectedMethod?.label ?? selectedAction)}
                </span>
                {details.length > 0 && <span className="truncate">{details.join(' · ')}</span>}
              </>
            ) : (
              <span>
                {notImplemented
                  ? 'This method is not available yet'
                  : 'Select a capture method to continue'}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              className={cn('h-9 rounded-md', CANCEL_CLASS)}
              onClick={handleClose}
              disabled={isLaunching}
            >
              Cancel
            </Button>
            <Button
              className={cn(
                'h-9 rounded-md',
                selectedAction === 'stop' ? STOP_CLASS : CONFIRM_CLASS,
              )}
              onClick={() => void handleStart()}
              disabled={!selectedAction || isLaunching || notImplemented}
            >
              <Play className="h-3.5 w-3.5" />
              {isLaunching ? 'Opening...' : isRunning ? 'Apply' : 'Start'}
            </Button>
          </div>
        </>
      }
      right={
        isMobile ? (
          <MobileInfoPanel
            target={target}
            device={deviceList.find((d) => d.serial === deviceSerial)}
          />
        ) : isCli ? (
          <CliInfoPanel target={target} method={selectedMethod} />
        ) : (
          <DetailPanel
            tab={detailTab}
            onTabChange={setDetailTab}
            proxy={showProxy ? proxy : null}
            preset={detailPreset}
          />
        )
      }
    >
      <MethodPanel
        isRunning={isRunning}
        loadingMethods={loadingMethods}
        methods={methods}
        selectedAction={selectedAction}
        onSelectAction={setSelectedAction}
        showProfile={isWeb && !isRunning}
        profilePath={profilePath}
        onProfileChange={setProfilePath}
        showProxy={showProxy}
        showFootprint={showFootprint}
        proxy={proxy}
        onProxyChange={setProxy}
        preset={preset}
        onPresetChange={setPreset}
        sudoPassword={sudoPassword}
        onSudoPasswordChange={setSudoPassword}
      />
    </ModalShell>
  );
}

export { METHOD_RGB };
export default LaunchTargetModal;
