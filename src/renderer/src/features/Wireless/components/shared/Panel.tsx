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
      className="bg-card-background border border-border rounded-md overflow-hidden"
      style={style}
    >
      <div className="flex items-center justify-between py-2.5 px-3.5 border-b border-border bg-input-background">
        <div className="flex items-center gap-2">
          <div
            className="w-[3px] h-3.5 rounded-sm"
            style={{ background: accent, boxShadow: `0 0 8px ${accent}60` }}
          />
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-text-secondary font-mono">
            {title}
          </span>
        </div>
        {right}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}