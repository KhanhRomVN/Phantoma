/**
 * GetTrafficSummaryHandler — Trả về tổng quan distinct values của traffic hiện tại.
 *
 * Usage:
 *   const handler = new GetTrafficSummaryHandler();
 *   const result = handler.handle(requests);
 *
 * Kết quả trả về TrafficSummary với hosts, methods, statuses, types (distinct + count).
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import type { TrafficSummary } from '@renderer/components/RightPanel/Agent/feature/Chat/prompts/emulate';

export class GetTrafficSummaryHandler {
  public handle(requests: NetworkRequest[]): TrafficSummary {
    // [DEBUG] Log khi handler được gọi — xoá sau khi fix xong
    console.log('[GetTrafficSummaryHandler] handle called, requests count:', requests.length);

    const hostMap = new Map<string, number>();
    const methodMap = new Map<string, number>();
    const statusMap = new Map<number, number>();
    const typeMap = new Map<string, number>();

    for (const r of requests) {
      // Host
      const host = r.host || '(unknown)';
      hostMap.set(host, (hostMap.get(host) || 0) + 1);

      // Method
      const method = r.method || 'UNKNOWN';
      methodMap.set(method, (methodMap.get(method) || 0) + 1);

      // Status (chỉ lấy status code, bỏ qua undefined/null)
      if (r.status !== undefined && r.status !== null) {
        statusMap.set(r.status, (statusMap.get(r.status) || 0) + 1);
      }

      // Type
      const type = r.type || 'other';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    }

    // Sắp xếp theo count giảm dần
    const sortByCountDesc = <T>(map: Map<T, number>) =>
      [...map.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));

    const summary: TrafficSummary = {
      hosts: sortByCountDesc(hostMap),
      methods: sortByCountDesc(methodMap),
      statuses: sortByCountDesc(statusMap) as { value: number; count: number }[],
      types: sortByCountDesc(typeMap),
    };

    // [DEBUG] Log kết quả summary — xoá sau khi fix xong
    console.log('[GetTrafficSummaryHandler] summary result:', {
      hostsCount: summary.hosts.length,
      methodsCount: summary.methods.length,
      statusesCount: summary.statuses.length,
      typesCount: summary.types.length,
      isEmpty:
        summary.hosts.length === 0 &&
        summary.methods.length === 0 &&
        summary.statuses.length === 0 &&
        summary.types.length === 0,
    });

    return summary;
  }
}
