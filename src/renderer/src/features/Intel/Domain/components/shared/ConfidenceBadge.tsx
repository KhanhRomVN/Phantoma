interface ConfidenceBadgeProps {
  value: number;
}

export function ConfidenceBadge({ value }: ConfidenceBadgeProps) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? '#30d158' : pct >= 40 ? '#f5a623' : '#ff2d55';
  return (
    <span
      className="text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0"
      style={{ color, borderColor: color, backgroundColor: `${color}15` }}
    >
      {pct}%
    </span>
  );
}
