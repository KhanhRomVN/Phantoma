/**
 * Traffic Context — Cung cấp tổng quan về toàn bộ host, method, status, type
 * đang có trong session hiện tại để AI luôn nắm được ngữ cảnh traffic.
 *
 * File này được inject vào mọi request (cả request đầu tiên và các request sau).
 * Dữ liệu được bọc trong <traffic_context> XML tag.
 */

export interface TrafficSummary {
  hosts: { value: string; count: number }[];
  methods: { value: string; count: number }[];
  statuses: { value: number; count: number }[];
  types: { value: string; count: number }[];
}

/**
 * Build traffic context string từ dữ liệu traffic hiện tại.
 * Kết quả được bọc trong <traffic_context> XML tag.
 */
export const buildTrafficContext = (data: TrafficSummary): string => {
  // [DEBUG] Log khi build traffic context có dữ liệu — xoá sau khi fix xong
  console.log('[buildTrafficContext] called with data:', {
    hostsCount: data.hosts.length,
    methodsCount: data.methods.length,
    statusesCount: data.statuses.length,
    typesCount: data.types.length,
  });

  const lines: string[] = [];

  lines.push('<traffic_context>');
  lines.push(`Captured traffic summary (${data.hosts.length} hosts, ${data.methods.length} methods, ${data.statuses.length} statuses, ${data.types.length} types):`);

  // Hosts
  if (data.hosts.length > 0) {
    lines.push('Hosts: ' + data.hosts.map(h => `${h.value}(${h.count})`).join(', '));
  }

  // Methods
  if (data.methods.length > 0) {
    lines.push('Methods: ' + data.methods.map(m => `${m.value}(${m.count})`).join(', '));
  }

  // Statuses
  if (data.statuses.length > 0) {
    lines.push('Statuses: ' + data.statuses.map(s => `${s.value}(${s.count})`).join(', '));
  }

  // Types
  if (data.types.length > 0) {
    lines.push('Types: ' + data.types.map(t => `${t.value}(${t.count})`).join(', '));
  }

  lines.push('Note: only values listed above exist in this session. Use them when filtering list_https or list_sources. Data updates in real-time.');
  lines.push('</traffic_context>');

  return lines.join('\n');
};

/**
 * Build empty traffic context (khi chưa có dữ liệu traffic nào).
 */
export const buildEmptyTrafficContext = (): string => {
  // [DEBUG] Log khi build empty traffic context — xoá sau khi fix xong
  console.log('[buildEmptyTrafficContext] called — no traffic data available');

  return [
    '<traffic_context>',
    'No traffic captured yet. Wait for network activity before analyzing.',
    '</traffic_context>',
  ].join('\n');
};