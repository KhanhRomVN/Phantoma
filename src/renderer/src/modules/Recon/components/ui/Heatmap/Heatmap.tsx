import { useMemo } from 'react';
import type { HeatmapCell } from '../types';
import { resolveColor } from '../../../constants/colors';

interface Props {
  cells: HeatmapCell[];
  color?: string;
}

const WEEK_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const COLS = 24;
const LEVELS = [0, 25, 50, 75, 100];

function mix(color: string, pct: number): string {
  return pct === 0
    ? 'rgb(var(--border) / 0.35)'
    : `color-mix(in srgb, ${color} ${pct}%, rgb(var(--border) / 0.35))`;
}

export default function Heatmap({ cells, color }: Props) {
  const base = resolveColor(color) ?? '#22c55e';

  const model = useMemo(() => {
    const rows: string[] = [];
    const grid = new Map<string, number>();
    const hours = new Array(COLS).fill(0) as number[];
    let total = 0;
    let peak = { row: '', col: 0, value: 0 };
    for (const c of cells) {
      if (c.col < 0 || c.col >= COLS) continue;
      if (!rows.includes(c.row)) rows.push(c.row);
      grid.set(`${c.row}|${c.col}`, (grid.get(`${c.row}|${c.col}`) ?? 0) + c.value);
    }
    rows.sort((a, b) => {
      const ia = WEEK_ORDER.indexOf(a.toLowerCase());
      const ib = WEEK_ORDER.indexOf(b.toLowerCase());
      return ia === -1 || ib === -1 ? 0 : ia - ib;
    });
    for (const [key, v] of grid) {
      const [row, col] = key.split('|');
      hours[Number(col)] += v;
      total += v;
      if (v > peak.value) peak = { row, col: Number(col), value: v };
    }
    const max = Math.max(...grid.values(), 0);
    const busiest = hours.indexOf(Math.max(...hours));
    return { rows, grid, max, total, peak, busiest };
  }, [cells]);

  if (model.rows.length === 0 || model.max <= 0)
    return <div className="text-text-secondary italic p-2">Chưa có dữ liệu.</div>;

  const level = (v: number) => (v <= 0 ? 0 : Math.min(4, Math.ceil((v / model.max) * 4)));
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="h-full overflow-auto p-3 flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div
          className="grid gap-[3px] min-w-[520px]"
          style={{ gridTemplateColumns: `32px repeat(${COLS}, minmax(14px, 1fr))` }}
        >
          <div />
          {Array.from({ length: COLS }, (_, h) => (
            <div key={h} className="text-[10px] text-center text-text-secondary">
              {h % 3 === 0 ? h : ''}
            </div>
          ))}
          {model.rows.map((row) => (
            <div key={row} className="contents">
              <div className="text-[10px] text-text-secondary flex items-center">{row}</div>
              {Array.from({ length: COLS }, (_, h) => {
                const v = model.grid.get(`${row}|${h}`) ?? 0;
                const isPeak = v > 0 && v === model.peak.value && row === model.peak.row && h === model.peak.col;
                return (
                  <div
                    key={h}
                    title={`${row} ${pad(h)}:00 · ${v}`}
                    className="aspect-square rounded-[3px] transition-colors hover:outline hover:outline-2 hover:outline-text-primary/60"
                    style={{
                      backgroundColor: mix(base, LEVELS[level(v)]),
                      outline: isPeak ? '2px solid #eab308' : undefined,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap pt-2 border-t border-border/50">
        <div className="flex gap-5 text-xs">
          <Summary label="Tổng" value={String(model.total)} />
          <Summary label="Đỉnh" value={`${model.peak.row} ${pad(model.peak.col)}:00`} />
          <Summary label="Giờ nhiều nhất" value={`${pad(model.busiest)}:00`} />
        </div>
        <div className="flex items-center gap-1 text-[10px] text-text-secondary">
          Ít
          {LEVELS.map((l) => (
            <span key={l} className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: mix(base, l) }} />
          ))}
          Nhiều
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-text-secondary">{label}</div>
      <div className="font-semibold text-text-primary">{value}</div>
    </div>
  );
}