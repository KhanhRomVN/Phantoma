// ============================================================================
// ChannelChart — 2.4 GHz channel utilization visualizer
// ============================================================================

import type { WiFiNetwork } from '../../types';
import { Panel } from '../shared/Panel';

interface ChannelChartProps {
  networks: WiFiNetwork[];
}

export function ChannelChart({ networks }: ChannelChartProps) {
  const channels = Array.from({ length: 13 }, (_, i) => i + 1);
  const byChan = (ch: number) =>
    networks.filter((n) => n.channel === ch || n.channel === ch - 1 || n.channel === ch + 1);
  const maxCount = Math.max(
    1,
    ...channels.map((ch) => networks.filter((n) => n.channel === ch).length),
  );

  return (
    <Panel title="Channel Utilization · 2.4 GHz" accent="var(--accent-purple)">
      <div
        style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, padding: '0 4px' }}
      >
        {channels.map((ch) => {
          const direct = networks.filter((n) => n.channel === ch);
          const overlap = byChan(ch).filter((n) => n.channel !== ch);
          const directH = (direct.length / maxCount) * 60;
          const overlapH = (overlap.length / maxCount) * 50;
          const isRecommended = direct.length === 0 && (ch === 1 || ch === 6 || ch === 11);
          return (
            <div
              key={ch}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                flex: 1,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  height: 64,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
              >
                {overlapH > 0 && (
                  <div
                    style={{
                      height: overlapH,
                      background: '#a78bfa12',
                      borderTop: '1px solid #a78bfa30',
                      borderRadius: '2px 2px 0 0',
                      width: '100%',
                      position: 'absolute',
                      bottom: 0,
                    }}
                  />
                )}
                <div
                  style={{
                    height: Math.max(directH, direct.length > 0 ? 4 : 0),
                    background:
                      direct.length > 0
                        ? direct.length >= 2
                          ? 'var(--error)'
                          : 'var(--primary)'
                        : isRecommended
                          ? '#34d39915'
                          : 'transparent',
                    borderRadius: '2px 2px 0 0',
                    border: isRecommended ? '1px dashed #34d39940' : 'none',
                    width: '100%',
                    transition: 'height 0.4s',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 8,
                  color: isRecommended ? 'var(--success)' : direct.length > 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: direct.length > 0 ? 700 : 400,
                }}
              >
                {ch}
              </span>
              {direct.length > 0 && (
                <span style={{ fontSize: 7, color: 'var(--text-secondary)' }}>{direct.length}</span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 4, background: 'var(--primary)', borderRadius: 1 }} />
          <span style={{ fontSize: 8, color: 'var(--text-secondary)' }}>Direct</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 4, background: 'var(--error)', borderRadius: 1 }} />
          <span style={{ fontSize: 8, color: 'var(--text-secondary)' }}>Congested</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div
            style={{
              width: 10,
              height: 4,
              background: '#34d39915',
              borderRadius: 1,
              border: '1px dashed #34d39940',
            }}
          />
          <span style={{ fontSize: 8, color: 'var(--success)' }}>Recommended free</span>
        </div>
      </div>
    </Panel>
  );
}