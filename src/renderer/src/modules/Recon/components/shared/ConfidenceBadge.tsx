interface ConfidenceBadgeProps {
  value: number;
}

export function ConfidenceBadge({ value }: ConfidenceBadgeProps) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? $('--success') : pct >= 40 ? $('--warning') : $('--error');
  const bgColor =
    pct >= 70 ? ($('--success') || '#10b981') + '15' : pct >= 40 ? ($('--warning') || '#f59e0b') + '15' : ($('--error') || '#ef4444') + '15';
  return (
    <span
      className="text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0"
      style={{ color, borderColor: color, backgroundColor: bgColor }}
    >
      {pct}%
    </span>
  );
}
