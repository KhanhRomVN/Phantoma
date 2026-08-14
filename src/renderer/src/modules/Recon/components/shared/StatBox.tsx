interface StatBoxProps {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}

export function StatBox({ label, value, sub, accent }: StatBoxProps) {
  return (
    <div className="bg-card-background border border-border rounded p-2.5 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest font-mono text-text-secondary">
        {label}
      </span>
      <span className="text-[16px] font-bold font-mono leading-none" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="text-[9px] font-mono text-text-secondary">{sub}</span>}
    </div>
  );
}
