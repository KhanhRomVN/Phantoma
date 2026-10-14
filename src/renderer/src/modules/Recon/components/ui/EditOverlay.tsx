import type { PointerEvent as ReactPointerEvent } from 'react';
import type { DragMode } from './layout';
import { cn } from '@renderer/shared/utils/cn';

interface Props {
  /** Box này đang được kéo/đổi cỡ. */
  dragging: boolean;
  /** Vị trí xem trước đang đè lên box khác. */
  invalid: boolean;
  onStart: (e: ReactPointerEvent<HTMLElement>, mode: DragMode) => void;
}

// Tay kéo ở 4 viền (dày 6px) và 4 góc (8px), nằm trong box
const HANDLES: { mode: DragMode; className: string }[] = [
  { mode: 'n', className: 'top-0 left-2 right-2 h-1.5 cursor-ns-resize' },
  { mode: 's', className: 'bottom-0 left-2 right-2 h-1.5 cursor-ns-resize' },
  { mode: 'w', className: 'left-0 top-2 bottom-2 w-1.5 cursor-ew-resize' },
  { mode: 'e', className: 'right-0 top-2 bottom-2 w-1.5 cursor-ew-resize' },
  { mode: 'nw', className: 'top-0 left-0 w-2 h-2 cursor-nwse-resize' },
  { mode: 'se', className: 'bottom-0 right-0 w-2 h-2 cursor-nwse-resize' },
  { mode: 'ne', className: 'top-0 right-0 w-2 h-2 cursor-nesw-resize' },
  { mode: 'sw', className: 'bottom-0 left-0 w-2 h-2 cursor-nesw-resize' },
];

/**
 * Lớp phủ trong suốt 100% phủ lên SectionBox khi ở chế độ chỉnh bố cục:
 * chặn mọi thao tác vào nội dung, kéo thân để di chuyển, kéo viền/góc để đổi cỡ.
 */
export default function EditOverlay({ dragging, invalid, onStart }: Props) {
  return (
    <div
      onPointerDown={(e) => onStart(e, 'move')}
      className={cn(
        'absolute inset-0 z-20 rounded-lg border border-dashed cursor-move touch-none select-none transition-colors',
        invalid
          ? 'border-2 border-error bg-error/20'
          : dragging
            ? 'border-2 border-primary bg-primary/10'
            : 'border-transparent hover:border-primary/60 hover:bg-primary/5'
      )}
    >
      {HANDLES.map(({ mode, className }) => (
        <div
          key={mode}
          onPointerDown={(e) => {
            e.stopPropagation();
            onStart(e, mode);
          }}
          className={cn('absolute rounded-sm hover:bg-primary/60 transition-colors', className)}
        />
      ))}
    </div>
  );
}