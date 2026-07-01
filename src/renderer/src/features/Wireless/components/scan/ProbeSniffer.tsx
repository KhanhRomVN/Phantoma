// ============================================================================
// ProbeSniffer — Probe request monitor (Redesigned)
// ============================================================================

import type { ProbeEntry } from '../../types';
import { useState } from 'react';

interface ProbeSnifferProps {
  probes: ProbeEntry[];
}

export function ProbeSniffer({ probes }: ProbeSnifferProps) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  return (
    <div className="bg-card-background rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-card-background to-input-background">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-success rounded-full"></div>
          <h3 className="text-sm font-bold text-text-primary tracking-wide">
            Probe Request Monitor
          </h3>
          <span className="text-[10px] text-text-secondary ml-auto">
            Client Tracking · {probes.length} devices
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Header */}
          <div className="grid grid-cols-[140px_100px_160px_70px_60px_90px] gap-2 px-4 py-2.5 border-b border-border bg-input-background/50">
            {['CLIENT MAC', 'VENDOR', 'PROBING FOR SSID', 'SIGNAL', 'COUNT', 'LAST SEEN'].map(
              (h) => (
                <span
                  key={h}
                  className="text-[10px] text-text-secondary font-bold tracking-wide uppercase"
                >
                  {h}
                </span>
              ),
            )}
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {probes.map((p, i) => (
              <div
                key={i}
                className="grid grid-cols-[140px_100px_160px_70px_60px_90px] gap-2 px-4 py-2.5 transition-all duration-150 hover:bg-card-background-hover"
                onMouseEnter={() => setHoveredRow(i)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  transform: hoveredRow === i ? 'scale(1.001)' : 'scale(1)',
                }}
              >
                <span className="text-[11px] text-primary font-mono font-semibold tracking-tight">
                  {p.mac}
                </span>
                <span className="text-[10px] text-text-secondary">{p.vendor}</span>
                <span
                  className="text-[11px] font-mono truncate"
                  style={{
                    color: p.ssid ? $('--text-primary') : $('--text-secondary'),
                    fontStyle: p.ssid ? 'normal' : 'italic',
                  }}
                >
                  {p.ssid || '‹broadcast›'}
                </span>
                <span
                  className="text-[11px] font-mono font-semibold"
                  style={{ color: p.signal >= -60 ? '#10b981' : '#f59e0b' }}
                >
                  {p.signal}dBm
                </span>
                <span className="text-[11px] text-text-secondary font-mono">{p.count}</span>
                <span className="text-[10px] text-text-secondary font-mono">{p.timestamp}</span>
              </div>
            ))}
          </div>

          {probes.length === 0 && (
            <div className="text-center py-8">
              <span className="text-text-secondary text-xs">No probe requests detected</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
