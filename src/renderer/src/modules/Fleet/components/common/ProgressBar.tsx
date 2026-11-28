interface ProgressBarProps {
  value: number;
  width?: number | string;
  color?: string;
  showLabel?: boolean;
}

function getHeatColor(v: number): string {
  if (v >= 85) return 'rgb(var(--error))';
  if (v >= 65) return 'rgb(var(--warn))';
  return 'rgb(var(--success))';
}

export function ProgressBar({ value, width = 56, color, showLabel }: ProgressBarProps) {
  const barColor = color || getHeatColor(value);
  const w = typeof width === 'number' ? `${width}px` : width;

  return (
    <div className="flex items-center gap-2">
      <div className="h-1 overflow-hidden rounded-full bg-border" style={{ width: w }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: barColor }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] text-text-secondary" style={{ width: 32, textAlign: 'right' }}>
          {value}%
        </span>
      )}
    </div>
  );
}

interface MeterRowProps {
  label: string;
  value: number;
  offline?: boolean;
}

export function MeterRow({ label, value, offline }: MeterRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 text-[11px] text-text-secondary">{label}</span>
      <div className="flex-1">
        <ProgressBar value={offline ? 0 : value} width="100%" />
      </div>
      <span className="w-8 text-right text-[11px] text-text-secondary">
        {offline ? '—' : `${value}%`}
      </span>
    </div>
  );
}
