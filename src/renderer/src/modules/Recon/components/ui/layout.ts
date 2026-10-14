import type { BoxConfig } from './types';

export const GRID_COLS = 10;
/** Chiều cao một ô và khoảng cách giữa các ô (px); khớp `auto-rows-[36px]` và `gap-4` của lưới. */
export const ROW_HEIGHT = 36;
export const GRID_GAP = 16;

/** Vị trí + kích thước theo đơn vị ô; x, y bắt đầu từ 1 (giống CSS grid). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;

}

export type DragMode = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function collides(rect: Rect, others: Rect[]): boolean {
  return others.some((o) => overlaps(rect, o));
}

/** Dồn các box lên trên: mỗi box (giữ nguyên x, w) trượt lên y nhỏ nhất không va chạm với box đã đặt. */
export function compact(rects: Rect[]): Rect[] {
  const order = rects.map((_, i) => i).sort((a, b) => rects[a].y - rects[b].y || rects[a].x - rects[b].x);
  const placed: Rect[] = [];
  const out = [...rects];
  for (const i of order) {
    let y = 1;
    while (collides({ ...rects[i], y }, placed)) y++;
    out[i] = { ...rects[i], y };
    placed.push(out[i]);
  }
  return out;
}

/** Hàng dưới cùng đang bị chiếm (0 nếu chưa có box). */
export function bottomRow(rects: Rect[]): number {
  return rects.reduce((max, r) => Math.max(max, r.y + r.h - 1), 0);
}

/**
 * Quy đổi cấu hình @box thành vị trí cụ thể.
 * Box có đủ x,y (và không đè box đã đặt) giữ nguyên chỗ; các box còn lại tự xếp
 * lần lượt theo hàng, né các ô đã bị chiếm (mô phỏng cách xếp tự động trước đây).
 */
export function resolveRects(configs: BoxConfig[]): Rect[] {
  const heightOf = (c: BoxConfig) =>
    c.ui === 'graph' || c.ui === 'map'
      ? Math.max(1, Math.min(c.w, GRID_COLS))
      : Math.max(1, c.maxH ?? 3);
  const fixedRects: (Rect | null)[] = [];
  const placed: Rect[] = [];

  configs.forEach((c) => {
    if (c.x === undefined || c.y === undefined) {
      fixedRects.push(null);
      return;
    }
    const w = Math.max(1, Math.min(c.w, GRID_COLS));
    const rect: Rect = {
      x: Math.max(1, Math.min(c.x, GRID_COLS - w + 1)),
      y: Math.max(1, c.y),
      w,
      h: heightOf(c),
    };
    if (collides(rect, placed)) {
      fixedRects.push(null);
      return;
    }
    placed.push(rect);
    fixedRects.push(rect);
  });

  let cx = 1;
  let cy = 1;
  return configs.map((c, i) => {
    const fixed = fixedRects[i];
    if (fixed) return fixed;
    const w = Math.max(1, Math.min(c.w, GRID_COLS));
    const h = heightOf(c);

    for (;;) {
      if (cx + w - 1 > GRID_COLS) {
        cx = 1;
        cy += 1;
      }
      const cand: Rect = { x: cx, y: cy, w, h };
      if (!collides(cand, placed)) {
        placed.push(cand);
        cx += w;
        return cand;
      }
      cx += 1;
    }
  });
}

/** Bước nhảy (px) của một ô theo chiều ngang, từ chiều rộng lưới. */
export function stepX(gridWidth: number): number {
  return (gridWidth + GRID_GAP) / GRID_COLS;
}

/** Bước nhảy (px) của một ô theo chiều dọc. */
export const STEP_Y = ROW_HEIGHT + GRID_GAP;

/** Tính vị trí mới khi kéo `mode` đi (dx, dy) ô so với `start`. Không xét va chạm. */
export function applyDrag(start: Rect, mode: DragMode, dx: number, dy: number): Rect {
  let { x, y, w, h } = start;

  if (mode === 'move') {
    x = Math.max(1, Math.min(start.x + dx, GRID_COLS - start.w + 1));
    y = Math.max(1, start.y + dy);
    return { ...start, x, y, w, h };
  }
  if (mode.includes('e')) {
    w = Math.max(1, Math.min(start.w + dx, GRID_COLS - start.x + 1));
  }
  if (mode.includes('w')) {
    x = Math.max(1, Math.min(start.x + dx, start.x + start.w - 1));
    w = start.x + start.w - x;
  }
  if (mode.includes('s')) {
    h = Math.max(1, start.h + dy);
  }
  if (mode.includes('n')) {
    y = Math.max(1, Math.min(start.y + dy, start.y + start.h - 1));
    h = start.y + start.h - y;
  }
  return { ...start, x, y, w, h };
}

/** Viết lại một dòng `@box`: đặt w/h/x/y, giữ nguyên các tham số khác (ui, icon, desc...). */
function rewriteBoxLine(line: string, r: Rect): string {
  const indent = line.match(/^\s*/)?.[0] ?? '';
  const rest = line.trim().replace(/^@box\s*/, '');
  const kept = (rest.match(/\w+=(?:"[^"]*"|\S+)/g) ?? []).filter((t) => !/^(x|y|w|h|maxh)=/.test(t));
  return `${indent}@box w=${r.w}${/\bui=(graph|map)\b/.test(rest) ? '' : ` maxh=${r.h}`} x=${r.x} y=${r.y}${kept.length ? ' ' + kept.join(' ') : ''}`;
}

/**
 * Ghi lại vị trí/kích thước của MỌI box trong một file .recon (box thứ i ứng với heading `# ` thứ i).
 * Ghi toàn bộ để các box không có x,y không bị xếp lại khi một box khác di chuyển.
 * Box chưa có dòng @box sẽ được chèn dòng mới ngay dưới heading.
 */
export function applyRects(content: string, rects: Rect[]): string {
  const lines = content.split('\n');
  let i = 0;
  if (lines[0]?.trim() === '---') {
    i = 1;
    while (i < lines.length && lines[i].trim() !== '---') i++;
    i++; // bỏ qua dòng --- đóng frontmatter
  }

  let inCode = false;
  let boxIndex = -1;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) inCode = !inCode;
    if (inCode || !/^#\s+(.+)$/.test(line)) continue;

    boxIndex += 1;
    const rect = rects[boxIndex];
    if (!rect) continue;

    let handled = false;
    for (let j = i + 1; j < lines.length; j++) {
      const t = lines[j].trim();
      if (t.startsWith('@box')) {
        lines[j] = rewriteBoxLine(lines[j], rect);
        handled = true;
        break;
      }
      if (t !== '') break;
    }
    if (!handled) {
      lines.splice(i + 1, 0, `@box w=${rect.w} maxh=${rect.h} x=${rect.x} y=${rect.y}`);
    }
  }
  return lines.join('\n');
}