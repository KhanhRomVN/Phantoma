/**
 * Drag & drop (move a tab to a pane/quadrant) and divider resizing.
 *
 * Drop model: the content area is split into 4 quadrants. Dropping a tab on a
 * quadrant moves it into that pane — creating the pane if it was empty.
 */

import { useCallback, useEffect, useState, type DragEvent, type RefObject } from 'react';
import type { PaneId, ResizeHandle } from './workspaceLayout';

interface Options {
  contentRef: RefObject<HTMLDivElement | null>;
  /** Dragging is only useful with at least 2 panels. */
  panelCount: number;
  /** Resolve the pane under a point (percentages of the content area). */
  getPaneAt: (xPct: number, yPct: number) => PaneId;
  onMove: (panelId: string, to: PaneId) => void;
  onResize: (handle: ResizeHandle, valuePct: number) => void;
}

export function useWorkspaceInteractions({
  contentRef,
  panelCount,
  getPaneAt,
  onMove,
  onResize,
}: Options) {
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<PaneId | null>(null);
  const [resizing, setResizing] = useState<ResizeHandle | null>(null);

  // ─── Drag & drop ────────────────────────────────────────────────────

  const resetDrag = useCallback(() => {
    setDragSourceId(null);
    setDropTarget(null);
  }, []);

  const handleDragStart = useCallback(
    (e: DragEvent, id: string) => {
      if (panelCount < 2) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
      setDragSourceId(id);
    },
    [panelCount],
  );

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      if (!dragSourceId || !contentRef.current) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const rect = contentRef.current.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;
      const target = getPaneAt(xPct, yPct);
      setDropTarget((prev) => (prev === target ? prev : target));
    },
    [dragSourceId, contentRef, getPaneAt],
  );

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      if (!contentRef.current?.contains(e.relatedTarget as Node | null)) {
        setDropTarget(null);
      }
    },
    [contentRef],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      if (!dragSourceId) return;
      e.preventDefault();
      if (dropTarget) onMove(dragSourceId, dropTarget);
      resetDrag();
    },
    [dragSourceId, dropTarget, onMove, resetDrag],
  );

  // ─── Resize ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!resizing) return undefined;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = contentRef.current?.getBoundingClientRect();
      if (!rect) return;
      const value =
        resizing === 'col'
          ? ((e.clientX - rect.left) / rect.width) * 100
          : ((e.clientY - rect.top) / rect.height) * 100;
      onResize(resizing, value);
    };
    const handleMouseUp = () => setResizing(null);

    // Prevent text selection while resizing
    document.body.style.userSelect = 'none';
    document.body.style.cursor = resizing === 'col' ? 'col-resize' : 'row-resize';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, contentRef, onResize]);

  return {
    dragSourceId,
    dropTarget,
    resizing,
    startResize: setResizing,
    handleDragStart,
    handleDragEnd: resetDrag,
    /** Spread onto the content container. */
    containerDragProps: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
