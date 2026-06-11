import React from 'react';
import type { Severity } from '../../types/scan-data-point';

interface SeverityBadgeProps {
  severity: Severity;
}

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#ff2d55',
  high: '#ff6b35',
  medium: '#f5a623',
  low: '#0a84ff',
  info: '#30d158',
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const color = SEVERITY_COLORS[severity] || '#6a7a9a';
  return (
    <span
      className="text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 uppercase"
      style={{ color, borderColor: color, backgroundColor: `${color}15` }}
    >
      {severity}
    </span>
  );
}