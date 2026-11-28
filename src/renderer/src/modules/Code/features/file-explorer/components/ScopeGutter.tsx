// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect, memo } from 'react';

// ── Utils ──
import { cn } from '@renderer/utils/cn';

// ─── Component ───────────────────────────────────────────────────────────────
export const GutterDot = memo(function GutterDot({
  top,
  dot,
  ring,
  deleted,
  onClick,
}: {
  top: number;
  dot: string;
  ring: string;
  deleted?: boolean;
  onClick?: () => void;
}) {
  if (!deleted) {
    // ── Render ──
    return (
      <span
        onClick={onClick}
        className={cn(
          'absolute right-3 w-2 h-2 rounded-full',
          dot,
          onClick && "pointer-events-auto cursor-pointer after:content-[''] after:absolute after:-inset-1.5",
        )}
        style={{ top }}
      />
    );
  }
  return (
    <span
      onClick={onClick}
      className={cn(
        'absolute right-[9px] inline-flex p-[2px] rounded-[4px] border border-dashed',
        ring,
        onClick && 'pointer-events-auto cursor-pointer',
      )}
      style={{ top: top - 3 }}
    >
      <span className={cn('w-2 h-2 rounded-full shrink-0', dot)} />
    </span>
  );
});

// key: `${root}\n${remoteHash}` — đổi khi default branch có commit mới
export function SelectionBlocks({
  containerRef,
  selectedNodeIds,
}: {
  containerRef: { current: HTMLDivElement | null };
  selectedNodeIds: Set<string>;
}) {
  // ── State ──
  const [blocks, setBlocks] = useState<{ top: number; height: number }[]>([]);

  // ── Effects ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el || selectedNodeIds.size < 2) {
      setBlocks((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    const compute = () => {
      const box = el.getBoundingClientRect();
      const rows = Array.from(el.querySelectorAll<HTMLElement>('[data-node-id]'))
        .filter((r) => selectedNodeIds.has(r.dataset.nodeId ?? ''))
        .map((r) => {
          const b = r.getBoundingClientRect();
          return {
            top: Math.round(b.top - box.top + el.scrollTop),
            bottom: Math.round(b.bottom - box.top + el.scrollTop),
          };
        })
        .sort((a, b) => a.top - b.top);
      const merged: { top: number; bottom: number }[] = [];
      for (const r of rows) {
        const prev = merged[merged.length - 1];
        if (prev && r.top - prev.bottom <= 2) prev.bottom = Math.max(prev.bottom, r.bottom);
        else merged.push({ ...r });
      }
      const next = merged.map((m) => ({ top: m.top, height: m.bottom - m.top }));
      setBlocks((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(compute);
    };
    schedule();
    const mo = new MutationObserver(schedule);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
    };
  }, [containerRef, selectedNodeIds]);

  // ── Render ──
  return (
    <div className="absolute left-0 right-0 top-0 z-10 h-0 pointer-events-none">
      {blocks.map((b, i) => (
        <div
          key={i}
          className="absolute left-1 right-1 rounded border border-dashed border-primary"
          style={{ top: b.top, height: b.height }}
        />
      ))}
    </div>
  );
}
