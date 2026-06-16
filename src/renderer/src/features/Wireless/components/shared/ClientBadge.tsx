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
    <div className="flex items-center gap-1.5 py-1 px-2 bg-input-background border border-border rounded mb-0.5">
      <span className="text-[9px] text-success font-bold">{client.mac}</span>
      <span className="text-[9px] text-text-secondary">{client.vendor}</span>
      <span className="text-[8px] text-warning ml-auto">{client.signal}dBm</span>
      <span className="text-[8px] text-text-secondary">{fmtNum(client.packets)} pkts</span>
    </div>
  );
}