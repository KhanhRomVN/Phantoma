import { memo, useMemo, type ReactNode } from 'react';
import {
  Filter,
  X,
  Flag,
  CircleDot,
  Calendar,
  Tag,
  Lock,
  AlertCircle,
  CalendarCheck,
  CalendarX,
  CalendarRange,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { $ } from '@renderer/utils/color';
import {
  isTaskOverdue,
  type StoredTask,
  type TaskPriority,
  type TaskStatus,
} from '../../../services/task.service';
import { STATUS_META } from './statusMeta';

export type DueFilter = 'any' | 'overdue' | 'scheduled' | 'unscheduled';

export interface TaskFilters {
  status: TaskStatus[];
  priority: TaskPriority[];
  tags: string[];
  due: DueFilter;
  blockedOnly: boolean;
}

export const EMPTY_FILTERS: TaskFilters = {
  status: [],
  priority: [],
  tags: [],
  due: 'any',
  blockedOnly: false,
};

export function countActiveFilters(f: TaskFilters): number {
  return (
    Number(f.status.length > 0) +
    Number(f.priority.length > 0) +
    Number(f.tags.length > 0) +
    Number(f.due !== 'any') +
    Number(f.blockedOnly)
  );
}

export function applyTaskFilters(
  tasks: StoredTask[],
  f: TaskFilters,
  blockedCounts: Record<string, number>,
): StoredTask[] {
  return tasks.filter((t) => {
    if (f.status.length > 0 && !f.status.includes(t.status)) return false;
    if (f.priority.length > 0 && !f.priority.includes(t.priority)) return false;
    if (f.tags.length > 0 && !t.tags.some((tag) => f.tags.includes(tag.label))) return false;
    if (f.due === 'overdue' && !isTaskOverdue(t)) return false;
    if (f.due === 'scheduled' && t.endDate === null) return false;
    if (f.due === 'unscheduled' && t.endDate !== null) return false;
    if (f.blockedOnly && (blockedCounts[t.id] ?? 0) === 0) return false;
    return true;
  });
}

const STATUS_OPTIONS: TaskStatus[] = ['todo', 'progress', 'done'];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: '--error' },
  { value: 'medium', label: 'Medium', color: '--warn' },
  { value: 'low', label: 'Low', color: '--text-secondary' },
];

const DUE_OPTIONS: { value: DueFilter; label: string; icon: LucideIcon; color: string }[] = [
  { value: 'any', label: 'Any', icon: CalendarRange, color: '--primary' },
  { value: 'overdue', label: 'Overdue', icon: AlertCircle, color: '--error' },
  { value: 'scheduled', label: 'Has due date', icon: CalendarCheck, color: '--info' },
  { value: 'unscheduled', label: 'No due date', icon: CalendarX, color: '--text-secondary' },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

interface ChipProps {
  active: boolean;
  color?: string;
  icon?: LucideIcon;
  count?: number;
  onClick: () => void;
  children: ReactNode;
}

function Chip({ active, color = '--primary', icon: Icon, count, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full pl-2 pr-1.5 py-1 border transition-all cursor-pointer',
        active
          ? 'shadow-sm'
          : 'border-divider bg-card-hover/40 text-text-secondary hover:text-text-primary hover:bg-card-hover',
        !active && count === 0 && 'opacity-50',
      )}
      style={
        active
          ? { color: $(color), backgroundColor: $(color, 0.14), borderColor: $(color, 0.55) }
          : undefined
      }
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
      {count !== undefined && (
        <span
          className={cn(
            'min-w-[16px] h-4 px-1 rounded-full text-[10px] font-mono leading-4 text-center',
            !active && 'bg-border/60 text-text-secondary',
          )}
          style={active ? { backgroundColor: $(color, 0.22) } : undefined}
        >
          {count}
        </span>
      )}
    </button>
  );
}

interface GroupProps {
  icon: LucideIcon;
  color: string;
  label: string;
  children: ReactNode;
}

function Group({ icon: Icon, color, label, children }: GroupProps) {
  return (
    <div className="flex flex-col gap-2.5 min-w-0 rounded-lg border border-divider bg-background/50 p-3">
      <div className="flex items-center gap-2">
        <span
          className="w-5 h-5 rounded-md grid place-items-center"
          style={{ color: $(color), backgroundColor: $(color, 0.14) }}
        >
          <Icon className="w-3 h-3" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
          {label}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

interface FilterSectionProps {
  tasks: StoredTask[];
  blockedCounts: Record<string, number>;
  resultCount: number;
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
}

export const FilterSection = memo(function FilterSection({
  tasks,
  blockedCounts,
  resultCount,
  filters,
  onChange,
}: FilterSectionProps) {
  const tagOptions = useMemo(() => {
    const map = new Map<string, { color: string; count: number }>();
    tasks.forEach((t) =>
      t.tags.forEach((tag) => {
        const cur = map.get(tag.label);
        map.set(tag.label, { color: tag.color, count: (cur?.count ?? 0) + 1 });
      }),
    );
    return [...map.entries()].map(([label, v]) => ({ label, ...v }));
  }, [tasks]);

  const counts = useMemo(() => {
    const status: Record<string, number> = {};
    const priority: Record<string, number> = {};
    let overdue = 0;
    let scheduled = 0;
    let blocked = 0;
    tasks.forEach((t) => {
      status[t.status] = (status[t.status] ?? 0) + 1;
      priority[t.priority] = (priority[t.priority] ?? 0) + 1;
      if (isTaskOverdue(t)) overdue += 1;
      if (t.endDate !== null) scheduled += 1;
      if ((blockedCounts[t.id] ?? 0) > 0) blocked += 1;
    });
    return {
      status,
      priority,
      due: {
        any: tasks.length,
        overdue,
        scheduled,
        unscheduled: tasks.length - scheduled,
      } as Record<DueFilter, number>,
      blocked,
    };
  }, [tasks, blockedCounts]);

  const activeCount = countActiveFilters(filters);

  return (
    <div className="w-full shrink-0 flex flex-col gap-3 px-4 py-3 border-b border-divider bg-gradient-to-b from-primary/5 to-transparent">
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-md grid place-items-center bg-primary/15 text-primary">
          <Filter className="w-3.5 h-3.5" />
        </span>
        <span className="text-xs font-semibold text-text-primary">Filters</span>
        {activeCount > 0 && (
          <span className="text-[10px] font-semibold rounded-full px-1.5 py-px bg-primary/15 text-primary">
            {activeCount} active
          </span>
        )}

        <span className="ml-auto text-[11px] text-text-secondary">
          <span className="font-mono text-text-primary">{resultCount}</span> of {tasks.length} tasks
        </span>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="inline-flex items-center gap-1 text-[11px] font-medium rounded-md px-2 py-1 text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
        <Group icon={CircleDot} color="--info" label="Status">
          {STATUS_OPTIONS.map((s) => (
            <Chip
              key={s}
              active={filters.status.includes(s)}
              color={STATUS_META[s].color}
              icon={STATUS_META[s].icon}
              count={counts.status[s] ?? 0}
              onClick={() => onChange({ ...filters, status: toggle(filters.status, s) })}
            >
              {STATUS_META[s].label}
            </Chip>
          ))}
        </Group>

        <Group icon={Flag} color="--warn" label="Priority">
          {PRIORITY_OPTIONS.map((p) => (
            <Chip
              key={p.value}
              active={filters.priority.includes(p.value)}
              color={p.color}
              count={counts.priority[p.value] ?? 0}
              onClick={() => onChange({ ...filters, priority: toggle(filters.priority, p.value) })}
            >
              {p.label}
            </Chip>
          ))}
        </Group>

        <Group icon={Calendar} color="--primary" label="Due">
          {DUE_OPTIONS.map((d) => (
            <Chip
              key={d.value}
              active={filters.due === d.value}
              color={d.color}
              icon={d.icon}
              count={counts.due[d.value]}
              onClick={() => onChange({ ...filters, due: d.value })}
            >
              {d.label}
            </Chip>
          ))}
        </Group>

        {tagOptions.length > 0 && (
          <Group icon={Tag} color="--success" label="Tags">
            {tagOptions.map((tag) => (
              <Chip
                key={tag.label}
                active={filters.tags.includes(tag.label)}
                color={tag.color}
                count={tag.count}
                onClick={() => onChange({ ...filters, tags: toggle(filters.tags, tag.label) })}
              >
                {tag.label}
              </Chip>
            ))}
          </Group>
        )}

        <Group icon={Lock} color="--error" label="Dependency">
          <button
            type="button"
            role="switch"
            aria-checked={filters.blockedOnly}
            onClick={() => onChange({ ...filters, blockedOnly: !filters.blockedOnly })}
            className="flex items-center gap-2.5 w-full cursor-pointer"
          >
            <span
              className={cn(
                'relative w-8 h-[18px] rounded-full shrink-0 transition-colors',
                !filters.blockedOnly && 'bg-border',
              )}
              style={filters.blockedOnly ? { backgroundColor: $('--error', 0.7) } : undefined}
            >
              <span
                className={cn(
                  'absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform',
                  filters.blockedOnly && 'translate-x-[14px]',
                )}
              />
            </span>
            <span className="flex-1 text-left text-[11px] font-medium text-text-primary">
              Blocked tasks only
            </span>
            <span className="min-w-[16px] h-4 px-1 rounded-full text-[10px] font-mono leading-4 text-center bg-border/60 text-text-secondary">
              {counts.blocked}
            </span>
          </button>
        </Group>
      </div>
    </div>
  );
});

FilterSection.displayName = 'FilterSection';