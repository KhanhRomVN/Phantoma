import { cn } from '../../../shared/lib/utils';

interface BadgeProps {
  count: number;
  className?: string;
  max?: number;
}

export function Badge({ count, className, max = 99 }: BadgeProps) {
  if (count === 0) return null;

  const display = count > max ? `${max}+` : String(count);

  return (
    <span
      className={cn(
        'ml-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-medium',
        className || 'bg-primary/20 text-primary',
      )}
    >
      {display}
    </span>
  );
}

export default Badge;