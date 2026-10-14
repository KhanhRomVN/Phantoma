import { icons } from 'lucide-react';
import type { StatItem } from '../types';
import { resolveColor } from '../../../constants/colors';

interface Props {
  items: StatItem[];
}

const TONE_COLOR: Record<string, string> = {
  ok: '#22c55e',
  warn: '#eab308',
  danger: '#f87171',
  info: '#3686ff',
  neutral: '#9ca3af',
};

const W = 84;
const H = 28;

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data
    .map((v, i) => {
      const x = (i * W) / (data.length - 1);
      const y = H - 2 - ((v - min) / (max - min || 1)) * (H - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute right-2 bottom-2">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Stat({ items }: Props) {
  if (items.length === 0)
    return <div className="text-text-secondary italic p-2">Chưa có dữ liệu.</div>;

  return (
    <div
      className="h-full overflow-auto p-3 grid gap-3 content-start"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}
    >
      {items.map((it, i) => {
        const color = resolveColor(it.color) ?? TONE_COLOR[it.tone ?? ''] ?? '#3686ff';
        const Icon = it.icon ? icons[it.icon as keyof typeof icons] : undefined;
        return (
          <div
            key={i}
            className="relative overflow-hidden rounded-lg border border-border bg-card-background-hover p-3 transition-colors hover:border-primary/50"
          >
            <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: color }} />
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span className="truncate">{it.label}</span>
              {Icon && <Icon className="w-4 h-4 shrink-0" style={{ color }} strokeWidth={2} />}
            </div>
            <div className="text-[28px] font-bold leading-tight mt-1.5 text-text-primary">{it.value}</div>
            {it.note && (
              <div className="text-[11px] text-text-secondary mt-0.5 pr-24 truncate">{it.note}</div>
            )}
            {it.spark && <Sparkline data={it.spark} color={color} />}
          </div>
        );
      })}
    </div>
  );
}