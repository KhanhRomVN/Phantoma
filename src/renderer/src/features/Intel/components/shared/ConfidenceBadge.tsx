interface ConfidenceBadgeProps {
  value: number;
}

export function ConfidenceBadge({ value }: ConfidenceBadgeProps) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--error)';
  const bgColor = pct >= 70 ? 'var(--success)15' : pct >= 40 ? 'var(--warning)15' : 'var(--error)15';
  return (
    <span
      className="text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0"
      style={{ color, borderColor: color, backgroundColor: bgColor }}
    >
      {pct}%
    </span>
  );
}
