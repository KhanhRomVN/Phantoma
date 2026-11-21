import { ArrowLeft, Globe, Laptop, MapPin, Timer } from 'lucide-react';
import { Favicon, getFaviconUrl } from '@renderer/utils/favicon';
import type { IpType, NetworkFootprint, SessionSite } from '../../../../types';
import { formatDateTime, timeAgo } from '../../../../utils/format';
import { formatDuration, formatTime } from '../../../../utils/footprint';
import { Pill } from '../../../common/StatusBadge';
import type { Tone } from '../../../../types/ui.types';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../../../constants/tone';

function Section({
  title,
  icon: Icon,
  tone = 'muted',
  children,
}: {
  title: string;
  icon?: LucideIcon;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md bg-card-background p-3.5">
      <header className="mb-2 flex items-center gap-2 text-xs font-semibold text-text-primary">
        {Icon && (
          <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', TONE_CLASS[tone].icon)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        {title}
      </header>
      {children}
    </section>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[28px] items-center justify-between gap-3 border-b border-border/40 py-1 last:border-b-0">
      <span className="shrink-0 text-xs text-text-secondary">{label}</span>
      <div className="min-w-0 text-right text-xs text-text-primary">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="py-6 text-center text-xs text-text-secondary">{text}</div>;
}

export const IP_TYPE: Record<IpType, { label: string; tone: Tone }> = {
  residential: { label: 'Residential', tone: 'success' },
  mobile: { label: '4G/5G', tone: 'info' },
  vpn: { label: 'VPN', tone: 'warn' },
  datacenter: { label: 'Datacenter', tone: 'error' },
};

interface FootprintDetailProps {
  footprint: NetworkFootprint;
  sites: SessionSite[];
  onBack: () => void;
}

export function FootprintDetail({ footprint: f, sites, onBack }: FootprintDetailProps) {
  const t = IP_TYPE[f.ipType];

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 rounded-md bg-text-secondary/10 px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to footprints
      </button>

      <Section title="Network" icon={MapPin} tone="info">
        <InfoRow label="IP address">
          <span className="font-mono">{f.ip}</span>
        </InfoRow>
        <InfoRow label="IP type">
          <Pill tone={t.tone} dot={false}>{t.label}</Pill>
        </InfoRow>
        <InfoRow label="Location">
          {f.city}, {f.country}
        </InfoRow>
        <InfoRow label="ISP">{f.isp}</InfoRow>
        <InfoRow label="Timezone">{f.timezone}</InfoRow>
      </Section>

      <Section title="Device" icon={Laptop} tone="primary">
        <InfoRow label="Device">{f.device}</InfoRow>
        <InfoRow label="Platform">{f.platform}</InfoRow>
        <InfoRow label="Browser">{f.browser}</InfoRow>
        <InfoRow label="Screen resolution">
          <span className="font-mono">{f.screen}</span>
        </InfoRow>
        <InfoRow label="Language">{f.language}</InfoRow>
        <InfoRow label="User agent">
          <span className="break-all font-mono text-[10px] text-text-secondary">{f.userAgent}</span>
        </InfoRow>
      </Section>

      <Section title="Usage" icon={Timer} tone="warn">
        <InfoRow label="First seen">
          {formatDateTime(f.at)} ({timeAgo(f.at)})
        </InfoRow>
        <InfoRow label="Last seen">
          {formatDateTime(f.lastSeenAt)} ({timeAgo(f.lastSeenAt)})
        </InfoRow>
        <InfoRow label="Sessions">{f.sessions}</InfoRow>
        <InfoRow label="Time used">{f.durationMin} min</InfoRow>
      </Section>

      <Section title="Websites on this footprint" icon={Globe} tone="success">
        {sites.length === 0 && <Empty text="No websites visited with this footprint." />}
        <ul className="flex flex-col">
          {sites.map((b) => (
            <li
              key={b.url}
              className="flex items-center justify-between gap-3 border-b border-border/40 py-2 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-text-secondary/10">
                  <Favicon
                    url={getFaviconUrl(b.url, 32)}
                    size={16}
                    className="rounded-sm"
                    fallbackIcon={<Globe className="h-4 w-4 text-text-secondary" />}
                  />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-xs text-text-primary">{b.title}</div>
                  <div className="truncate font-mono text-[10px] text-text-secondary">{b.url}</div>
                </div>
              </div>
              <div className="shrink-0 text-right text-[11px] text-text-secondary">
                <div>
                  {formatTime(b.firstAt)}
                  {b.firstAt !== b.lastAt && ` – ${formatTime(b.lastAt)}`}
                </div>
                <div>
                  {b.visits} visits{b.durationSec > 0 && ` • ${formatDuration(b.durationSec)}`}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

export default FootprintDetail;