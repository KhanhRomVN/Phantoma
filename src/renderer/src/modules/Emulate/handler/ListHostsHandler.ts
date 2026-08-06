/**
 * ListHostsHandler — Trả về danh sách unique hosts từ captured HTTPS traffic.
 *
 * Usage:
 *   const handler = new ListHostsHandler();
 *   const result = handler.handle(requests);
 *
 * Kết quả trả về dạng text table với stt, host, count.
 */

// TYPE
import { NetworkRequest } from '../types/inspector';

export interface ListHostsResult {
  total: number;
  text: string;
}

export class ListHostsHandler {
  public handle(requests: NetworkRequest[]): ListHostsResult {
    // Đếm requests theo host
    const hostMap = new Map<string, number>();
    for (const r of requests) {
      const host = r.host || '(unknown)';
      hostMap.set(host, (hostMap.get(host) || 0) + 1);
    }

    // Sắp xếp theo count giảm dần
    const sorted = [...hostMap.entries()].sort((a, b) => b[1] - a[1]);

    // Build text table
    const header = `| stt | host | count |`;
    const separator = `|-----|------|-------|`;
    const rows = sorted.map(([host, count], i) => {
      const h = host.substring(0, 50).padEnd(50);
      const c = String(count).padEnd(5);
      return `| ${String(i).padEnd(3)} | ${h} | ${c} |`;
    });

    const text = [
      `[list_hosts] Total unique hosts: ${sorted.length}`,
      header,
      separator,
      ...rows,
    ].join('\n');

    return {
      total: sorted.length,
      text,
    };
  }
}
