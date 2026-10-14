import type { DonutItem } from '../types';
import { resolveColor } from '../../../constants/colors';

interface Props {
  items: DonutItem[];
  unit?: string;
}

const PALETTE = ['#3686ff', '#eab308', '#a855f7', '#22c55e', '#f97316', '#ec4899', '#06b6d4'];
const SIZE = 150;
const STROKE = 22;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

export default function Donut({ items, unit = 'requests' }: Props) {
  const total = items.reduce((sum, i) => sum + i.value, 0);
  if (items.length === 0 || total <= 0)
    return <div className="text-text-secondary italic p-2">Chưa có dữ liệu.</div>;

  const colors = items.map((it, i) => resolveColor(it.color) ?? PALETTE[i % PALETTE.length]);
  let offset = 0;

  return (
    <div className="h-full overflow-auto flex items-center gap-6 px-4 py-3">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          {items.map((it, i) => {
            const len = (it.value / total) * CIRC;
            const circle = (
              <circle
                key={i}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={colors[i]}
                strokeWidth={STROKE}
                strokeDasharray={`${len} ${CIRC - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-text-primary leading-none">
            {total.toLocaleString('en-US')}
          </span>
          <span className="text-[11px] text-text-secondary mt-1">{unit}</span>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        {items.map((it, i) => {
          const pct = Math.round((it.value / total) * 100);
          return (
            <div key={i} className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: colors[i] }} />
                <span className="text-sm font-semibold text-text-primary truncate flex-1">{it.label}</span>
                <span className="text-sm font-bold text-text-primary">{pct}%</span>
              </div>
              <div className="h-1 mt-1.5 rounded-full bg-border/40 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colors[i] }} />
              </div>
              {it.note && <div className="text-[11px] text-text-secondary text-right mt-1">{it.note}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}