import type { TimelineEvent } from '../types';
import { resolveColor } from '../../../constants/colors';

interface Props {
  events: TimelineEvent[];
}

const COLOR_CURRENT = '#f97316';
const COLOR_PAST = '#a855f7';

const TONE_COLORS: Record<string, string> = {
  ok: '#22c55e',
  warn: '#eab308',
  danger: '#ef4444',
  info: '#3b82f6',
};

/** Ưu tiên `{color=...}`, rồi `{tone=...}`; không có thì cam cho mục hiện tại ('nay'), tím cho mục cũ. */
const colorOf = (item: TimelineEvent) =>
  resolveColor(item.color) ?? (item.tone ? TONE_COLORS[item.tone] : undefined) ?? (item.current ? COLOR_CURRENT : COLOR_PAST);

export default function Timeline({ events }: Props) {
  if (events.length === 0) return <div className="text-text-secondary italic p-2">Không có mốc thời gian.</div>;

  return (
    <div className="h-full overflow-auto px-4 py-3">
      {events.map((item, idx) => {
        const color = colorOf(item);
        const next = events[idx + 1];
        const lineEnd = next ? colorOf(next) : 'transparent';
        const isLast = idx === events.length - 1;
        return (
          <div key={idx} className={`relative pl-7 ${isLast ? '' : 'pb-5'}`}>
            <span
              className="absolute left-[6px] top-[19px] -bottom-[3px] w-0.5 rounded-full"
              style={{ background: `linear-gradient(to bottom, ${color}, ${lineEnd})` }}
            />
            <span
              className="absolute left-0 top-[3px] w-3.5 h-3.5 rounded-full border-2 bg-card-background z-10"
              style={{ borderColor: color }}
            />
            <div className="font-mono text-[11px] leading-tight text-text-secondary/70">{item.date}</div>
            <div className="text-sm font-semibold text-text-primary mt-0.5">{item.title}</div>
            {item.note && <div className="text-[11px] text-text-secondary mt-0.5">{item.note}</div>}
          </div>
        );
      })}
    </div>
  );
}