import { memo } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@renderer/utils/cn';

// ─── Sub-components ─────────────────────────────────────────────────────

/** Kebab button (3 vertical dots). Parent passes the hover-reveal classes. */
export const KebabButton = memo(function KebabButton({
  onClick,
  className,
}: {
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        'w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-text-secondary hover:bg-card-hover hover:text-text-primary transition-opacity cursor-pointer',
        className,
      )}
      title="More actions"
    >
      <MoreVertical className="w-3 h-3" />
    </button>
  );
});
