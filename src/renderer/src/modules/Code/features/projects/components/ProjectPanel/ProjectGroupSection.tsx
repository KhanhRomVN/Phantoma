import { useRef, useEffect, useMemo } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { KebabButton } from '../ProjectCard/KebabButton';
import { GroupPickerForm } from './GroupPickerForm';
import type { MenuPosition } from '../../types/session.types';
import { useAccentColors } from '../../utils/accent.util';
import type { GroupInfo, ProjectExtended } from '../../types/project-panel.types';

/** Group header row with inline rename and drag support */
function GroupHeader({
  group,
  count,
  renaming,
  onToggle,
  onOpenMenu,
  onRenameDone,
  onEditClick,
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  group: GroupInfo;
  count: number;
  renaming: boolean;
  onToggle: () => void;
  onOpenMenu: (pos: MenuPosition) => void;
  onRenameDone: (name: string | null) => void;
  onEditClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: DragEvent) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);
  const { accentColors } = useAccentColors();

  useEffect(() => {
    if (renaming) {
      doneRef.current = false;
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming]);

  const finish = (commit: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onRenameDone(commit ? (inputRef.current?.value ?? null) : null);
  };

  // Generate stable random color based on group ID/name hash
  const groupColor = useMemo(() => {
    let hash = 0;
    const str = group.id + group.name;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % accentColors.length;
    return accentColors[idx];
  }, [group.id, group.name, accentColors]);

  return (
    <div
      draggable={draggable}
      data-gid={group.id}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        // Removed 'uppercase' and 'tracking-[0.05em]' to preserve raw case
        'group/gh flex items-center gap-[7px] px-3 py-[7px] border-b border-border cursor-pointer select-none font-mono text-[14px] font-semibold text-text-secondary hover:text-text-primary transition-colors',
        group.open ? 'bg-white/[0.02]' : 'bg-card-background',
        draggable && 'hover:bg-card-hover',
      )}
      style={
        group.open
          ? {
              backgroundImage: `linear-gradient(to left, color-mix(in srgb, ${groupColor} 12%, transparent) 0%, transparent 50%)`,
              backgroundSize: '200% 100%',
              backgroundPosition: '100% 0',
              backgroundRepeat: 'no-repeat',
              animation: 'pp-group-sweep 0.6s ease-out',
            }
          : undefined
      }
      onClick={onToggle}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEditClick?.();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenMenu({ top: e.clientY, left: e.clientX });
      }}
    >
      {group.open ? (
        <ChevronDown className="w-[11px] h-[11px] shrink-0 text-text-secondary/50" />
      ) : (
        <ChevronRight className="w-[11px] h-[11px] shrink-0 text-text-secondary/50" />
      )}

      {renaming ? (
        <input
          ref={inputRef}
          defaultValue={group.name}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') finish(true);
            if (e.key === 'Escape') finish(false);
          }}
          onBlur={() => finish(true)}
          className="flex-1 min-w-0 bg-background border border-[#ff6a1f] rounded-[5px] text-text-primary font-mono text-[11px] font-medium normal-case tracking-normal px-1.5 py-0.5 outline-none"
        />
      ) : (
        <span className="min-w-0 truncate">{group.name}</span>
      )}
      <span className="font-medium text-text-secondary/50">{count}</span>
      <span className="flex-1" />
      <KebabButton onClick={(e) => onOpenMenu({ top: e.clientY, left: e.clientX })} />
    </div>
  );
}

interface ProjectGroupSectionProps {
  group: GroupInfo;
  order: number;
  members: ProjectExtended[];
  editing: boolean;
  renaming: boolean;
  draggingGroup: boolean;
  isDragging: boolean;
  renderCard: (project: ProjectExtended) => ReactNode;
  onToggle: () => void;
  onOpenMenu: (pos: MenuPosition) => void;
  onRenameDone: (name: string | null) => void;
  onEditClick: () => void;
  onUpdate: (iconId: string, name: string) => void;
  onCancelEdit: () => void;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}

export function ProjectGroupSection({
  group: g,
  order,
  members,
  editing,
  renaming,
  draggingGroup,
  isDragging,
  renderCard,
  onToggle,
  onOpenMenu,
  onRenameDone,
  onEditClick,
  onUpdate,
  onCancelEdit,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: ProjectGroupSectionProps) {
  return (
    <div data-gid={g.id} className="shrink-0" style={{ order }}>
      {editing ? (
        <div className="px-2 py-1.5 bg-panel-background/50">
          <GroupPickerForm
            initialIconId={g.iconId || 'folder'}
            initialName={g.name}
            isEditing
            onSave={onUpdate}
            onCancel={onCancelEdit}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
            isDragging={isDragging}
          />
        </div>
      ) : (
        <GroupHeader
          group={g}
          count={members.length}
          renaming={renaming}
          onToggle={onToggle}
          onOpenMenu={onOpenMenu}
          onRenameDone={onRenameDone}
          onEditClick={onEditClick}
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDrop={onDrop}
        />
      )}

      {g.open && !draggingGroup && (
        <div className="pl-2">
          {members.length ? (
            members.map(renderCard)
          ) : (
            <div className="text-center text-text-secondary/50 text-[11.5px] px-2.5 py-4 italic">
              Drop projects here
            </div>
          )}
        </div>
      )}
    </div>
  );
}