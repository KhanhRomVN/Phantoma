import type { ReactNode } from 'react';
import { Wifi, WifiOff, Loader2, Pause, Download, AlertTriangle, Lock, Wrench } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import type { DeviceStatus, ScriptStatus } from '../../types';
import type { Tone } from '../../constants/tone';
import { TONE_CLASS } from '../../constants/tone';
import { DEVICE_STATUS, SCRIPT_STATUS } from '../../constants/status';

const STATUS_ICON: Record<DeviceStatus, typeof Wifi> = {
  online: Wifi,
  busy: Loader2,
  idle: Pause,
  updating: Download,
  offline: WifiOff,
  error: AlertTriangle,
  locked: Lock,
  maintenance: Wrench,
};

interface PillProps {
  tone?: Tone;
  dot?: boolean;
  pulse?: boolean;
  spin?: boolean;
  className?: string;
  children: ReactNode;
}

export function Pill({ tone = 'muted', dot = true, pulse, spin, className, children }: PillProps) {
  const t = TONE_CLASS[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium',
        t.pill,
        className,
      )}
    >
      {pulse ? (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', t.dot)}
          />
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', t.dot)} />
        </span>
      ) : dot ? (
        <span className={cn('h-1.5 w-1.5 rounded-full', t.dot, spin && 'animate-spin')} />
      ) : null}
      {children}
    </span>
  );
}

export function DeviceStatusBadge({ status, small }: { status: DeviceStatus; small?: boolean }) {
  const s = DEVICE_STATUS[status];
  const Icon = STATUS_ICON[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md text-[11px] font-medium',
        TONE_CLASS[s.tone].pill,
        small ? 'px-1.5 py-px' : 'px-2 py-0.5',
      )}
    >
      {s.pulse ? (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
              TONE_CLASS[s.tone].dot,
            )}
          />
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', TONE_CLASS[s.tone].dot)} />
        </span>
      ) : (
        <Icon className={cn('h-3 w-3', s.spin && 'animate-spin')} />
      )}
      {s.label}
    </span>
  );
}

export function ScriptStatusBadge({ status }: { status: ScriptStatus }) {
  const s = SCRIPT_STATUS[status];
  return <Pill tone={s.tone} spin={s.spin}>{s.label}</Pill>;
}

export function TagChip({ tag }: { tag: string }) {
  const tones: Tone[] = ['primary', 'info', 'success', 'warn'];
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  const tone = tones[h % tones.length];
  return (
    <span
      className={cn(
        'whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        TONE_CLASS[tone].pill,
      )}
    >
      #{tag}
    </span>
  );
}