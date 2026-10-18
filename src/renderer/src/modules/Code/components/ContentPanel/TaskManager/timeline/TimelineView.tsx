import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Lock } from 'lucide-react';
import { $ } from '@renderer/utils/color';
import {
  formatTaskRange,
  getBlockers,
  getTaskEndMs,
  getTaskStartMs,
  isTaskOverdue,
  type StoredTask,
} from '../../../../services/task.service';
import { STATUS_META } from '../kanban/KanbanTaskCard';
import { TaskEmptyState } from '../TaskEmptyState';

const DAY_MS = 86400000;
const BASE_DAY_W = 80;
const CARD_MIN_W = 120;
const OPEN_SPAN_DAYS = 2;
const CHAIN_GAP_DAYS = 1;
const ROW_H = 52;
const CARD_H = 40;
const PRIORITY_COLOR: Record<StoredTask['priority'], string> = {
  high: '--error',
  medium: '--warn',
  low: '--text-secondary',
};
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const startOfDay = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const monthLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

interface Placed {
  task: StoredTask;
  startMs: number;
  endMs: number;
  span: number;
  chainPrevId?: string;
}

interface TimelineViewProps {
  tasks: StoredTask[];
  highlighted?: boolean;
  onTaskClick: (task: StoredTask) => void;
  onAdd: () => void;
}

export const TimelineView = memo(function TimelineView({
  tasks,
  highlighted = false,
  onTaskClick,
  onAdd,
}: TimelineViewProps) {
  const isEmpty = tasks.length === 0;
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);
  const [viewW, setViewW] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setViewW(el.clientWidth);
    const ro = new ResizeObserver(() => setViewW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const placed = useMemo<Placed[]>(() => {
    const byId = new Map(tasks.map((t) => [t.id, t]));
    const memo = new Map<string, Placed>();
    const visiting = new Set<string>();
    const build = (task: StoredTask): Placed => {
      const cached = memo.get(task.id);
      if (cached) return cached;
      visiting.add(task.id);
      const created = startOfDay(task.createdAt);
      const explicitStart = getTaskStartMs(task);
      const explicitEnd = getTaskEndMs(task);
      const prevs =
        explicitStart == null && explicitEnd === null
          ? task.dependsOn.flatMap((id) => {
              const prev = byId.get(id);
              return prev && !visiting.has(id) ? [build(prev)] : [];
            })
          : [];
      const chainPrev = prevs.reduce<Placed | undefined>(
        (best, p) => (!best || p.endMs > best.endMs ? p : best),
        undefined,
      );
      let startMs: number;
      let endMs: number;
      if (chainPrev) {
        startMs = chainPrev.endMs + CHAIN_GAP_DAYS * DAY_MS;
        endMs = startMs + OPEN_SPAN_DAYS * DAY_MS;
      } else {
        startMs =
          explicitEnd !== null && explicitStart == null
            ? startOfDay(explicitEnd)
            : (explicitStart ?? created);
        endMs =
          explicitEnd !== null && explicitStart == null
            ? startMs + DAY_MS
            : Math.max(explicitEnd ?? startMs + OPEN_SPAN_DAYS * DAY_MS, startMs);
      }
      visiting.delete(task.id);
      const result: Placed = {
        task,
        startMs,
        endMs,
        span: Math.max(1, (endMs - startMs) / DAY_MS),
        chainPrevId: chainPrev?.task.id,
      };
      memo.set(task.id, result);
      return result;
    };
    return tasks.map(build).sort((a, b) => a.startMs - b.startMs);
  }, [tasks]);

  const { rowIdx, rowCount } = useMemo(() => {
    const idx = new Map<string, number>();
    const rowEnd: number[] = [];
    placed.forEach((p) => {
      const prevRow = p.chainPrevId !== undefined ? idx.get(p.chainPrevId) : undefined;
      const row =
        prevRow !== undefined && rowEnd[prevRow] <= p.startMs ? prevRow : rowEnd.length;
      idx.set(p.task.id, row);
      rowEnd[row] = p.endMs;
    });
    return { rowIdx: idx, rowCount: rowEnd.length };
  }, [placed]);

  const { rangeStart, days, colW, offsets } = useMemo(() => {
    const now = Date.now();
    const minStart = Math.min(now, ...placed.map((p) => p.startMs));
    const maxEnd = Math.max(now, ...placed.map((p) => p.endMs));
    const rangeStart = startOfDay(minStart) - 2 * DAY_MS;
    const rangeEnd = startOfDay(maxEnd) + 7 * DAY_MS;
    const days = Math.max(
      Math.round((rangeEnd - rangeStart) / DAY_MS) + 1,
      Math.ceil(viewW / BASE_DAY_W),
    );
    const colW = Array.from({ length: days }, () => BASE_DAY_W);
    placed.forEach((p) => {
      const t = (p.startMs - rangeStart) / DAY_MS;
      const first = Math.max(0, Math.floor(t + 1e-6));
      const last = Math.min(days - 1, Math.max(first, Math.ceil(t + p.span - 1e-6) - 1));
      const need = CARD_MIN_W + 4;
      const have = colW.slice(first, last + 1).reduce((s, w) => s + w, 0);
      if (have >= need) return;
      const add = (need - have) / (last - first + 1);
      for (let i = first; i <= last; i++) colW[i] += add;
    });
    const offsets = [0];
    colW.forEach((w) => offsets.push(offsets[offsets.length - 1] + w));
    return { rangeStart, days, colW, offsets };
  }, [placed, viewW]);

  const xAt = (t: number) => {
    const i = Math.max(0, Math.min(Math.floor(t), days - 1));
    return offsets[i] + (t - i) * colW[i];
  };

  const today = startOfDay(Date.now());
  const todayLeft = xAt((Date.now() - rangeStart) / DAY_MS);

  useEffect(() => {
    if (scrolledRef.current || !viewW || !scrollRef.current) return;
    scrolledRef.current = true;
    scrollRef.current.scrollLeft = Math.max(0, todayLeft - viewW * 0.25);
  });

  const firstMatch = highlighted ? placed[0] : undefined;
  const firstMatchId = firstMatch?.task.id;
  useEffect(() => {
    if (!firstMatch || !scrollRef.current) return;
    const left = xAt((firstMatch.startMs - rangeStart) / DAY_MS);
    scrollRef.current.scrollTo({ left: Math.max(0, left - 48), behavior: 'smooth' });
  }, [firstMatchId, highlighted]);

  const scrollToToday = () =>
    scrollRef.current?.scrollTo({
      left: Math.max(0, todayLeft - viewW * 0.25),
      behavior: 'smooth',
    });

  const base = new Date(rangeStart);
  const dayList = Array.from(
    { length: days },
    (_, i) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + i),
  );
  const totalW = offsets[days];
  const rowsH = isEmpty ? 360 : rowCount * ROW_H + 24;

  const segments: { key: string; label: string; width: number }[] = [];
  dayList.forEach((d, i) => {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const last = segments[segments.length - 1];
    if (last && last.key === key) last.width += colW[i];
    else segments.push({ key, label: monthLabel(d), width: colW[i] });
  });

  const overdueCount = placed.filter((p) => isTaskOverdue(p.task)).length;
  const statusCounts = Object.entries(STATUS_META).map(([status, meta]) => ({
    status,
    meta,
    count: placed.filter((p) => p.task.status === status).length,
  }));
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const hatch = `repeating-linear-gradient(135deg, ${$('--text-secondary', 0.1)} 0 1px, transparent 1px 7px)`;

  const rows = placed.map((p) => {
    const t = (p.startMs - rangeStart) / DAY_MS;
    return {
      ...p,
      left: xAt(t) + 2,
      width: Math.max(xAt(t + p.span) - xAt(t) - 4, BASE_DAY_W - 4),
      top: 12 + (rowIdx.get(p.task.id) ?? 0) * ROW_H,
    };
  });
  const rowById = new Map(rows.map((r) => [r.task.id, r]));

  const links = rows.flatMap((r) =>
    r.task.dependsOn.flatMap((prevId) => {
      const prev = rowById.get(prevId);
      if (!prev) return [];
      const x1 = prev.left + prev.width;
      const y1 = prev.top + CARD_H / 2;
      const x2 = r.left;
      const y2 = r.top + CARD_H / 2;
      const mid = (y1 + y2) / 2;
      const d =
        x2 - x1 >= 28
          ? `M ${x1} ${y1} C ${x1 + 20} ${y1}, ${x2 - 20} ${y2}, ${x2} ${y2}`
          : `M ${x1} ${y1} H ${x1 + 14} V ${mid} H ${x2 - 14} V ${y2} H ${x2}`;
      return [{ key: `${prevId}->${r.task.id}`, d }];
    }),
  );

  return (
    <div
      ref={scrollRef}
      className="flex-1 min-h-0 overflow-auto custom-scrollbar bg-sidebar-background/50"
    >
      <div className="relative flex flex-col min-h-full" style={{ width: totalW }}>
        <div className="sticky top-0 z-20 bg-sidebar-background border-b border-divider">
          <div className="relative flex">
            {segments.map((seg) => (
              <div
                key={seg.key}
                className="shrink-0 px-3 py-2 border-r border-divider/40"
                style={{ width: seg.width }}
              >
                <span className="sticky left-3 inline-block text-[13px] font-semibold text-text-primary whitespace-nowrap">
                  {seg.label}
                </span>
              </div>
            ))}
            <div className="absolute inset-y-0 left-0 w-full pointer-events-none">
              <div
                className="sticky left-0 flex h-full items-center justify-end gap-2 px-3"
                style={{ width: viewW || undefined }}
              >
                {statusCounts.map(({ status, meta, count }) => {
                  const Icon = meta.icon;
                  return (
                    <span
                      key={status}
                      title={meta.label}
                      className="inline-flex items-center gap-1 text-[11px] text-text-secondary rounded px-1.5 py-0.5 bg-card-hover"
                    >
                      <Icon className="w-3 h-3" style={{ color: $(meta.color) }} />
                      {count}
                    </span>
                  );
                })}
                {overdueCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-medium rounded px-1.5 py-0.5"
                    style={{ color: $('--error'), backgroundColor: $('--error', 0.1) }}
                  >
                    {overdueCount} overdue
                  </span>
                )}
                <span className="text-[11px] text-text-secondary">{todayLabel}</span>
                <button
                  type="button"
                  onClick={scrollToToday}
                  className="pointer-events-auto inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md bg-card-hover text-text-secondary hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer outline-none"
                >
                  <Crosshair className="w-3 h-3" />
                  Today
                </button>
              </div>
            </div>
          </div>
          <div className="flex border-t border-divider">
            {dayList.map((d, i) => {
              const isToday = d.getTime() === today;
              return (
                <div
                  key={d.getTime()}
                  className="relative shrink-0 flex items-center justify-center gap-1 py-2 text-[11px]"
                  style={{ width: colW[i] }}
                >
                  <span className="text-text-secondary/70">{WEEKDAYS[d.getDay()]}</span>
                  <span
                    className={isToday ? 'font-bold' : 'font-semibold text-text-primary'}
                    style={isToday ? { color: $('--primary') } : undefined}
                  >
                    {d.getDate()}
                  </span>
                  {isToday && (
                    <span
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                      style={{ backgroundColor: $('--primary') }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative flex-1" style={{ minHeight: rowsH }}>
          <div className="absolute inset-0 flex pointer-events-none">
            {dayList.map((d, i) => {
              const weekend = d.getDay() === 0 || d.getDay() === 6;
              const isToday = d.getTime() === today;
              return (
                <div
                  key={d.getTime()}
                  className="shrink-0 h-full border-r border-divider/40"
                  style={{
                    width: colW[i],
                    backgroundImage: weekend ? hatch : undefined,
                    backgroundColor: isToday ? $('--primary', 0.05) : undefined,
                  }}
                />
              );
            })}
          </div>

          <div
            className="absolute top-0 bottom-0 w-px z-10 pointer-events-none"
            style={{ left: todayLeft, backgroundColor: $('--primary', 0.7) }}
          />

          <svg
            className="absolute top-0 left-0 z-[4] pointer-events-none"
            width={totalW}
            height={rowsH}
          >
            <defs>
              <marker
                id="timeline-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0 0 L8 4 L0 8 z" style={{ fill: $('--text-secondary', 0.8) }} />
              </marker>
            </defs>
            {links.map((l) => (
              <path
                key={l.key}
                d={l.d}
                fill="none"
                strokeWidth={1.5}
                markerEnd="url(#timeline-arrow)"
                style={{ stroke: $('--text-secondary', 0.6) }}
              />
            ))}
          </svg>

          {isEmpty && (
            <div className="absolute inset-0 z-[6] pointer-events-none">
              <div
                className="sticky left-0 flex h-full items-center justify-center"
                style={{ width: viewW || undefined }}
              >
                <div className="pointer-events-auto flex">
                  <TaskEmptyState onAdd={onAdd} />
                </div>
              </div>
            </div>
          )}

          {rows.map(({ task, left, width, top }) => {
            const meta = STATUS_META[task.status];
            const StatusIcon = meta.icon;
            const overdue = isTaskOverdue(task);
            const range = formatTaskRange(task);
            const checkTotal = task.checklist.length;
            const checkPct =
              checkTotal > 0
                ? (task.checklist.filter((c) => c.done).length / checkTotal) * 100
                : 0;
            const blocked = task.status !== 'done' && getBlockers(task, tasks).length > 0;
            return (
              <div
                key={task.id}
                onClick={() => onTaskClick(task)}
                title={range ? `${task.title} · ${range}` : task.title}
                className={`absolute z-[5] flex items-center gap-2 pl-3 pr-2.5 rounded-xl border shadow-sm overflow-hidden transition-colors cursor-pointer ${
                  highlighted
                    ? 'border-primary/60 bg-primary/10 ring-1 ring-primary/30'
                    : 'border-divider bg-card-background hover:border-primary/40'
                }`}
                style={{
                  left,
                  top,
                  width,
                  height: CARD_H,
                  ...(overdue && !highlighted ? { borderColor: $('--error', 0.6) } : null),
                }}
              >
                <span
                  className="w-1 h-6 rounded-full shrink-0"
                  style={{ backgroundColor: $(meta.color) }}
                />
                <StatusIcon className="w-3.5 h-3.5 shrink-0" style={{ color: $(meta.color) }} />
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: $(PRIORITY_COLOR[task.priority]) }}
                />
                {blocked && <Lock className="w-3 h-3 shrink-0" style={{ color: $('--warn') }} />}
                <span className="flex-1 min-w-0 truncate text-[12.5px] font-semibold text-text-primary">
                  {task.title}
                </span>
                {blocked && (
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `repeating-linear-gradient(45deg, ${$('--warn', 0.18)} 0 2px, transparent 2px 8px)`,
                      backgroundColor: $('--warn', 0.05),
                    }}
                  />
                )}
                {checkTotal > 0 && (
                  <span
                    className="absolute left-0 bottom-0 h-0.5"
                    style={{
                      width: `${checkPct}%`,
                      backgroundColor: checkPct === 100 ? $('--success') : $('--primary'),
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

TimelineView.displayName = 'TimelineView';