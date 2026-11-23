import {
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Plus,
  Eye,
  SlidersHorizontal,
  Folder,
  FolderPlus,
  Settings,
  Search as SearchIcon,
  EyeOff,
  FolderTree,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { ProjectLogoImage } from '../ProjectLogo';
import type { ProjectExtended, GroupInfo } from '../../types/project-panel.types';

const headerBtn =
  'w-[26px] h-[26px] rounded-md flex items-center justify-center transition-colors cursor-pointer relative';
const headerBtnIdle = 'text-text-secondary hover:bg-card-hover hover:text-text-primary';
const headerBtnOn = 'text-[#ff6a1f] bg-[rgba(255,106,31,0.1)]';

interface ProjectToolbarProps {
  shownCount: number;
  projects: ProjectExtended[];
  groups: GroupInfo[];
  treeOpen: boolean;
  setTreeOpen: (fn: (v: boolean) => boolean) => void;
  closeTree: () => void;
  onToggleProjectHidden: (id: string) => void;
  onCreateGroup: () => void;
  anyOpen: boolean;
  onToggleExpandAll: () => void;
  isDirty: boolean;
  onOpenFilterMenu: (pos: { top: number; left: number }) => void;
  onAddProject: () => void;
  isSettingsOpen: boolean;
  onOpenSettings: () => void;
  query: string;
  setQuery: (value: string) => void;
}

export function ProjectToolbar({
  shownCount,
  projects,
  groups,
  treeOpen,
  setTreeOpen,
  closeTree,
  onToggleProjectHidden,
  onCreateGroup,
  anyOpen,
  onToggleExpandAll,
  isDirty,
  onOpenFilterMenu,
  onAddProject,
  isSettingsOpen,
  onOpenSettings,
  query,
  setQuery,
}: ProjectToolbarProps) {
  return (
    <>
      {/* Header */}
      <div className="relative px-3 h-[44px] flex items-center justify-between border-b border-border shrink-0">
        <b className="text-[13px] font-semibold text-text-primary font-display">
          Projects
          <span className="font-medium text-[10.5px] font-mono text-text-secondary/50 ml-1.5">
            {shownCount}
          </span>
        </b>
        <div className="flex gap-0.5 items-center">
          {/* Project visibility tree */}
          <div>
            <button
              onClick={() => setTreeOpen((v) => !v)}
              className={cn(headerBtn, treeOpen ? headerBtnOn : headerBtnIdle)}
              title="Show / hide projects"
            >
              <FolderTree className="w-3.5 h-3.5" />
            </button>
            {treeOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={closeTree} />
                <div className="absolute right-3 top-full mt-1 z-50 w-[260px] max-h-[320px] overflow-y-auto rounded-lg border border-border bg-panel-background p-1 shadow-lg">
                  {[
                    ...groups.map((g) => ({ id: g.id, name: g.name })),
                    { id: '', name: 'Ungrouped' },
                  ].map((g) => {
                    const members = projects.filter((p) =>
                      g.id ? p.groupId === g.id : !groups.some((x) => x.id === p.groupId),
                    );
                    if (members.length === 0) return null;
                    return (
                      <div key={g.id || 'ungrouped'}>
                        <div className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary/70">
                          <ChevronDown className="w-3 h-3" />
                          {g.name}
                        </div>
                        <div className="pl-3">
                          {members.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => onToggleProjectHidden(p.id)}
                              className={cn(
                                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-card-hover',
                                p.hidden ? 'text-text-secondary/50' : 'text-text-primary',
                              )}
                            >
                              {p.logoPath ? (
                                <ProjectLogoImage
                                  path={p.logoPath}
                                  side={32}
                                  className="w-3.5 h-3.5 shrink-0 rounded-[3px] object-contain"
                                  fallback={<Folder className="w-3.5 h-3.5 shrink-0" />}
                                />
                              ) : (
                                <Folder className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span className="flex-1 truncate">{p.name}</span>
                              {p.hidden ? (
                                <EyeOff className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <Eye className="w-3.5 h-3.5 shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Create New Group Button */}
          <button
            onClick={onCreateGroup}
            className={cn(headerBtn, headerBtnIdle)}
            title="Create new group"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>

          {/* Expand / Collapse all */}
          <button
            onClick={onToggleExpandAll}
            className={cn(headerBtn, headerBtnIdle)}
            title={anyOpen ? 'Collapse all' : 'Expand all'}
          >
            {anyOpen ? (
              <ChevronsUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronsDown className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Filter & sort */}
          <button
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onOpenFilterMenu({ top: r.bottom + 4, left: r.left - 130 });
            }}
            className={cn(headerBtn, isDirty ? headerBtnOn : headerBtnIdle)}
            title="Filter & sort"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {isDirty && (
              <i className="absolute top-[3px] right-[3px] w-1.5 h-1.5 rounded-full bg-[#ff6a1f]" />
            )}
          </button>

          {/* Add project */}
          <button
            onClick={onAddProject}
            className={cn(headerBtn, headerBtnIdle)}
            title="Add project"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className={cn(headerBtn, isSettingsOpen ? headerBtnOn : headerBtnIdle)}
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
        <SearchIcon className="w-3.5 h-3.5 shrink-0 text-text-secondary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects"
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs text-text-primary outline-none ring-0 placeholder:text-text-secondary/60 focus:outline-none focus:ring-0"
        />
      </div>
    </>
  );
}