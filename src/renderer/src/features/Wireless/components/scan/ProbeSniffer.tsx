// ============================================================================
// ProbeSniffer — Probe request monitor
// ============================================================================

import type { ProbeEntry } from '../../types';
import { Panel } from '../shared/Panel';

interface ProbeSnifferProps {
  probes: ProbeEntry[];
}

export function ProbeSniffer({ probes }: ProbeSnifferProps) {
  return (
    <Panel title="Probe Request Monitor · Client Tracking" accent="var(--success)">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '130px 90px 150px 60px 50px 70px',
          gap: 5,
          padding: '4px 0',
          borderBottom: '1px solid var(--border)',
          marginBottom: 6,
        }}
      >
        {['CLIENT MAC', 'VENDOR', 'PROBING FOR SSID', 'SIGNAL', 'COUNT', 'LAST SEEN'].map((h) => (
          <span
            key={h}
            style={{ fontSize: 7, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.1em' }}
          >
            {h}
          </span>
        ))}
      </div>
      {probes.map((p, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '130px 90px 150px 60px 50px 70px',
            gap: 5,
            padding: '5px 0',
            borderBottom: '1px solid var(--divider)',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 9, color: 'var(--primary)', fontWeight: 600 }}>{p.mac}</span>
          <span style={{ fontSize: 8, color: 'var(--text-secondary)' }}>{p.vendor}</span>
          <span
            style={{
              fontSize: 9,
              color: p.ssid ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontStyle: p.ssid ? 'normal' : 'italic',
            }}
          >
            {p.ssid || '‹broadcast›'}
          </span>
          <span style={{ fontSize: 9, color: p.signal >= -60 ? 'var(--success)' : 'var(--warning)' }}>
            {p.signal}dBm
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{p.count}</span>
          <span style={{ fontSize: 8, color: 'var(--text-secondary)' }}>{p.timestamp}</span>
        </div>
      ))}
    </Panel>
  );
}