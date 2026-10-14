import type { StatItem, TagGroup, HeatmapCell, DiffItem } from './types';
import { bulletParts, splitProps } from './noteParsers';

function parseSpark(raw?: string): number[] | undefined {
  if (!raw) return undefined;
  const nums = raw
    .split(',')
    .map((s) => parseFloat(s))
    .filter((n) => !isNaN(n));
  return nums.length >= 2 ? nums : undefined;
}

/** Stat: `- Nhãn | Giá trị | Ghi chú | 1,2,3 {color=blue} {tone=ok} {icon=Globe}` (ghi chú và dãy sparkline là tuỳ chọn). */
export function parseStat(body: string): StatItem[] {
  return bulletParts(body)
    .filter((b) => b.parts.length >= 2 && b.parts[0] && b.parts[1])
    .map((b) => ({
      label: b.parts[0],
      value: b.parts[1],
      note: b.parts[2] || undefined,
      spark: parseSpark(b.parts[3]),
      color: b.props.color,
      tone: b.props.tone,
      icon: b.props.icon,
      src: b.props.src?.split(','),
    }));
}

/** Tags: `## Nhóm` rồi các dòng `a, b, c [loại] {color=blue}`. */
export function parseTags(body: string): TagGroup[] {
  const groups: TagGroup[] = [];
  let current: TagGroup | null = null;
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const heading = trimmed.match(/^##\s+(.+)$/);
    if (heading) {
      current = { title: heading[1].trim(), items: [] };
      groups.push(current);
      continue;
    }
    if (!current) {
      current = { title: '', items: [] };
      groups.push(current);
    }
    const { clean, props } = splitProps(trimmed);
    const typeMatch = clean.match(/\[(\w+)\]/);
    const text = typeMatch ? clean.replace(typeMatch[0], '').trim() : clean;
    for (const value of text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)) {
      current.items.push({
        value,
        type: typeMatch?.[1],
        color: props.color,
        src: props.src?.split(','),
      });
    }
  }
  return groups;
}

/** Heatmap: `- Mon | 09 | 12` (hàng | cột | giá trị). */
export function parseHeatmap(body: string): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  for (const b of bulletParts(body)) {
    const col = parseInt(b.parts[1], 10);
    const value = parseFloat(b.parts[2]);
    if (!b.parts[0] || isNaN(col) || isNaN(value)) continue;
    cells.push({ row: b.parts[0], col, value });
  }
  return cells;
}

/** Diff: `- 2025-01-15 | Nameserver | giá trị cũ | giá trị mới`; bỏ trống cũ = thêm mới, bỏ trống mới = xoá. */
export function parseDiff(body: string): DiffItem[] {
  return bulletParts(body)
    .filter((b) => b.parts.length >= 4 && b.parts[0] && b.parts[1])
    .map((b) => ({
      date: b.parts[0],
      field: b.parts[1],
      oldValue: b.parts[2] || undefined,
      newValue: b.parts[3] || undefined,
      src: b.props.src?.split(','),
    }));
}