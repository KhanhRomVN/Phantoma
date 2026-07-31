// ============================================================================
// Stat — Metric display card
// ============================================================================

interface StatProps {
  label: string;
  value: string | number;
  accent?: string;
  sub?: string;
}

export function Stat({ label, value, accent = $('--primary'), sub }: StatProps) {
  return (
    <div className="bg-input-background border border-border rounded p-2.5 flex flex-col gap-1">
      <div className="text-[9px] text-text-secondary font-bold tracking-[0.1em] uppercase">
        {label}
      </div>
      <div className="text-2xl font-extrabold leading-none tabular-nums" style={{ color: accent }}>
        {value}
      </div>
      {sub && <div className="text-[9px] text-text-secondary">{sub}</div>}
    </div>
  );
}
