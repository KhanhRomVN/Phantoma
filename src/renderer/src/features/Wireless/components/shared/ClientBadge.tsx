// ============================================================================
// ClientBadge — WiFi client display row
// ============================================================================

import type { WiFiClient } from '../../types';
import { fmtNum } from '../../utils';

interface ClientBadgeProps {
  client: WiFiClient;
}

export function ClientBadge({ client }: ClientBadgeProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        background: 'var(--input-background)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        marginBottom: 3,
      }}
    >
      <span style={{ fontSize: 9, color: 'var(--success)', fontWeight: 700 }}>{client.mac}</span>
      <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{client.vendor}</span>
      <span style={{ fontSize: 8, color: 'var(--warning)', marginLeft: 'auto' }}>{client.signal}dBm</span>
      <span style={{ fontSize: 8, color: 'var(--text-secondary)' }}>{fmtNum(client.packets)} pkts</span>
    </div>
  );
}