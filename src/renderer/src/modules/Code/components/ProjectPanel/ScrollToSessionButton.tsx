/**
 * ------------------------------------------------------------------
 * ScrollToSessionButton — overlay button for out-of-view selection
 * ------------------------------------------------------------------
 * Displayed at the bottom-right corner of ProjectPanel when the
 * currently selected SessionCard is not visible in the viewport.
 * Clicking scrolls to the selected session and centers it vertically.
 * ------------------------------------------------------------------
 */

import { memo, useEffect, useState, useRef } from 'react';
import { ChevronsDown } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';

interface ScrollToSessionButtonProps {
  /** The ID of the currently selected session */
  selectedSessionId: string | null;
  /** Ref to the scrollable container (ProjectPanel content area) */
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

export const ScrollToSessionButton = memo(function ScrollToSessionButton({
  selectedSessionId,
  scrollContainerRef,
}: ScrollToSessionButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const checkIntervalRef = useRef<number>();

  useEffect(() => {
    if (!selectedSessionId || !scrollContainerRef.current) {
      setIsVisible(false);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = undefined;
      }
      return;
    }

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

    // Check immediately
    checkVisibility();

    // Then check periodically (handles dynamic content changes, animations, etc.)
    checkIntervalRef.current = window.setInterval(checkVisibility, 200);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [selectedSessionId, scrollContainerRef]);

  const handleClick = () => {
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
        'bg-sidebar-item-hover/80 backdrop-blur-sm',
        'text-text-secondary hover:text-text-primary',
        'transition-all duration-200',
        'hover:bg-sidebar-item-hover',
        'cursor-pointer',
        'shadow-lg',
      )}
      title="Scroll to selected session"
    >
      <ChevronsDown className="w-5 h-5" />
    </button>
  );
});