// ============================================================================
// Stat — Metric display card
// ============================================================================

interface StatProps {
  label: string;
  value: string | number;
  accent?: string;
  sub?: string;
}

export function Stat({ label, value, accent = 'var(--primary)', sub }: StatProps) {
  return (
    <div
      style={{
        background: 'var(--input-background)',
        border: '1px solid var(--border)',
        borderRadius: 5,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: 'var(--text-secondary)',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: accent,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{sub}</div>}
    </div>
  );
}