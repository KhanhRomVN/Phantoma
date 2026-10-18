import { memo, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';

export interface CalendarProps {
  /** Selected date, format yyyy-MM-dd */
  value?: string | null;
  onChange: (value: string) => void;
  className?: string;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export const Calendar = memo(function Calendar({ value, onChange, className }: CalendarProps) {
  const initial = value ? new Date(`${value}T00:00:00`) : new Date();
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });

  const now = new Date();
  const todayKey = toKey(now.getFullYear(), now.getMonth(), now.getDate());

  const cells = useMemo(() => {
    const offset = (new Date(view.year, view.month, 1).getDay() + 6) % 7;
    const total = new Date(view.year, view.month + 1, 0).getDate();
    const list: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= total; d++) list.push(d);
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [view]);

  const shift = (delta: number) =>
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const navButton =
    'w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer outline-none';

  return (
    <div className={cn('flex flex-col gap-2 p-2 select-none', className)}>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} className={navButton}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-text-primary">
          {MONTHS[view.month]} {view.year}
        </span>
        <button type="button" onClick={() => shift(1)} className={navButton}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className="h-7 flex items-center justify-center text-[10px] font-semibold uppercase text-text-secondary"
          >
            {w}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`empty-${i}`} className="h-8" />;
          const key = toKey(view.year, view.month, day);
          const selected = key === value;
          const today = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                'h-8 rounded-md text-xs flex items-center justify-center transition-colors cursor-pointer outline-none',
                selected
                  ? 'bg-primary/20 text-primary font-semibold'
                  : today
                    ? 'bg-card-hover text-text-primary font-semibold hover:bg-primary/10 hover:text-primary'
                    : 'text-text-primary hover:bg-card-hover',
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onChange(todayKey)}
        className="h-7 rounded-md text-xs font-medium bg-card-hover text-text-secondary hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer outline-none"
      >
        Today
      </button>
    </div>
  );
});

Calendar.displayName = 'Calendar';

export default Calendar;