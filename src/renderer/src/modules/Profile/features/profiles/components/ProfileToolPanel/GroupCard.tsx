import { Layers } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { DropdownItem } from '@renderer/components/ui/Dropdown';

export function GroupCard({
  name,
  purpose,
  count,
  selected,
  onClick,
}: {
  name: string;
  purpose: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <DropdownItem
      noPadding
      onClick={onClick}
      className={cn(
        'items-start gap-2.5 px-2.5 py-2',
        selected ? 'bg-text-secondary/15' : 'bg-text-secondary/5',
      )}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary">
        <Layers className="h-3.5 w-3.5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 whitespace-normal">
        <span className="flex items-center justify-between gap-2 text-xs font-medium text-text-primary">
          {name}
          <span className="text-[10px] tabular-nums text-text-secondary">{count}</span>
        </span>
        <span className="text-[11px] leading-snug text-text-secondary">{purpose}</span>
      </span>
    </DropdownItem>
  );
}
