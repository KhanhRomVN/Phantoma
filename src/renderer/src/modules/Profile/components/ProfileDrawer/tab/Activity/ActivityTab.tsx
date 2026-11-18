import { Laptop, PlayCircle, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import type { Profile } from '../../../../types';
import { formatDateTime, formatDuration, timeAgo } from '../../../../utils/format';
import { Pill, ScriptStatusBadge } from '../../../common/StatusBadge';
import { SCRIPT_STATUS } from '../../../../constants/status';
import { TONE_CLASS } from '../../../../constants/tone';
import type { Tone } from '../../../../types/ui.types';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

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

function Empty({ text }: { text: string }) {
  return <div className="py-6 text-center text-xs text-text-secondary">{text}</div>;
}

export function ActivityTab({ profile }: { profile: Profile }) {
  const runs = profile.scripts.length;
  const ok = profile.scripts.filter((s) => s.status === 'success').length;
  const trusted = profile.devices.filter((d) => d.trusted).length;
  const rate = runs === 0 ? 0 : Math.round((ok / runs) * 100);

  const stats: { label: string; value: string; tone: Tone }[] = [
    { label: 'Script runs', value: String(runs), tone: 'info' },
    { label: 'Success rate', value: runs === 0 ? '-' : `${rate}%`, tone: rate >= 80 ? 'success' : rate >= 50 ? 'warn' : 'error' },
    { label: 'Trusted devices', value: `${trusted}/${profile.devices.length}`, tone: trusted === profile.devices.length ? 'success' : 'warn' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md bg-card-background px-3 py-2">
            <div className={cn('text-base font-semibold tabular-nums', TONE_CLASS[s.tone].pill.split(' ')[1])}>
              {s.value}
            </div>
            <div className="text-[11px] text-text-secondary">{s.label}</div>
          </div>
        ))}
      </div>

      <Section title="Script run history" icon={PlayCircle} tone="info">
        {profile.scripts.length === 0 && <Empty text="No scripts have run yet." />}
        <ul className="flex flex-col">
          {profile.scripts.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 border-b border-border/40 py-2 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                    TONE_CLASS[SCRIPT_STATUS[s.status].tone].icon,
                  )}
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-text-primary">{s.scriptName}</div>
                  <div className="text-[11px] text-text-secondary">
                    <Tooltip content={formatDateTime(s.at)} side="top">
                      <span>{timeAgo(s.at)}</span>
                    </Tooltip>{' '}
                    • {formatDuration(s.durationSec)}
                    {s.note && <span className="text-error"> • {s.note}</span>}
                  </div>
                </div>
              </div>
              <ScriptStatusBadge status={s.status} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Activity by device" icon={Laptop} tone="warn">
        {profile.devices.length === 0 && <Empty text="No devices yet." />}
        <ul className="flex flex-col">
          {profile.devices.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 border-b border-border/40 py-2 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                    TONE_CLASS[d.trusted ? 'success' : 'warn'].icon,
                  )}
                >
                  {d.trusted ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldQuestion className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-text-primary">{d.device}</div>
                  <div className="truncate text-[11px] text-text-secondary">
                    {d.os} • {d.browser} • {d.action}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Pill tone={d.trusted ? 'success' : 'warn'} dot={false}>
                  {d.trusted ? 'Trusted' : 'Unknown'}
                </Pill>
                <span className="text-[11px] text-text-secondary">{timeAgo(d.at)}</span>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

export default ActivityTab;