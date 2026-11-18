import { useEffect, useMemo, useState } from 'react';
import { MapPin, Repeat } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import type { BrowserSession, NetworkFootprint, Profile, SessionSite } from '../../../../types';
import { profileApi } from '../../../../services/profile-api.service';
import { formatDateTime, timeAgo } from '../../../../utils/format';
import { mergeSessionSites, sessionToFootprint } from '../../../../utils/footprint';
import { Pill } from '../../../common/StatusBadge';
import { TONE_CLASS } from '../../../../constants/tone';
import type { Tone } from '../../../../types/ui.types';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { FootprintDetail, IP_TYPE } from './FootprintDetail';

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

const signature = (f: NetworkFootprint): string =>
  [f.ip, f.device, f.platform, f.browser, f.screen, f.timezone].join('|');

function collapseTimeline(list: NetworkFootprint[]): { timeline: NetworkFootprint[]; alias: Map<string, string> } {
  const asc = [...list].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const out: NetworkFootprint[] = [];
  const alias = new Map<string, string>();
  for (const f of asc) {
    const last = out[out.length - 1];
    if (last && signature(last) === signature(f)) {
      out[out.length - 1] = {
        ...last,
        lastSeenAt: f.lastSeenAt,
        sessions: last.sessions + f.sessions,
        durationMin: last.durationMin + f.durationMin,
      };
      alias.set(f.id, last.id);
      continue;
    }
    out.push({ ...f, changed: out.length > 0 });
    alias.set(f.id, f.id);
  }
  return { timeline: out.reverse(), alias };
}

export function FootprintTab({ profile }: { profile: Profile }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<BrowserSession[]>([]);

  useEffect(() => {
    let cancelled = false;
    profileApi.sessions
      .list(profile.id)
      .then((list) => {
        if (!cancelled) setSessions(list);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  const footprints = useMemo(() => sessions.map(sessionToFootprint), [sessions]);
  const { timeline, alias } = useMemo(() => collapseTimeline(footprints), [footprints]);
  const sitesByFootprint = useMemo(() => {
    const groups = new Map<string, SessionSite[][]>();
    for (const s of sessions) {
      const id = alias.get(s.id) ?? s.id;
      groups.set(id, [...(groups.get(id) ?? []), s.sites ?? []]);
    }
    return groups;
  }, [sessions, alias]);
  const byId = useMemo(() => new Map(timeline.map((f) => [f.id, f])), [timeline]);
  const selected = selectedId ? byId.get(selectedId) : undefined;

  if (selected) {
    return (
      <FootprintDetail
        footprint={selected}
        sites={mergeSessionSites(sitesByFootprint.get(selected.id) ?? [])}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  const distinct = new Set(timeline.map((f) => f.ip)).size;
  const changes = Math.max(0, timeline.length - 1);

  const stats: { label: string; value: number; tone: Tone }[] = [
    { label: 'Distinct IPs', value: distinct, tone: 'info' },
    { label: 'Footprint changes', value: changes, tone: 'warn' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md bg-card-background px-3 py-2">
            <div className={cn('text-base font-semibold tabular-nums', TONE_CLASS[s.tone].pill.split(' ')[1])}>
              {s.value}
            </div>
            <div className="text-[11px] text-text-secondary">{s.label}</div>
          </div>
        ))}
      </div>

      <Section title="Footprint timeline" icon={MapPin} tone="info">
        {timeline.length === 0 && <Empty text="No footprints recorded yet." />}
        <ol className="relative ml-1.5 flex flex-col gap-1 border-l border-dashed border-border pl-4">
          {timeline.map((f, i) => {
            const t = IP_TYPE[f.ipType];
            return (
              <li key={f.id} className="relative">
                <span
                  className={cn(
                    'absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full',
                    f.changed ? 'bg-warn' : TONE_CLASS[t.tone].dot,
                  )}
                />
                <button
                  type="button"
                  onClick={() => setSelectedId(f.id)}
                  className="block w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-text-secondary/10"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-medium text-text-primary">{f.ip}</span>
                    <Pill tone={t.tone} dot={false}>{t.label}</Pill>
                    {i === 0 && <Pill tone="success" dot={false}>Current</Pill>}
                    {f.changed && (
                      <Pill tone="warn" dot={false}>
                        <Repeat className="h-3 w-3" />
                        Footprint changed
                      </Pill>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-text-secondary">
                    {f.city}, {f.country} • {f.isp} • {f.device} • {f.platform}
                  </div>
                  <div className="text-[11px] text-text-secondary/70">
                    Since {formatDateTime(f.at)} ({timeAgo(f.at)}) • {f.sessions} sessions
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </Section>

    </div>
  );
}

export default FootprintTab;