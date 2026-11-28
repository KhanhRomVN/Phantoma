/**
 * Cột trái của LaunchTargetModal: thông tin target và phần chọn theo
 * platform (browser + profile cho web, device cho mobile, executable
 * cho PC app/CLI).
 */

import { Check, FolderOpen, Monitor, Smartphone } from 'lucide-react';

import { cn } from '@renderer/utils/cn';
import { Pill } from '@renderer/components/common/LaunchConfig/picker/ConfigBits';

import {
  LaunchPlatform,
  LAUNCH_PLATFORMS,
} from '@renderer/modules/Emulate/constants/launch-platforms';
import type { TargetTab } from '@renderer/modules/Emulate/types/target.types';
import { getTargetFavicon } from '../index';
import { ServiceIcon } from '@renderer/modules/Profile/features/services/components/ServiceBadges';
import { Fork } from '@renderer/modules/Profile/shared/types/browser.types';

const CHROME_URL = 'https://www.google.com/intl/vi_vn/chrome/';
const LABEL_CLASS = 'text-[10px] font-semibold uppercase tracking-wider text-text-secondary';

export interface DeviceItem {
  name: string;
  serial: string;
  type: string;
}

interface TargetPanelProps {
  target: TargetTab;
  platform: LaunchPlatform;
  isRunning: boolean;
  forks: Fork[];
  loadingForks: boolean;
  browserId: string;
  onBrowserChange: (id: string) => void;

  deviceList: DeviceItem[];
  deviceSerial: string;
  onDeviceChange: (serial: string) => void;
}

function CheckMark() {
  return (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-white">
      <Check className="h-2.5 w-2.5" />
    </span>
  );
}

function OptionButton({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'border-dashed border-primary'
          : 'border-transparent bg-text-secondary/5 hover:bg-text-secondary/10',
      )}
    >
      {children}
      {active && <CheckMark />}
    </button>
  );
}

export function TargetPanel({
  target,
  platform,
  isRunning,
  forks,
  loadingForks,
  browserId,
  onBrowserChange,

  deviceList,
  deviceSerial,
  onDeviceChange,
}: TargetPanelProps) {
  const PlatformIcon = LAUNCH_PLATFORMS[platform].icon;
  const installedCount = forks.filter((f) => f.installed).length;

  const subtitle =
    platform === 'website'
      ? target.url
      : platform === 'application' || platform === 'terminal'
        ? target.executablePath
        : target.emulatorSerial;

  const renderTargetIcon = () => {
    const src =
      platform === 'application' && target.icon
        ? `media://${target.icon}`
        : platform === 'application'
          ? null
          : getTargetFavicon(target);
    if (platform !== 'android' && src) {
      return (
        <img
          src={src}
          alt={target.title}
          className="h-7 w-7 rounded object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }
    return <PlatformIcon className="h-5 w-5 text-text-secondary" />;
  };

  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/60">
          {renderTargetIcon()}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-text-primary">{target.title}</span>
          {subtitle && (
            <span className="truncate font-mono text-[11px] text-text-secondary">{subtitle}</span>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {platform === 'website' && !isRunning && (
          <>
            <div className="flex flex-col gap-2">
              <span className={LABEL_CLASS}>Browser</span>
              <OptionButton
                active={browserId === 'chrome'}
                onClick={() => onBrowserChange('chrome')}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/60">
                  <ServiceIcon name="Google Chrome" url={CHROME_URL} size={20} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs font-semibold text-text-primary">
                    Google Chrome
                  </span>
                  <span className="truncate text-[11px] text-text-secondary">
                    Real device footprint
                  </span>
                </span>
              </OptionButton>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className={LABEL_CLASS}>Chromium forks</span>
                <span className="text-[10px] text-text-secondary">{installedCount} installed</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {!loadingForks && forks.length === 0 && (
                  <span className="rounded-xl bg-text-secondary/5 px-3 py-2.5 text-[11px] text-text-secondary">
                    No forks available
                  </span>
                )}
                {forks.map((f) => (
                  <OptionButton
                    key={f.id}
                    active={browserId === f.id}
                    disabled={!f.installed}
                    title={f.installed ? `${f.name} — ${f.desc}` : `${f.name} is not installed`}
                    onClick={() => onBrowserChange(f.id)}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/60">
                      <ServiceIcon name={f.name} url={f.url} size={18} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="min-w-0 truncate text-xs font-medium text-text-primary">
                          {f.name}
                        </span>
                        <Pill tone={f.tone}>{f.badge}</Pill>
                      </span>
                      <span className="truncate font-mono text-[10px] text-text-secondary/70">
                        {f.installed ? `v${f.version ?? '?'}` : 'Not installed'}
                      </span>
                    </span>
                  </OptionButton>
                ))}
              </div>
            </div>
          </>
        )}

        {platform === 'android' && !isRunning && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className={LABEL_CLASS}>Device</span>
              <span className="text-[10px] text-text-secondary">{deviceList.length} found</span>
            </div>
            {deviceList.length === 0 && (
              <span className="rounded-xl bg-text-secondary/5 px-3 py-2.5 text-[11px] text-text-secondary">
                No devices found. Please connect a device.
              </span>
            )}
            {deviceList.map((d) => (
              <OptionButton
                key={d.serial}
                active={deviceSerial === d.serial}
                onClick={() => onDeviceChange(d.serial)}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/60 text-text-secondary">
                  {d.type === 'physical' ? (
                    <Smartphone className="h-4 w-4" />
                  ) : (
                    <Monitor className="h-4 w-4" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs font-medium text-text-primary">{d.name}</span>
                  <span className="truncate font-mono text-[10px] text-text-secondary">
                    {d.serial}
                  </span>
                </span>
                <Pill tone="muted">{d.type === 'physical' ? 'USB' : 'VM'}</Pill>
              </OptionButton>
            ))}
          </div>
        )}

        {(platform === 'application' || platform === 'terminal') && (
          <div className="flex flex-col gap-2">
            <span className={LABEL_CLASS}>Executable</span>
            <div className="flex min-w-0 items-center gap-2 rounded-xl bg-text-secondary/5 px-3 py-2.5">
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
              <span
                title={target.executablePath}
                className="min-w-0 break-all font-mono text-[11px] text-text-primary"
              >
                {target.executablePath || '—'}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default TargetPanel;
