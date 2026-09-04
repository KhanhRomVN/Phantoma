/**
 * ------------------------------------------------------------------
 * GetFilterHandler
 * ------------------------------------------------------------------
 * Trả về text mô tả filter hiện tại đang áp dụng. Liệt kê tất cả
 * available values từ requests — enabled hiển thị bình thường,
 * disabled kèm (hide). Khớp với UI Filter.tsx.
 *
 * Các methods chính:
 * - handle() : Tạo text mô tả filter từ InspectorFilter và requests
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Types ──
import { InspectorFilter } from '../types/filter.types';
import { NetworkRequest } from '../types/inspector';

// ── Utils ──
import { getRequestCategory } from '../utils/request-classifier.util';

// ─── Class ──────────────────────────────────────────────────────────────
export class GetFilterHandler {
  public handle(filter: InspectorFilter, requests: NetworkRequest[]): string {
    const lines: string[] = [];

    // Available values từ requests (giống Filter.tsx)
    const availableMethods = new Set(requests.map((r) => r.method?.toUpperCase()).filter(Boolean));
    const availableStatuses = new Set(
      requests
        .filter((r) => r.protocol === 'https' && typeof r.status === 'number')
        .map((r) => r.status as number),
    );
    const availableTypes = new Set(requests.map((r) => getRequestCategory(r)).filter(Boolean));

    // Methods — liệt kê tất cả available, disabled kèm (hide)
    if (availableMethods.size > 0) {
      const methodList: string[] = [];
      for (const method of availableMethods) {
        const enabled = filter.methods[method as keyof typeof filter.methods] !== false;
        methodList.push(enabled ? method : `${method}(hide)`);
      }
      lines.push(`Methods: ${methodList.join(', ')}`);
    }

    // Host whitelist
    if (filter.host.whitelist.length > 0) {
      lines.push(`Hosts: ${filter.host.whitelist.join(', ')}`);
    }

    // Path whitelist
    if (filter.path.whitelist.length > 0) {
      lines.push(`Paths: ${filter.path.whitelist.join(', ')}`);
    }

    // Statuses — liệt kê tất cả available, disabled kèm (hide)
    if (availableStatuses.size > 0) {
      const statusList: string[] = [];
      for (const code of availableStatuses) {
        const key = code as number;
        const enabled = filter.status[key] !== false;
        statusList.push(enabled ? String(key) : `${key}(hide)`);
      }
      lines.push(`Statuses: ${statusList.join(', ')}`);
    }

    // ── Types ── — liệt kê tất cả available, disabled kèm (hide)
    if (availableTypes.size > 0) {
      const typeList: string[] = [];
      for (const type of availableTypes) {
        const enabled = filter.type[type as keyof typeof filter.type] !== false;
        typeList.push(enabled ? type : `${type}(hide)`);
      }
      lines.push(`Types: ${typeList.join(', ')}`);
    }

    // Size range
    if (filter.size.min || filter.size.max) {
      const min = filter.size.min || '0';
      const max = filter.size.max || 'inf';
      lines.push(`Size: ${min}-${max}`);
    }

    // Time range
    if (filter.time.min || filter.time.max) {
      const min = filter.time.min || '0';
      const max = filter.time.max || 'inf';
      lines.push(`Time: ${min}-${max}`);
    }

    return lines.join('\n');
  }
}
