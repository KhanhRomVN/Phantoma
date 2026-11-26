import { cn } from '@renderer/utils/cn';
import { INPUT } from './form.styles';

export function NumField({
  value,
  onChange,
  suffix,
  min = 0,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(INPUT, 'pr-12 font-mono')}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-text-secondary">
        {suffix}
      </span>
    </div>
  );
}
