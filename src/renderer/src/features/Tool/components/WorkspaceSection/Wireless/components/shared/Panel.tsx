// ============================================================================
// Panel — Reusable panel wrapper with accent header
// ============================================================================

import React from 'react';

interface PanelProps {
  title: string;
  accent?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Panel({ title, accent = 'var(--primary)', right, children, style }: PanelProps) {
  return (
    <div
      style={{
        background: 'var(--card-background)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--input-background)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 3,
              height: 14,
              borderRadius: 2,
              background: accent,
              boxShadow: `0 0 8px ${accent}60`,
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
              fontFamily: 'inherit',
            }}
          >
            {title}
          </span>
        </div>
        {right}
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  );
}