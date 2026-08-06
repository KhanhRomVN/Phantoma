/**
 * ListHttpHandler — Lọc và trả về danh sách HTTPS requests đã capture.
 *
 * Usage:
 *   const handler = new ListHttpHandler();
 *   const result = handler.handle(requests, { method: 'GET', host: 'api.example.com' }, 20);
 *
 * Filter hỗ trợ: method, host, path, status
 * Kết quả trả về dạng text table để LLM dễ đọc.
 */

// TYPE
import { NetworkRequest } from '../types/inspector';

export interface ListHttpFilter {
  method?: string;
  host?: string;
  path?: string;
  status?: number;
}

export interface ListHttpResult {
  total: number;
  filtered: number;
  text: string;
}

export class ListHttpHandler {
  /**
   * Lọc danh sách requests theo filter.
   * @param requests  - Danh sách requests đã capture
   * @param filter    - Điều kiện lọc (method, host, path, status)
   * @param limit     - Số lượng kết quả tối đa (mặc định 50)
   */
  public handle(
    requests: NetworkRequest[],
    filter: ListHttpFilter = {},
    limit: number = 50,
  ): ListHttpResult {
    const lowerMethod = filter.method?.toUpperCase();
    const lowerHost = filter.host?.toLowerCase();
    const lowerPath = filter.path?.toLowerCase();
    const filterStatus = filter.status;

    let filtered = requests;

    if (lowerMethod) {
      filtered = filtered.filter((r) => r.method.toUpperCase() === lowerMethod);
    }
    if (lowerHost) {
      filtered = filtered.filter((r) => r.host?.toLowerCase().includes(lowerHost));
    }
    if (lowerPath) {
      filtered = filtered.filter((r) => r.path?.toLowerCase().includes(lowerPath));
    }
    if (filterStatus !== undefined) {
      filtered = filtered.filter((r) => r.status === filterStatus);
    }

    const total = requests.length;
    const limited = filtered.slice(0, limit);

    // Build text table
    const header = `| stt | method | status | host | path |`;
    const separator = `|-----|--------|--------|------|------|`;
    const rows = limited.map((r, i) => {
      const method = r.method.padEnd(6);
      const status = String(r.status ?? '---').padEnd(6);
      const host = (r.host || '').substring(0, 30).padEnd(30);
      const path = (r.path || '').substring(0, 60);
      return `| ${String(i).padEnd(3)} | ${method} | ${status} | ${host} | ${path} |`;
    });

    const text = [
      `[list_https] Total: ${total}, Filtered: ${filtered.length}, Showing: ${limited.length}`,
      header,
      separator,
      ...rows,
    ].join('\n');

    return {
      total,
      filtered: filtered.length,
      text,
    };
  }
}
