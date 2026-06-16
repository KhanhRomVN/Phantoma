// ============================================================================
// ChannelChart — 2.4 GHz channel utilization visualizer (Redesigned)
// ============================================================================

import type { WiFiNetwork } from '../../types';
import { Panel } from '../shared/Panel';
import { useState } from 'react';

interface ChannelChartProps {
  networks: WiFiNetwork[];
}

export function ChannelChart({ networks }: ChannelChartProps) {
  const [hoveredChannel, setHoveredChannel] = useState<number | null>(null);
  const channels = Array.from({ length: 13 }, (_, i) => i + 1);
  const byChan = (ch: number) =>
    networks.filter((n) => n.channel === ch || n.channel === ch - 1 || n.channel === ch + 1);
  const maxCount = Math.max(
    1,
    ...channels.map((ch) => networks.filter((n) => n.channel === ch).length),
  );

  return (
    <div className="bg-card-background rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-card-background to-input-background">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
          <h3 className="text-sm font-bold text-text-primary tracking-wide">Channel Utilization</h3>
          <span className="text-[10px] text-text-secondary ml-auto">2.4 GHz Spectrum</span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-end gap-2 h-28 px-1">
          {channels.map((ch) => {
            const direct = networks.filter((n) => n.channel === ch);
            const overlap = byChan(ch).filter((n) => n.channel !== ch);
            const directH = (direct.length / maxCount) * 70;
            const overlapH = (overlap.length / maxCount) * 60;
            const isRecommended = direct.length === 0 && (ch === 1 || ch === 6 || ch === 11);
            const isHovered = hoveredChannel === ch;
            return (
              <div
                key={ch}
                className="flex flex-col items-center gap-1 flex-1 group"
                onMouseEnter={() => setHoveredChannel(ch)}
                onMouseLeave={() => setHoveredChannel(null)}
              >
                <div className="relative h-20 w-full flex flex-col justify-end">
                  {overlapH > 0 && (
                    <div
                      className="w-full absolute bottom-0 rounded-t transition-all duration-300"
                      style={{
                        height: overlapH,
                        background: 'linear-gradient(180deg, rgba(167, 139, 250, 0.15) 0%, rgba(167, 139, 250, 0.05) 100%)',
                        borderTop: '1px solid rgba(167, 139, 250, 0.3)',
                        transform: isHovered ? 'scaleX(1.02)' : 'scaleX(1)',
                      }}
                    />
                  )}
                  <div
                    className="w-full rounded-t transition-all duration-300 cursor-pointer"
                    style={{
                      height: Math.max(directH, direct.length > 0 ? 6 : 0),
                      background: direct.length >= 2
                        ? 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)'
                        : direct.length === 1
                          ? 'linear-gradient(180deg, #3686ff 0%, #2563eb 100%)'
                          : isRecommended
                            ? 'linear-gradient(180deg, rgba(52, 211, 153, 0.3) 0%, rgba(52, 211, 153, 0.1) 100%)'
                            : 'transparent',
                      border: isRecommended ? '1px dashed rgba(52, 211, 153, 0.5)' : 'none',
                      boxShadow: direct.length > 0 ? `0 0 8px ${direct.length >= 2 ? '#ef444450' : '#3686ff40'}` : 'none',
                      transform: isHovered ? 'scaleX(1.02)' : 'scaleX(1)',
                    }}
                  />
                </div>
                <span
                  className="text-[11px] font-mono transition-colors"
                  style={{
                    color: isRecommended ? '#34d399' : direct.length > 0 ? '#c8d6f0' : '#6a7a9a',
                    fontWeight: direct.length > 0 ? 700 : 400,
                  }}
                >
                  {ch}
                </span>
                {direct.length > 0 && (
                  <span className="text-[9px] text-text-secondary -mt-0.5">{direct.length}</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-primary rounded-sm shadow-sm" />
            <span className="text-[10px] text-text-secondary">Single network</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-error rounded-sm shadow-sm" />
            <span className="text-[10px] text-text-secondary">Congested (≥2)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-success/20 rounded-sm border border-success/50 border-dashed" />
            <span className="text-[10px] text-success">Recommended free channel</span>
          </div>
        </div>
      </div>
    </div>
  );
}