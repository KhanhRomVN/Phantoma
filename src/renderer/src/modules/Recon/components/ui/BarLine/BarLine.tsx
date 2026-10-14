import type { BarLineItem } from '../types';
import { cn } from '@renderer/shared/utils/cn';
import { resolveColor } from '../../../constants/colors';
import { withAlpha } from '../../targetType';

interface Props {
  items: BarLineItem[];
  barColor?: string;
  lineColor?: string;
}

const DEFAULT_BAR_COLOR = '#3686ff';
const DEFAULT_LINE_COLOR = '#22c55e';
const TICKS = 4;
const AXIS_W = 36;
const GAP = 8;
const fmt = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};

function Axis({ max, color, side }: { max: number; color: string; side: 'left' | 'right' }) {
  return (
    <div className="relative shrink-0 text-[10px]" style={{ width: AXIS_W, color }}>
      {Array.from({ length: TICKS + 1 }, (_, i) => (
        <span
          key={i}
          className={cn('absolute -translate-y-1/2 leading-none', side === 'left' ? 'right-0' : 'left-0')}
          style={{ top: `${(i / TICKS) * 100}%` }}
        >
          {fmt.format((max * (TICKS - i)) / TICKS)}
        </span>
      ))}
    </div>
  );
}

function Pill({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span
      className="flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px]"
      style={{ borderColor: withAlpha(color, 0.4), backgroundColor: withAlpha(color, 0.1), color }}
    >
      <span
        className={dashed ? 'w-3 h-0.5 rounded-full' : 'w-2 h-2 rounded-sm'}
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

export function BarLineLegend({
  items,
  options,
}: {
  items: BarLineItem[];
  options?: Record<string, any>;
}) {
  const hasLine = items.some((i) => i.line !== undefined);
  return (
    <>
      <Pill
        color={resolveColor(options?.barColor) ?? DEFAULT_BAR_COLOR}
        label={options?.barLabel ?? 'Requests'}
      />
      {hasLine && (
        <Pill
          color={resolveColor(options?.lineColor) ?? DEFAULT_LINE_COLOR}
          label={options?.lineLabel ?? 'Tokens'}
          dashed
        />
      )}
    </>
  );
}

export default function BarLine({ items, barColor, lineColor }: Props) {
  if (items.length === 0) return <div className="text-text-secondary italic p-2">Chưa có dữ liệu.</div>;

  const BAR_COLOR = resolveColor(barColor) ?? DEFAULT_BAR_COLOR;
  const LINE_COLOR = resolveColor(lineColor) ?? DEFAULT_LINE_COLOR;
  const n = items.length;
  const hasLine = items.some((i) => i.line !== undefined);
  const barMax = niceMax(Math.max(...items.map((i) => i.bar)));
  const lineMax = niceMax(Math.max(...items.map((i) => i.line ?? 0)));
  const step = Math.ceil(n / 12);

  const points = items.map((it, i) => ({
    x: ((i + 0.5) / n) * 100,
    y: 100 - ((it.line ?? 0) / lineMax) * 100,
  }));
  const linePath = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const mx = (prev.x + p.x) / 2;
      return `C ${mx} ${prev.y} ${mx} ${p.y} ${p.x} ${p.y}`;
    })
    .join(' ');
  const areaPath = `${linePath} L ${points[n - 1].x} 100 L ${points[0].x} 100 Z`;

  return (
    <div className="h-full flex flex-col gap-2 px-3 py-3">
      <div className="flex-1 min-h-[160px] flex" style={{ gap: GAP }}>
        <Axis max={barMax} color={BAR_COLOR} side="left" />
        <div className="relative flex-1">
          {Array.from({ length: TICKS + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute inset-x-0 border-t border-dashed border-border/40"
              style={{ top: `${(i / TICKS) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex">
            {items.map((it, i) => (
              <div key={i} className="flex-1 h-full flex items-end justify-center">
                <div
                  className="w-[70%] max-w-[44px] rounded-t-sm"
                  title={`${it.label}: ${it.bar.toLocaleString('en-US')}`}
                  style={{
                    height: `${(it.bar / barMax) * 100}%`,
                    background: `linear-gradient(to top, ${withAlpha(BAR_COLOR, 0.33)}, ${BAR_COLOR})`,
                  }}
                />
              </div>
            ))}
          </div>
          {hasLine && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d={areaPath} fill={LINE_COLOR} fillOpacity={0.08} />
              <path d={linePath} fill="none" stroke={LINE_COLOR} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            </svg>
          )}
        </div>
        {hasLine && <Axis max={lineMax} color={LINE_COLOR} side="right" />}
      </div>

      <div
        className="flex shrink-0 text-[10px] text-text-secondary"
        style={{ marginLeft: AXIS_W + GAP, marginRight: hasLine ? AXIS_W + GAP : 0 }}
      >
        {items.map((it, i) => (
          <span key={i} className="flex-1 text-center whitespace-nowrap">
            {i % step === 0 ? it.label : ''}
          </span>
        ))}
      </div>
    </div>
  );
}