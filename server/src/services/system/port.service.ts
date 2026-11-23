/**
 * ------------------------------------------------------------------
 * Port Service
 * ------------------------------------------------------------------
 * Các cổng mạng đang lắng nghe (TCP LISTEN + UDP) kèm tiến trình sở hữu.
 * IPv4/IPv6 của cùng 1 cổng được gộp lại; nếu có bind wildcard thì coi là "public".
 * ------------------------------------------------------------------
 */

import type { ListeningPort } from '../../types/system.type';
import { isWildcardAddress } from '../../utils/network.util';
import type { SystemProbeService } from './system-probe.service';

const NO_PEER = new Set(['', '0.0.0.0', '::', '*', '0']);

export class PortService {
  constructor(private readonly probe: SystemProbeService) {}

  async list(query?: string): Promise<ListeningPort[]> {
    const conns = await this.probe.connections.get();
    const byKey = new Map<string, ListeningPort>();

    for (const c of conns) {
      const protocol = c.protocol.startsWith('udp') ? 'udp' : 'tcp';
      const port = Number(c.localPort);
      const listening =
        protocol === 'tcp'
          ? c.state === 'LISTEN'
          : NO_PEER.has(c.peerAddress) && NO_PEER.has(c.peerPort);
      if (!listening || !Number.isInteger(port) || port <= 0) continue;

      const wildcard = isWildcardAddress(c.localAddress);
      const key = `${protocol}-${port}`;
      const existing = byKey.get(key);
      if (existing) {
        if (wildcard && existing.exposure === 'local') {
          existing.address = c.localAddress;
          existing.exposure = 'public';
        }
        continue;
      }
      byKey.set(key, {
        port,
        protocol,
        address: c.localAddress,
        pid: c.pid > 0 ? c.pid : null,
        process: c.process ? (c.process.split('/').pop() ?? c.process) : null,
        state: protocol === 'tcp' ? 'LISTEN' : 'OPEN',
        exposure: wildcard || !isLocal(c.localAddress) ? 'public' : 'local',
      });
    }

    const term = query?.toLowerCase();
    return [...byKey.values()]
      .filter(
        (p) => !term || String(p.port).includes(term) || p.process?.toLowerCase().includes(term),
      )
      .sort((a, b) => a.port - b.port);
  }
}

const isLocal = (addr: string): boolean => addr === '::1' || addr.startsWith('127.');
