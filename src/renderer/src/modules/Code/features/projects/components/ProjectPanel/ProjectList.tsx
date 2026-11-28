// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import type { DragEvent, ReactNode, RefObject } from 'react';

// ── UI ──
import { ChevronRight, ChevronDown, Folder } from 'lucide-react';

// ── Components ──
import { NewGroupModal } from './modals/NewGroupModal';
import { ProjectGroupSection } from './ProjectGroupSection';

// ── Hooks ──
import { UNGROUP_ID } from '../../hooks/useProjectGroups';

// ── Utils ──
import { cn } from '@renderer/utils/cn';

// ── Types ──
import type { MenuPosition } from '../../types/session.types';
import type { GroupInfo, ProjectExtended } from '../../types/project-panel.types';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface ProjectListProps {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  projects: ProjectExtended[];
  shownProjects: ProjectExtended[];
  groups: GroupInfo[];
  groupFormOpen: boolean;
  editingGroupId: string | null;
  renamingGroupId: string | null;
  ungroupedOpen: boolean;
  ungroupPos: number;
  draggingGroup: boolean;
  dragGroupId: string | undefined;
  renderCard: (project: ProjectExtended) => ReactNode;
  onCreateGroup: (name: string, projectIds: string[]) => void;
  onCancelCreateGroup: () => void;
  onUpdateGroup: (groupId: string, iconId: string, name: string) => void;
  onCancelEditGroup: () => void;
  onEditGroup: (groupId: string) => void;
  onToggleGroup: (groupId: string) => void;
  onToggleUngrouped: () => void;
  onOpenGroupMenu: (groupId: string, pos: MenuPosition) => void;
  onFinishRename: (groupId: string, name: string | null) => void;
  onDragStart: (e: DragEvent, type: 'project' | 'branch' | 'group', id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function ProjectList({
  scrollContainerRef,
  projects,
  shownProjects,
  groups,
  groupFormOpen,
  editingGroupId,
  renamingGroupId,
  ungroupedOpen,
  ungroupPos,
  draggingGroup,
  dragGroupId,
  renderCard,
  onCreateGroup,
  onCancelCreateGroup,
  onUpdateGroup,
  onCancelEditGroup,
  onEditGroup,
  onToggleGroup,
  onToggleUngrouped,
  onOpenGroupMenu,
  onFinishRename,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: ProjectListProps) {
  // ── Derived ──
  const ungrouped = shownProjects.filter((p) => !groups.some((g) => g.id === p.groupId));

  // ── Render ──
  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 min-h-0 overflow-y-auto select-none flex flex-col [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-sm"
    >
      {/* Group Creation Form */}
      {groupFormOpen && (
        <NewGroupModal
          projects={projects}
          groups={groups}
          onSave={onCreateGroup}
          onCancel={onCancelCreateGroup}
        />
      )}

      {shownProjects.length === 0 && groups.length === 0 && !groupFormOpen ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3 opacity-70">
          <div className="w-12 h-12 rounded-xl bg-card-hover border border-border grid place-items-center text-text-secondary">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary mb-1">
              {projects.length === 0 ? 'No projects yet' : 'No matching projects'}
            </p>
            <p className="text-xs text-text-secondary max-w-[200px] mx-auto leading-relaxed">
              {projects.length === 0
                ? 'Create or open a project to get started.'
                : 'Try adjusting your filters or sort order.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {groups.map((g, gi) => (
            <ProjectGroupSection
              key={g.id}
              group={g}
              order={gi < ungroupPos ? gi + 1 : gi + 2}
              members={shownProjects.filter((p) => p.groupId === g.id)}
              editing={editingGroupId === g.id}
              renaming={renamingGroupId === g.id}
              draggingGroup={draggingGroup}
              isDragging={dragGroupId === g.id}
              renderCard={renderCard}
              onToggle={() => onToggleGroup(g.id)}
              onOpenMenu={(pos) => onOpenGroupMenu(g.id, pos)}
              onRenameDone={(name) => onFinishRename(g.id, name)}
              onEditClick={() => onEditGroup(g.id)}
              onUpdate={(iconId, name) => onUpdateGroup(g.id, iconId, name)}
              onCancelEdit={onCancelEditGroup}
              onDragStart={(e) => onDragStart(e, 'group', g.id)}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          ))}

          {ungrouped.length > 0 && (
            <div className="shrink-0" style={{ order: ungroupPos + 1 }}>
              <div
                draggable
                data-gid={UNGROUP_ID}
                onDragStart={(e) => onDragStart(e, 'group', UNGROUP_ID)}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onClick={onToggleUngrouped}
                className={cn(
                  'flex items-center gap-[7px] px-3 py-[7px] border-b border-border cursor-pointer select-none font-mono text-[14px] font-semibold text-text-secondary hover:text-text-primary transition-colors',
                  ungroupedOpen ? 'bg-white/[0.02]' : 'bg-card-background',
                )}
              >
                {ungroupedOpen ? (
                  <ChevronDown className="w-[11px] h-[11px] shrink-0 text-text-secondary/50" />
                ) : (
                  <ChevronRight className="w-[11px] h-[11px] shrink-0 text-text-secondary/50" />
                )}
                <span className="min-w-0 truncate">Ungroup</span>
                <span className="font-medium text-text-secondary/50">{ungrouped.length}</span>
                <span className="flex-1" />
                <span className="w-5 h-5 shrink-0" />
              </div>
              {ungroupedOpen && !draggingGroup && ungrouped.map(renderCard)}
            </div>
          )}
        </>
      )}
    </div>
  );
}