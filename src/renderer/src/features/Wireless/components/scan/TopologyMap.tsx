// ============================================================================
// TopologyMap — Network topology mini-map
// ============================================================================

import type { WiFiNetwork, Encryption } from '../../types';
import { ENC_PALETTE } from '../../constants';
import { Panel } from '../shared/Panel';

interface TopologyMapProps {
  networks: WiFiNetwork[];
}

export function TopologyMap({ networks }: TopologyMapProps) {
  return (
    <Panel title="Network Topology · Detected Infrastructure" accent="var(--primary)">
      <div
        style={{
          position: 'relative',
          height: 180,
          background: 'var(--input-background)',
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      >
        {/* Grid lines */}
        {[...Array(5)].map((_, i) => (
          <div
            key={`h${i}`}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${(i + 1) * 20}%`,
              height: 1,
              background: '#1a223630',
            }}
          />
        ))}
        {[...Array(7)].map((_, i) => (
          <div
            key={`v${i}`}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${(i + 1) * 14}%`,
              width: 1,
              background: '#1a223630',
            }}
          />
        ))}
        {/* Center label */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: '#3686ff15',
            border: '1px solid #3686ff40',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
          }}
        >
          📡
        </div>

        {/* Network nodes */}
        {networks.slice(0, 8).map((net, i) => {
          const angle = (i / Math.min(networks.length, 8)) * Math.PI * 2;
          const radius = 60 + (net.signal + 100) * 0.3;
          const x = 50 + Math.cos(angle) * (radius / 3);
          const y = 50 + Math.sin(angle) * (radius / 2.5);
          const col = ENC_PALETTE[net.encryption].color;
          return (
            <div
              key={net.id}
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  border: `1px solid ${col}20`,
                }}
              />
              <div
                style={{
                  width: Math.max(7, (net.clients.length + 1) * 3),
                  height: Math.max(7, (net.clients.length + 1) * 3),
                  borderRadius: '50%',
                  background: `${col}20`,
                  border: `1px solid ${col}60`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 7,
                  boxShadow: `0 0 8px ${col}30`,
                  cursor: 'default',
                }}
                title={`${net.ssid || '‹hidden›'} (${net.bssid})`}
              >
                {net.clients.length > 0 ? net.clients.length : ''}
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '100%',
                  transform: 'translateX(-50%)',
                  marginTop: 4,
                  fontSize: 7,
                  color: col,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  textShadow: '0 1px 3px #07090e',
                }}
              >
                {(net.ssid || '‹hidden›').slice(0, 12)}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        {(Object.keys(ENC_PALETTE) as Encryption[]).map((enc) => {
          const count = networks.filter((n) => n.encryption === enc).length;
          if (!count) return null;
          return (
            <div key={enc} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: ENC_PALETTE[enc].color,
                }}
              />
              <span style={{ fontSize: 8, color: 'var(--text-secondary)' }}>
                {enc.toUpperCase()} ({count})
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}