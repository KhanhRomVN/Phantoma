import React from 'react';

export const UsageCircle: React.FC<{ pct: number; color: string }> = ({ pct, color }) => {
  const R = 6;
  const circ = 2 * Math.PI * R;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
      <circle cx="8" cy="8" r={R} fill="none" stroke="rgba(128,128,128,0.2)" strokeWidth="2.5" />
      <circle
        cx="8"
        cy="8"
        r={R}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        transform="rotate(-90 8 8)"
      />
    </svg>
  );
};