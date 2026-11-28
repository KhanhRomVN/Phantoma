import { cn } from '@renderer/utils/cn';
import type { CustomField } from '../../../shared/types';

const MAX_CELLS = 8;

export function isBackupField(f: Pick<CustomField, 'kind' | 'key'>): boolean {
  return f.kind === 'backup' || /backup/i.test(f.key);
}

// ASSUMED: mỗi dòng là 1 code, tiền tố "~" nghĩa là đã dùng (theo gợi ý ở FieldInput)
function parse(value: string): { code: string; used: boolean }[] {
  return value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (l.startsWith('~') ? { code: l.slice(1).trim(), used: true } : { code: l, used: false }));
}

export function BackupFieldTip({ value }: { value: string }) {
  const items = parse(value);
  if (items.length === 0) return <span className="text-[11px]">No backup codes</span>;
  const left = items.filter((c) => !c.used).length;
  const shown = items.length > MAX_CELLS ? items.slice(0, MAX_CELLS - 1) : items;
  const more = items.length - shown.length;
  return (
    <div className="flex w-max flex-col gap-1.5">
      <div className="flex items-center justify-between gap-6 text-[11px]">
        <span className="font-medium">Backup codes</span>
        <span className={cn('tabular-nums', left === 0 ? 'text-error' : 'opacity-70')}>
          {left} / {items.length} left
        </span>
      </div>
      <div className="grid grid-cols-[repeat(4,max-content)] gap-1">
        {shown.map((c, i) => (
          <span
            key={`${c.code}-${i}`}
            className={cn(
              'whitespace-nowrap rounded-md bg-text-secondary/15 px-2 py-1 text-center font-mono text-[11px] tracking-wide',
              c.used && 'line-through opacity-40',
            )}
          >
            {c.code}
          </span>
        ))}
        {more > 0 && (
          <span className="whitespace-nowrap rounded-md bg-text-secondary/15 px-2 py-1 text-center text-[11px] opacity-70">
            +{more} more
          </span>
        )}
      </div>
    </div>
  );
}