import { memo, useState, type ReactNode } from 'react';
import { Archive, Trash2 } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { $ } from '@renderer/utils/color';

export const TASK_DRAG_TYPE = 'application/x-phantoma-task';

export type DropIntent = 'archive' | 'delete';

export const INTENT_COLOR: Record<DropIntent, string> = {
  archive: '--warn',
  delete: '--error',
};

interface ZoneProps {
  side: 'left' | 'right';
  intent: DropIntent;
  label: string;
  icon: ReactNode;
  onDropTask: (taskId: string) => void;
  onIntentChange: (intent: DropIntent | null) => void;
}

function Zone({ side, intent, label, icon, onDropTask, onIntentChange }: ZoneProps) {
  const [over, setOver] = useState(false);
  const color = INTENT_COLOR[intent];
  const direction = side === 'left' ? 'right' : 'left';

  return (
    <div
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(TASK_DRAG_TYPE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!over) {
          setOver(true);
          onIntentChange(intent);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setOver(false);
        onIntentChange(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onIntentChange(null);
        const id = e.dataTransfer.getData(TASK_DRAG_TYPE);
        if (id) onDropTask(id);
      }}
      className={cn(
        'fixed top-0 bottom-0 w-48 z-40 flex items-center animate-in fade-in duration-150',
        side === 'left' ? 'left-0 justify-start pl-5' : 'right-0 justify-end pr-5',
      )}
      style={{
        background: `linear-gradient(to ${direction}, ${$(color, over ? 0.4 : 0.22)}, transparent)`,
      }}
    >
      <div
        className="pointer-events-none flex flex-col items-center gap-1.5 text-xs font-semibold transition-opacity"
        style={{ color: $(color), opacity: over ? 1 : 0.7 }}
      >
        {icon}
        {label}
      </div>
    </div>
  );
}

interface TaskDropZonesProps {
  visible: boolean;
  onArchive: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onIntentChange: (intent: DropIntent | null) => void;
}

export const TaskDropZones = memo(function TaskDropZones({
  visible,
  onArchive,
  onDelete,
  onIntentChange,
}: TaskDropZonesProps) {
  if (!visible) return null;
  return (
    <>
      <Zone
        side="left"
        intent="archive"
        label="Archive"
        icon={<Archive className="w-5 h-5" />}
        onDropTask={onArchive}
        onIntentChange={onIntentChange}
      />
      <Zone
        side="right"
        intent="delete"
        label="Delete"
        icon={<Trash2 className="w-5 h-5" />}
        onDropTask={onDelete}
        onIntentChange={onIntentChange}
      />
    </>
  );
});

TaskDropZones.displayName = 'TaskDropZones';