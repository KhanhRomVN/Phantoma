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
  const lines: string[] = [];

  lines.push('<traffic_context>');
  lines.push('## Traffic Overview');
  lines.push('_Dữ liệu bên dưới phản ánh toàn bộ giá trị distinct hiện có trong session. Dùng để biết phạm vi filter khả dụng khi gọi list_https hoặc list_sources._');
  lines.push('');

  // Hosts
  if (data.hosts.length > 0) {
    lines.push('### Hosts');
    lines.push('| host | count |');
    lines.push('|------|-------|');
    for (const h of data.hosts) {
      lines.push(`| ${h.value} | ${h.count} |`);
    }
    lines.push('');
  }

  // Methods
  if (data.methods.length > 0) {
    lines.push('### Methods');
    lines.push('| method | count |');
    lines.push('|--------|-------|');
    for (const m of data.methods) {
      lines.push(`| ${m.value} | ${m.count} |`);
    }
    lines.push('');
  }

  // Statuses (chỉ liệt kê các status hiện có, không bao gồm error nếu không tồn tại)
  if (data.statuses.length > 0) {
    lines.push('### Status Codes');
    lines.push('| status | count |');
    lines.push('|--------|-------|');
    for (const s of data.statuses) {
      lines.push(`| ${s.value} | ${s.count} |`);
    }
    lines.push('');
  }

  // Types
  if (data.types.length > 0) {
    lines.push('### Resource Types');
    lines.push('| type | count |');
    lines.push('|------|-------|');
    for (const t of data.types) {
      lines.push(`| ${t.value} | ${t.count} |`);
    }
    lines.push('');
  }

  // Ghi chú quan trọng
  lines.push('### Lưu ý');
  lines.push('- Chỉ các giá trị được liệt kê ở trên mới tồn tại trong session hiện tại.');
  lines.push('- Khi dùng `filter` trong `list_https` hoặc `list_sources`, chỉ filter theo những giá trị có trong bảng trên.');
  lines.push('- Nếu một status code không có trong bảng Status Codes (vd: 404, 500), điều đó có nghĩa không có request nào trả về status đó — đừng giả định nó tồn tại.');
  lines.push('- Bảng này được cập nhật theo thời gian thực — giá trị có thể thay đổi giữa các request.');
  lines.push('</traffic_context>');

  return lines.join('\n');
};

/**
 * Build empty traffic context (khi chưa có dữ liệu traffic nào).
 */
export const buildEmptyTrafficContext = (): string => {
  return [
    '<traffic_context>',
    '## Traffic Overview',
    '_Chưa có dữ liệu traffic nào được capture. Hãy đợi traffic xuất hiện trước khi phân tích._',
    '',
    '### Hosts',
    '_Chưa có host nào._',
    '',
    '### Methods',
    '_Chưa có method nào._',
    '',
    '### Status Codes',
    '_Chưa có status code nào._',
    '',
    '### Resource Types',
    '_Chưa có resource type nào._',
    '</traffic_context>',
  ].join('\n');
};