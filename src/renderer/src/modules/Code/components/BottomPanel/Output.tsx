/**
 * ------------------------------------------------------------------
 * Output
 * ------------------------------------------------------------------
 * Empty output panel placeholder. Scrolls to bottom on mount,
 * ready to display build/task output in a monospace text area.
 *
 * Main features:
 * - Auto-scroll to bottom on mount
 * - Monospace font for log readability
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useRef, useEffect } from 'react';

// ─── Component ──────────────────────────────────────────────────────────
export function Output() {
  // ── Refs ──
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Effects ──
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // ── Render ──
  return <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 font-mono text-xs"></div>;
}

export default Output;