/**
 * ------------------------------------------------------------------
 * Network Service
 * ------------------------------------------------------------------
 * Interface, gateway, DNS, chất lượng kết nối (độ trễ / jitter / packet loss
 * đo bằng TCP handshake) và số lượng kết nối. IP public chỉ được tra khi
 * cấu hình SYSTEM_PUBLIC_IP_URL (mặc định tắt để không lộ IP ra ngoài).
 * ------------------------------------------------------------------
 */

import net from 'net';
import type { SystemConfig } from '../../config';
import { TTL } from '../../constants';
import type { NetworkDetails, NetworkInterfaceInfo } from '../../types/system.type';
import { TtlCache } from '../../utils/async.util';
import { readTextFile } from '../../utils/file.util';
import { fetchText } from '../../utils/network.util';
import { finiteOrNull } from '../../utils/number.util';
import { isWindows } from '../../utils/platform.util';
import { tryPowerShell } from '../../utils/process.util';
import type { SystemMonitorService } from './system-monitor.service';
import type { SystemProbeService } from './system-probe.service';

type RawInterface = Awaited<ReturnType<SystemProbeService['networkInterfaces']['get']>>[number];

const kindOf = (i: RawInterface): NetworkInterfaceInfo['kind'] => {
  if (i.internal) return 'loopback';
  if (i.virtual) return 'virtual';
  if (i.type === 'wireless') return 'wireless';
  if (i.type === 'wired') return 'wired';
  return 'unknown';
};

export class NetworkService {
  private readonly dns = new TtlCache(TTL.dns, () => this.readDnsServers());
  private readonly publicIp = new TtlCache(TTL.publicIp, () => this.fetchPublicIp());

  constructor(
    private readonly probe: SystemProbeService,
    private readonly monitor: SystemMonitorService,
    private readonly config: SystemConfig,
  ) {}

  async details(): Promise<NetworkDetails> {
    this.monitor.touch(); // đảm bảo có số liệu băng thông tức thời

    const [ifaces, gateway, dnsServers, connections, quality, publicIp] = await Promise.all([
      this.probe.networkInterfaces.get().catch((): RawInterface[] => []),
      this.probe.gateway.get().catch(() => ''),
      this.dns.get().catch((): string[] => []),
      this.probe.connections.get().catch(() => []),
      this.probe.latency.getStale(),
      this.publicIp.get().catch(() => null),
    ]);

    const stats = this.probe.networkSnapshot().length
      ? this.probe.networkSnapshot()
      : await this.probe.networkStats().catch(() => []);
    const statsByIface = new Map(stats.map((s) => [s.iface, s]));

    return {
      interfaces: ifaces.map((i): NetworkInterfaceInfo => {
        const s = statsByIface.get(i.iface);
        return {
          name: i.iface,
          ip4: i.ip4 || null,
          ip6: i.ip6 || null,
          mac: i.mac || null,
          state: i.operstate || 'unknown',
          kind: kindOf(i),
          speedMbps: finiteOrNull(i.speed),
          rxBytes: s?.rx_bytes ?? 0,
          txBytes: s?.tx_bytes ?? 0,
          rxBps: finiteOrNull(s?.rx_sec),
          txBps: finiteOrNull(s?.tx_sec),
          isDefault: i.default,
        };
      }),
      gateway: gateway || null,
      dnsServers,
      publicIp,
      quality,
      connections: {
        total: connections.length,
        established: connections.filter((c) => c.state === 'ESTABLISHED').length,
        listening: connections.filter((c) => c.state === 'LISTEN').length,
      },
    };
  }

  // ─── Internals ────────────────────────────────────────────────────────

  private async readDnsServers(): Promise<string[]> {
    if (isWindows) {
      const out = await tryPowerShell(
        '(Get-DnsClientServerAddress -AddressFamily IPv4).ServerAddresses | Sort-Object -Unique',
      );
      return out
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => net.isIP(l) !== 0);
    }
    const text = (await readTextFile('/etc/resolv.conf')) ?? '';
    const servers = [...text.matchAll(/^nameserver\s+(\S+)/gm)].map((m) => m[1]);
    return [...new Set(servers)];
  }

  private async fetchPublicIp(): Promise<string | null> {
    const url = this.config.publicIpUrl;
    if (!url?.startsWith('https://')) return null; // chỉ hỗ trợ HTTPS
    const text = (await fetchText(url, 3_000)).trim();
    return net.isIP(text) !== 0 ? text : null;
  }
}
