// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { memo, useEffect, useState } from 'react';

// ── UI ──
import { ChevronsDown } from 'lucide-react';

// ── Utils ──
import { cn } from '@renderer/utils/cn';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface ScrollToSessionButtonProps {
  /** The ID of the currently selected session */
  selectedSessionId: string | null;
  /** Ref to the scrollable container (ProjectPanel content area) */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const ScrollToSessionButton = memo(function ScrollToSessionButton({
  selectedSessionId,
  scrollContainerRef,
}: ScrollToSessionButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    if (!selectedSessionId || !scrollContainerRef.current) {
      setIsVisible(false);
      return;
    }

    // ── Derived ──
    const checkVisibility = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const card = container.querySelector(`[data-session-id="${selectedSessionId}"]`);
      if (!card) {
        setIsVisible(false);
        return;
      }

      const cardRect = card.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Card is visible if any part of it is within the container's viewport
      const isInView =
        cardRect.top < containerRect.bottom && cardRect.bottom > containerRect.top;

      setIsVisible(!isInView);
    };

    checkVisibility();

    const container = scrollContainerRef.current;
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(checkVisibility);
    };
    container.addEventListener('scroll', schedule, { passive: true });
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(container);
    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(container, { childList: true, subtree: true });

    // ── Render ──
    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener('scroll', schedule);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [selectedSessionId, scrollContainerRef]);

  const handleClick = () => {
    // ── Derived ──
    const container = scrollContainerRef.current;
    if (!container || !selectedSessionId) return;

    const card = container.querySelector(`[data-session-id="${selectedSessionId}"]`);
    if (!card) return;

    const cardRect = card.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Calculate scroll position to center the card vertically in the viewport
    const cardCenter = cardRect.top + cardRect.height / 2;
    const containerCenter = containerRect.top + containerRect.height / 2;
    const scrollOffset = cardCenter - containerCenter;

    container.scrollBy({
      top: scrollOffset,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={handleClick}
      className={cn(
        'fixed bottom-4 right-4 z-50',
        'w-10 h-10 rounded-full',
        'flex items-center justify-center',
        'border-2 border-dashed border-border',
        'bg-card-hover/80 backdrop-blur-sm',
        'text-text-secondary hover:text-text-primary',
        'transition-all duration-200',
        'hover:bg-card-hover',
        'cursor-pointer',
        'shadow-lg',
      )}
      title="Scroll to selected session"
    >
      <ChevronsDown className="w-5 h-5" />
    </button>
  );
});