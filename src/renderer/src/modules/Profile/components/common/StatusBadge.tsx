import type { ReactNode } from 'react';
import { Globe } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Favicon, getFaviconUrl } from '@renderer/utils/favicon';
import type { ProfileStatus, ScriptStatus, ServiceStatus, SyncState } from '../../types';
import type { Tone } from '../../types/ui.types';
import { TAG_TONES, TONE_CLASS } from '../../constants/tone';
import { PROFILE_STATUS, SCRIPT_STATUS, SERVICE_STATUS, SYNC_STATUS } from '../../constants/status';
import { SERVICE_URL } from '../../constants/service';

export function hashTone(key: string): Tone {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TAG_TONES[h % TAG_TONES.length];
}

export function serviceUrl(name: string): string | undefined {
  return SERVICE_URL[name];
}

export function ServiceIcon({ name, size = 14, url: customUrl }: { name: string; size?: number; url?: string }) {
  const url = customUrl || serviceUrl(name);
  const fallback = <Globe className="shrink-0 text-text-secondary" style={{ width: size, height: size }} />;
  if (!url) return fallback;
  return (
    <Favicon
      url={getFaviconUrl(url, 32)}
      size={size}
      className="shrink-0 rounded-sm"
      fallbackIcon={fallback}
    />
  );
}

interface PillProps {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export function Pill({ tone = 'muted', dot = true, className, children }: PillProps) {
  const t = TONE_CLASS[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium',
        t.pill,
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />}
      {children}
    </span>
  );
}

export function ProfileStatusBadge({ status }: { status: ProfileStatus }) {
  const s = PROFILE_STATUS[status];
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  const s = SERVICE_STATUS[status];
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function SyncBadge({ state }: { state: SyncState }) {
  const s = SYNC_STATUS[state];
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function ScriptStatusBadge({ status }: { status: ScriptStatus }) {
  const s = SCRIPT_STATUS[status];
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function TagChip({ tag }: { tag: string }) {
  return (
    <span
      className={cn(
        'whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        TONE_CLASS[hashTone(tag)].pill,
      )}
    >
      {tag}
    </span>
  );
}