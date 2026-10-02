/**
 * Drag & drop (move a tab to a pane/quadrant) and divider resizing.
 *
 * Drop model: the content area is split into 4 quadrants. Dropping a tab on a
 * quadrant moves it into that pane — creating the pane if it was empty.
 *
 * Tab dragging is implemented with plain mouse events (NOT the HTML5 drag &
 * drop API). HTML5 DnD gets cancelled by Chromium/Electron when the DOM
 * changes inside `dragstart` (e.g. a shield overlay rendered on top of the
 * source tab), and it also breaks over iframes/webviews and under
 * `-webkit-app-region: drag`. Mouse events on `window` have none of these
 * problems and the floating "ghost" always follows the cursor.
 */

import { useCallback, useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';
import type { PaneId, ResizeHandle } from '../utils/workspaceLayout';

interface Options {
  contentRef: RefObject<HTMLDivElement | null>;
  /** Resolve the pane under a point (percentages of the content area). */
  getPaneAt: (xPct: number, yPct: number) => PaneId;
  onMove: (panelId: string, to: PaneId) => void;
  onResize: (handle: ResizeHandle, valuePct: number) => void;
}

/** Mouse must travel this far (px) before a press on a tab counts as a drag. */
const DRAG_THRESHOLD = 5;

export function useWorkspaceInteractions({ contentRef, getPaneAt, onMove, onResize }: Options) {
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<PaneId | null>(null);
  const [resizing, setResizing] = useState<ResizeHandle | null>(null);

  // Always read the latest callbacks without re-binding window listeners mid-drag
  const getPaneAtRef = useRef(getPaneAt);
  getPaneAtRef.current = getPaneAt;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  // Tears down the drag in progress (listeners, ghost, body styles). null = idle.
  const cancelRef = useRef<(() => void) | null>(null);

  // ─── Tab drag ───────────────────────────────────────────────────────

  /** Pane under a screen point, or null when the point is outside the content area. */
  const paneFromPoint = useCallback(
    (clientX: number, clientY: number): PaneId | null => {
      const rect = contentRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return null;
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return null;
      }
      const xPct = ((clientX - rect.left) / rect.width) * 100;
      const yPct = ((clientY - rect.top) / rect.height) * 100;
      return getPaneAtRef.current(xPct, yPct);
    },
    [contentRef],
  );

  const startTabDrag = useCallback(
    (e: MouseEvent, id: string) => {
      if (e.button !== 0) return; // left button only
      cancelRef.current?.(); // never run two drags at once

      const tabEl = e.currentTarget as HTMLElement;
      const tabRect = tabEl.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const grabX = startX - tabRect.left; // keep the grab point under the cursor
      const grabY = startY - tabRect.top;

      let started = false;
      let ghost: HTMLElement | null = null;

      const placeGhost = (x: number, y: number) => {
        if (ghost) ghost.style.transform = `translate(${x - grabX}px, ${y - grabY}px)`;
      };

      const createGhost = () => {
        // Visual copy of the tab; lives on <body> so no stacking context can hide it
        ghost = tabEl.cloneNode(true) as HTMLElement;
        ghost.removeAttribute('draggable');
        Object.assign(ghost.style, {
          position: 'fixed',
          left: '0px',
          top: '0px',
          width: `${tabRect.width}px`,
          height: `${tabRect.height}px`,
          margin: '0',
          zIndex: '2147483647',
          pointerEvents: 'none',
          opacity: '0.9',
          cursor: 'grabbing',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          willChange: 'transform',
        });
        document.body.appendChild(ghost);
      };

      const cleanup = () => {
        window.removeEventListener('mousemove', onMouseMove, true);
        window.removeEventListener('mouseup', onMouseUp, true);
        window.removeEventListener('keydown', onKeyDown, true);
        window.removeEventListener('blur', cleanup);
        ghost?.remove();
        ghost = null;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        cancelRef.current = null;
        setDragSourceId(null);
        setDropTarget(null);
      };

      function onMouseMove(ev: globalThis.MouseEvent) {
        // Button was released somewhere we couldn't see (e.g. outside the window)
        if (ev.buttons === 0) return cleanup();

        if (!started) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return;
          started = true;
          createGhost();
          document.body.style.userSelect = 'none';
          document.body.style.cursor = 'grabbing';
          setDragSourceId(id);
        }
        ev.preventDefault();
        placeGhost(ev.clientX, ev.clientY);
        const target = paneFromPoint(ev.clientX, ev.clientY);
        setDropTarget((prev) => (prev === target ? prev : target));
      }

      function onMouseUp(ev: globalThis.MouseEvent) {
        if (started) {
          const target = paneFromPoint(ev.clientX, ev.clientY);
          if (target) onMoveRef.current(id, target);

          // The browser fires a click right after mouseup — swallow it so the
          // drop doesn't also (de)select a tab.
          const swallow = (c: globalThis.MouseEvent) => {
            c.stopPropagation();
            c.preventDefault();
          };
          window.addEventListener('click', swallow, { capture: true, once: true });
          setTimeout(() => window.removeEventListener('click', swallow, true), 0);
        }
        cleanup();
      }

      function onKeyDown(ev: KeyboardEvent) {
        if (ev.key === 'Escape') cleanup(); // Esc cancels the drag
      }

      cancelRef.current = cleanup;
      window.addEventListener('mousemove', onMouseMove, true);
      window.addEventListener('mouseup', onMouseUp, true);
      window.addEventListener('keydown', onKeyDown, true);
      window.addEventListener('blur', cleanup);
    },
    [paneFromPoint],
  );

  // Never leave listeners / ghost behind if the workspace unmounts mid-drag
  useEffect(() => () => cancelRef.current?.(), []);

  // ─── Resize ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!resizing) return undefined;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
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
    /** Call from the tab's onMouseDown: `onMouseDown={(e) => startTabDrag(e, id)}` */
    startTabDrag,
  };
}
