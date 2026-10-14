import { CalendarDays, Minus, Pencil, Plus } from 'lucide-react';
import type { DiffItem } from '../types';
import { COLOR_MAP } from '../../../constants/colors';

interface Props {
  items: DiffItem[];
}

type Kind = 'add' | 'edit' | 'remove';

const KIND = {
  add: { label: 'Thêm', color: COLOR_MAP.green, Icon: Plus },
  edit: { label: 'Sửa', color: COLOR_MAP.yellow, Icon: Pencil },
  remove: { label: 'Xoá', color: COLOR_MAP.red, Icon: Minus },
} as const;

function kindOf(it: DiffItem): Kind {
  if (!it.oldValue) return 'add';
  if (!it.newValue) return 'remove';
  return 'edit';
}

function Pill({ kind, count }: { kind: Kind; count: number }) {
  const { label, color, Icon } = KIND[kind];
  return (
    <span
      className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-medium border"
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}1a` }}
    >
      <Icon className="w-3 h-3" strokeWidth={2.5} />
      {count} {label}
    </span>
  );
}

function Line({ sign, value, color, strike }: { sign: string; value: string; color: string; strike?: boolean }) {
  return (
    <div
      className="grid grid-cols-[18px_1fr] items-start px-2.5 py-1.5 text-xs font-mono border-l-2"
      style={{ color, backgroundColor: `${color}14`, borderLeftColor: color }}
    >
      <b>{sign}</b>
      <span className={strike ? 'line-through break-all opacity-80' : 'break-all'}>{value}</span>
    </div>
  );
}

export default function Diff({ items }: Props) {
  if (items.length === 0)
    return <div className="text-text-secondary italic p-2">Chưa có dữ liệu.</div>;

  const order: string[] = [];
  const byDate = new Map<string, DiffItem[]>();
  for (const it of items) {
    if (!byDate.has(it.date)) {
      byDate.set(it.date, []);
      order.push(it.date);
    }
    byDate.get(it.date)!.push(it);
  }
  const count = (k: Kind) => items.filter((i) => kindOf(i) === k).length;

  return (
    <div className="h-full overflow-auto p-3 flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        <Pill kind="add" count={count('add')} />
        <Pill kind="edit" count={count('edit')} />
        <Pill kind="remove" count={count('remove')} />
      </div>

      {order.map((date, gi) => {
        const group = byDate.get(date)!;
        return (
          <div key={date} className="relative pl-6">
            {gi < order.length - 1 && (
              <span className="absolute left-[9px] top-6 -bottom-4 w-px bg-border" />
            )}
            <span className="absolute left-0 top-0 w-[19px] h-[19px] rounded-full bg-card-background-hover border border-border flex items-center justify-center text-primary">
              <CalendarDays className="w-2.5 h-2.5" strokeWidth={2.5} />
            </span>
            <div className="flex items-center gap-2 mb-2 h-[19px]">
              <span className="text-xs font-semibold text-text-primary">{date}</span>
              <span className="text-[10px] text-text-secondary">{group.length} thay đổi</span>
            </div>
            <div className="flex flex-col gap-2">
              {group.map((it, i) => {
                const kind = kindOf(it);
                const { label, color, Icon } = KIND[kind];
                return (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-card-background-hover overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                      <span className="text-xs font-semibold text-text-primary truncate">{it.field}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {it.src?.map((s) => (
                          <span key={s} className="text-[10px] text-text-secondary">
                            {s}
                          </span>
                        ))}
                        <span
                          className="inline-flex items-center gap-1 h-[18px] px-1.5 rounded-full text-[10px] font-medium border"
                          style={{ color, borderColor: `${color}55`, backgroundColor: `${color}1a` }}
                        >
                          <Icon className="w-2.5 h-2.5" strokeWidth={2.5} />
                          {label}
                        </span>
                      </span>
                    </div>
                    {it.oldValue && <Line sign="-" value={it.oldValue} color={COLOR_MAP.red} strike />}
                    {it.newValue && <Line sign="+" value={it.newValue} color={COLOR_MAP.green} />}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}