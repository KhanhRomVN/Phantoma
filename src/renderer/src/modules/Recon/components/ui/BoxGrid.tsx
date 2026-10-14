import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from 'react';
import type { RenderedBox } from './types';
import SectionBox from './SectionBox';
import EditOverlay from './EditOverlay';
import { GRID_COLS, GRID_GAP, applyDrag, bottomRow, collides, compact, resolveRects, stepX } from './layout';
import type { DragMode, Rect } from './layout';
import { cn } from '@renderer/shared/utils/cn';

interface Props {
  boxes: RenderedBox[];
  /** Bật chế độ chỉnh bố cục: hiện ô nền + overlay, chặn thao tác vào nội dung box. */
  editing: boolean;
  /** Vùng cuộn dọc chứa lưới, dùng để tự cuộn khi kéo sát mép trên/dưới. */
  scrollRef: RefObject<HTMLElement | null>;
  /** Gọi khi thả ở vị trí hợp lệ, kèm vị trí mới của TOÀN BỘ box (theo thứ tự boxes). */
  onCommit: (rects: Rect[]) => void;
}

interface Preview {
  index: number;
  rect: Rect;
  valid: boolean;
}

interface DragState {
  index: number;
  mode: DragMode;
  start: Rect;
  /** Toạ độ con trỏ so với góc trên trái của lưới lúc bắt đầu kéo. */
  gx: number;
  gy: number;
}

/** Chế độ xem: lưới hàng nhỏ (px) để dồn box sát theo chiều cao thực, không làm tròn lên cả hàng lớn. */
const VIEW_UNIT = 4;

const sameRect = (a: Rect, b: Rect) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/** Lớp ô nền (chỉ hiện khi chỉnh sửa). Memo để không render lại mỗi lần kéo. */
const GridCells = memo(function GridCells({ rows }: { rows: number }) {
  const cells: ReactNode[] = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= GRID_COLS; c++) {
      cells.push(
        <div
          key={`${r}-${c}`}
          className='rounded-md border border-dashed border-text-secondary/30 bg-text-secondary/[0.05] pointer-events-none'
          style={{ gridColumn: c, gridRow: r }}
        />
      );
    }
  }
  return <>{cells}</>;
});

/**
 * Lưới 10 cột đặt box theo x,y,w,h. Khi `editing`, các hàng được tạo liên tục khi cuộn xuống
 * hoặc kéo box xuống dưới. Box không được đè lên nhau: thả ở vị trí đè sẽ trả về chỗ cũ.
 */
export default function BoxGrid({ boxes, editing, scrollRef, onCommit }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const lastRef = useRef<Preview | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [extraRows, setExtraRows] = useState(0);
  const [rowH, setRowH] = useState(36);

  // Ô vuông: chiều cao hàng = chiều rộng một cột
  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const update = () => setRowH(stepX(el.getBoundingClientRect().width) - GRID_GAP);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rects = useMemo(() => resolveRects(boxes.map((b) => b.box)), [boxes]);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [heights, setHeights] = useState<number[]>([]);

  // Chế độ xem: đo chiều cao thực của từng box
  useLayoutEffect(() => {
    if (editing) return;
    const els = itemRefs.current.slice(0, boxes.length);
    const measure = () => {
      const next = els.map((el) => el?.offsetHeight ?? 0);
      setHeights((prev) =>
        prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    els.forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [editing, boxes]);

  // Chế độ xem: quy chiều cao đo được ra số hàng rồi dồn box lên trên
  const viewRects = useMemo(
    () =>
      compact(
        rects.map((r, i) => {
          const step = (rowH + GRID_GAP) / VIEW_UNIT;
          const ui = boxes[i].box.ui;
          const fullPx = r.h * (rowH + GRID_GAP) - GRID_GAP;
          const px =
            ui === 'graph' || ui === 'map'
              ? Math.max(heights[i] ?? 0, fullPx)
              : heights[i]
                ? Math.min(heights[i], fullPx)
                : fullPx;
          return { ...r, y: Math.round((r.y - 1) * step) + 1, h: Math.ceil((px + GRID_GAP) / VIEW_UNIT) };
        })
      ),
    [rects, heights, rowH, boxes]
  );
  const shown = editing
    ? rects.map((r, i) => (preview && preview.index === i ? preview.rect : r))
    : viewRects;
  const rows = Math.max(bottomRow(shown) + 6, 24) + extraRows;
  const dragging = preview !== null;

  // Tắt chế độ chỉnh sửa: dọn trạng thái kéo và số hàng thêm
  useEffect(() => {
    if (editing) return;
    setExtraRows(0);
    setPreview(null);
    dragRef.current = null;
    lastRef.current = null;
  }, [editing]);

  // Tạo thêm hàng khi cuộn tới đáy lưới
  useEffect(() => {
    if (!editing) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) setExtraRows((n) => n + 10);
      },
      { root: scrollRef.current, rootMargin: '0px 0px 200px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [editing, scrollRef, extraRows]);

  // Lắng nghe con trỏ trên window trong lúc kéo (để kéo ra ngoài box vẫn được)
  useEffect(() => {
    if (!dragging) return;

    const cancel = () => {
      dragRef.current = null;
      lastRef.current = null;
      setPreview(null);
    };

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      const grid = gridRef.current;
      if (!d || !grid) return;
      const r = grid.getBoundingClientRect();
      const dx = Math.round((e.clientX - r.left - d.gx) / stepX(r.width));
      const dy = Math.round((e.clientY - r.top - d.gy) / stepX(r.width));
      const rect = applyDrag(d.start, d.mode, dx, dy);
      const others = rects.filter((_, i) => i !== d.index);
      const next: Preview = { index: d.index, rect, valid: !collides(rect, others) };
      lastRef.current = next;
      setPreview(next);

      // Kéo sát mép trên/dưới vùng cuộn thì tự cuộn
      const sc = scrollRef.current;
      if (sc) {
        const sr = sc.getBoundingClientRect();
        if (e.clientY > sr.bottom - 48) sc.scrollTop += 18;
        else if (e.clientY < sr.top + 48) sc.scrollTop -= 18;
      }
    };

    const onUp = () => {
      const d = dragRef.current;
      const last = lastRef.current;
      cancel();
      if (d && last && last.valid && !sameRect(last.rect, d.start)) {
        onCommit(rects.map((r, i) => (i === d.index ? last.rect : r)));
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', onKey);
    };
  }, [dragging, rects, scrollRef, onCommit]);

  const handleStart = (index: number) => (e: ReactPointerEvent<HTMLElement>, mode: DragMode) => {
    if (e.button !== 0) return;
    const grid = gridRef.current;
    if (!grid) return;
    e.preventDefault();
    const r = grid.getBoundingClientRect();
    dragRef.current = {
      index,
      mode,
      start: rects[index],
      gx: e.clientX - r.left,
      gy: e.clientY - r.top,
    };
    const first: Preview = { index, rect: rects[index], valid: true };
    lastRef.current = first;
    setPreview(first);
  };

  return (
    <div className='relative'>
      <div
        ref={gridRef}
        className='grid grid-cols-10 gap-4'
        style={
          {
            '--row-h': `${rowH}px`,
            ...(editing
              ? { gridTemplateRows: `repeat(${rows}, var(--row-h))` }
              : { gridAutoRows: `${VIEW_UNIT}px`, rowGap: 0 }),
          } as unknown as CSSProperties
        }
      >
        {editing && <GridCells rows={rows} />}
        {boxes.map((box, i) => {
          const rect = shown[i];
          const isActive = preview?.index === i;
          return (
            <div
              key={`${box.box.id || box.label}-${i}`}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className={cn(
                'relative min-w-0 flex flex-col [&>*:first-child]:flex-1',
                editing ? (isActive ? 'z-30' : 'z-10') : 'self-start'
              )}
              style={{
                gridColumn: `${rect.x} / span ${rect.w}`,
                gridRow: `${rect.y} / span ${rect.h}`,
                ...(!editing && (box.box.ui === 'graph' || box.box.ui === 'map')
                  ? { minHeight: rects[i].h * (rowH + GRID_GAP) - GRID_GAP }
                  : {}),
              }}
            >
              <SectionBox box={box} />
              {editing && (
                <EditOverlay
                  dragging={isActive}
                  invalid={isActive && !preview.valid}
                  onStart={handleStart(i)}
                />
              )}
            </div>
          );
        })}
      </div>
      {editing && <div ref={sentinelRef} className='h-px' />}
    </div>
  );
}