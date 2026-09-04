/**
 * ------------------------------------------------------------------
 * ListHttpHandler
 * ------------------------------------------------------------------
 * Lọc và trả về danh sách HTTPS requests đã capture theo method,
 * host, path, status. Output dạng text table để LLM dễ đọc.
 *
 * Các methods chính:
 * - handle() : Lọc requests theo filter và trả về text list
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Types ──
import { NetworkRequest } from '../types/inspector';

// ─── Types ──────────────────────────────────────────────────────────────
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

// ─── Class ──────────────────────────────────────────────────────────────
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
    allRequests?: NetworkRequest[],
  ): ListHttpResult {
    const lowerMethod = filter.method?.toUpperCase();
    const lowerHost = filter.host?.toLowerCase();
    const lowerPath = filter.path?.toLowerCase();
    const filterStatus = filter.status;

    // Create stable index map from the original unfiltered list so hidden
    // requests keep their original position instead of being renumbered.
    const baseRequests = allRequests ?? requests;
    const stableIndexMap = new Map<string, number>();
    baseRequests.forEach((r, idx) => {
      stableIndexMap.set(r.id, idx + 1);
    });

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

    // Build text list
    const rows = limited.map((r) => {
      const stableIndex = stableIndexMap.get(r.id) || 0; // Use stable index instead of array position
      const method = r.method;
      const status = String(r.status ?? '---');
      const host = r.host || '';
      const path = r.path || '';
      const size = r.size || 'Unknown';
      return `- request_${stableIndex} | ${method} | ${status} | ${host} | ${path} | ${size}`;
    });

    const text = [
      `[list_https] Total: ${total}, Filtered: ${filtered.length}, Showing: ${limited.length}`,
      ...rows,
    ].join('\n');

    return {
      total,
      filtered: filtered.length,
      text,
    };
  }
}
