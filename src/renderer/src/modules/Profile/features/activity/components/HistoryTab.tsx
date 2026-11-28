import { useMemo, useState } from 'react';
import { CalendarDays, Globe, Search } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Favicon, getFaviconUrl } from '@renderer/utils/favicon';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import type { BrowsingEntry, Profile } from '../../../shared/types';
import { formatDateTime } from '../../../shared/utils/format.util';
import { formatTime, toDayKey } from '../utils/footprint.util';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { TONE_CLASS } from '../../../shared/constants/tone.constants';
import type { Tone } from '../../../shared/types/ui.types';

function Section({
  title,
  icon: Icon,
  tone = 'muted',
  action,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  tone?: Tone;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md bg-card-background p-3.5">
      <header className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
          {Icon && (
            <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', TONE_CLASS[tone].icon)}>
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
          {title}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="py-6 text-center text-xs text-text-secondary">{text}</div>;
}

const dayLabel = (key: string): string => {
  if (key === toDayKey(new Date().toISOString())) return 'Today';
  if (key === toDayKey(new Date(Date.now() - 86400000).toISOString())) return 'Yesterday';
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
};

function HistoryCard({ entry }: { entry: BrowsingEntry }) {
  return (
    <li className="flex items-center gap-3 border-b border-border/40 py-2 last:border-b-0">
      <span className="w-10 shrink-0 font-mono text-[11px] tabular-nums text-text-secondary">
        {formatTime(entry.at)}
      </span>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-text-secondary/10">
        <Favicon
          url={getFaviconUrl(entry.url, 32)}
          size={16}
          className="rounded-sm"
          fallbackIcon={<Globe className="h-4 w-4 text-text-secondary" />}
        />
      </span>
      <Tooltip
        side="top"
        content={
          <div className="flex max-w-[280px] flex-col gap-0.5 text-[11px]">
            <span className="font-medium">{entry.title}</span>
            <span className="break-all font-mono">{entry.url}</span>
            <span>Visited {formatDateTime(entry.at)}</span>
          </div>
        }
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-text-primary">{entry.title}</div>
          <div className="truncate font-mono text-[10px] text-text-secondary">{entry.url}</div>
        </div>
      </Tooltip>
      <span className="shrink-0 text-[11px] text-text-secondary">{entry.visits} visits</span>
    </li>
  );
}

export function HistoryTab({ profile }: { profile: Profile }) {
  const [query, setQuery] = useState('');
  const [day, setDay] = useState<string>('all');

  const days = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of profile.browsing) {
      const k = toDayKey(b.at);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [profile.browsing]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, BrowsingEntry[]>();
    const sorted = [...profile.browsing].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    for (const b of sorted) {
      const k = toDayKey(b.at);
      if (day !== 'all' && k !== day) continue;
      if (q && !`${b.title} ${b.url}`.toLowerCase().includes(q)) continue;
      const arr = map.get(k);
      if (arr) arr.push(b);
      else map.set(k, [b]);
    }
    return [...map.entries()];
  }, [profile.browsing, query, day]);

  const chipClass = (active: boolean): string =>
    cn(
      'shrink-0 rounded-md px-2 py-1 text-[11px] transition-colors',
      active
        ? 'bg-text-secondary/15 text-text-primary'
        : 'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15',
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title or URL..."
          className="h-8 w-full rounded-md bg-text-secondary/10 pl-8 pr-2 text-xs text-text-primary outline-none placeholder:text-text-secondary focus:bg-text-secondary/15"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        <button type="button" onClick={() => setDay('all')} className={chipClass(day === 'all')}>
          All ({profile.browsing.length})
        </button>
        {days.map(([k, n]) => (
          <button key={k} type="button" onClick={() => setDay(k)} className={chipClass(day === k)}>
            {dayLabel(k)} ({n})
          </button>
        ))}
      </div>

      {groups.length === 0 && <Empty text="No history found." />}

      {groups.map(([k, list]) => (
        <Section
          key={k}
          title={dayLabel(k)}
          icon={CalendarDays}
          tone="success"
          action={<span className="text-[11px] text-text-secondary">{list.length} pages</span>}
        >
          <ul className="flex flex-col">
            {list.map((b) => (
              <HistoryCard key={b.id} entry={b} />
            ))}
          </ul>
        </Section>
      ))}
    </div>
  );
}

export default HistoryTab;