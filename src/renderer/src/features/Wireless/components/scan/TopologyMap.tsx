// ============================================================================
// TopologyMap — Network topology mini-map (Redesigned)
// ============================================================================

import type { WiFiNetwork, Encryption } from '../../types';
import { ENC_PALETTE } from '../../constants';

interface TopologyMapProps {
  networks: WiFiNetwork[];
}

export function TopologyMap({ networks }: TopologyMapProps) {
  return (
    <div className="bg-card-background rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-card-background to-input-background">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-primary rounded-full"></div>
          <h3 className="text-sm font-bold text-text-primary tracking-wide">Network Topology</h3>
          <span className="text-[10px] text-text-secondary ml-auto">Detected Infrastructure</span>
        </div>
      </div>
      <div className="p-4">
        <div className="relative h-[240px] bg-gradient-to-br from-input-background to-card-background rounded-lg overflow-hidden border border-border shadow-inner">
          {/* Radial grid lines */}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            <circle cx="50%" cy="50%" r="25%" stroke="var(--border)" strokeWidth="0.5" fill="none" />
            <circle cx="50%" cy="50%" r="50%" stroke="var(--border)" strokeWidth="0.5" fill="none" />
            <circle cx="50%" cy="50%" r="75%" stroke="var(--border)" strokeWidth="0.5" fill="none" />
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="var(--border)" strokeWidth="0.5" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="var(--border)" strokeWidth="0.5" />
          </svg>
          
          {/* Center node */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-12 h-12 rounded-full bg-primary/15 border-2 border-primary/50 flex items-center justify-center shadow-lg shadow-primary/20 backdrop-blur-sm">
              <span className="text-lg">📡</span>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap">
              <span className="text-[9px] font-bold text-text-secondary tracking-wide">ACCESS POINTS</span>
            </div>
          </div>

          {/* Network nodes */}
          {networks.slice(0, 12).map((net, i) => {
            const angle = (i / Math.min(networks.length, 12)) * Math.PI * 2;
            const radius = 70 + (net.signal + 100) * 0.35;
            const x = 50 + Math.cos(angle) * (radius / 2.8);
            const y = 50 + Math.sin(angle) * (radius / 2.5);
            const col = ENC_PALETTE[net.encryption].color;
            const size = Math.max(10, Math.min(24, 10 + net.clients.length * 2));
            return (
              <div
                key={net.id}
                className="absolute group cursor-pointer transition-transform hover:scale-110"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div
                  className="absolute inset-[-6px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ border: `1px solid ${col}40`, boxShadow: `0 0 12px ${col}60` }}
                />
                <div
                  className="rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover:shadow-xl"
                  style={{
                    width: size,
                    height: size,
                    background: `${col}25`,
                    border: `2px solid ${col}80`,
                    boxShadow: `0 0 10px ${col}40`,
                  }}
                >
                  <span className="text-[9px] font-bold" style={{ color: col }}>
                    {net.clients.length > 0 ? net.clients.length : '○'}
                  </span>
                </div>
                <div className="absolute left-1/2 top-full -translate-x-1/2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  <div className="bg-card-background/90 backdrop-blur-sm px-2 py-0.5 rounded-md border border-border shadow-sm">
                    <span className="text-[9px] font-mono" style={{ color: col }}>
                      {(net.ssid || '‹hidden›').slice(0, 18)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 mt-4 pt-3 border-t border-border flex-wrap">
          {(Object.keys(ENC_PALETTE) as Encryption[]).map((enc) => {
            const count = networks.filter((n) => n.encryption === enc).length;
            if (!count) return null;
            return (
              <div key={enc} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shadow-sm"
                  style={{ background: ENC_PALETTE[enc].color }}
                />
                <span className="text-[10px] text-text-secondary font-mono">
                  {enc.toUpperCase()} <span className="text-text-primary font-bold">({count})</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}