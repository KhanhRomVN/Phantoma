import type { CSSProperties, ReactNode } from 'react';
import { c, tc } from '../../utils/color';

export const TH: CSSProperties = { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: c('ts'), whiteSpace: 'nowrap' };
export const TD: CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' };

export const THead = ({ cols }: { cols: string[] }) => (
  <thead style={{ position: 'sticky', top: 0, background: c('thead'), zIndex: 1 }}>
    <tr>
      {cols.map((h) => (
        <th key={h} style={TH}>{h}</th>
      ))}
    </tr>
  </thead>
);

export const ViewShell = ({ title, subtitle, accent = 'primary', actions, children }: { title: string; subtitle?: string; accent?: string; actions?: ReactNode; children: ReactNode }) => (
  <div className="scroll" style={{ flex: 1, minWidth: 0, padding: 'var(--pad,16px)' }}>
    <div
      className="noise card-pop"
      style={{
        borderRadius: 14,
        padding: '16px 18px',
        marginBottom: 16,
        overflow: 'hidden',
        border: `1px solid ${c('border')}`,
        background: `radial-gradient(70% 160% at 0% 0%, ${tc(accent, 0.2)}, transparent 65%), ${c('card')}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 300, letterSpacing: '-.015em' }}>{title}</h2>
        {subtitle && <div className="sub" style={{ marginTop: 4 }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>{actions}</div>
    </div>
    {children}
  </div>
);

export const StatCard = ({ label, value, tone = 'primary', hint }: { label: string; value: ReactNode; tone?: string; hint?: string }) => (
  <div className="card" style={{ flex: 1, minWidth: 130, padding: '12px 14px', background: `linear-gradient(160deg, ${tc(tone, 0.1)}, transparent 70%), ${c('card')}` }}>
    <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: tc(tone) }}>{value}</div>
    <div style={{ fontWeight: 500 }}>{label}</div>
    {hint && <div className="sub">{hint}</div>}
  </div>
);