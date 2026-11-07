import { memo, useMemo, useState, type ComponentType } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  MonitorUp,
  Search,
  Shuffle,
  XCircle,
} from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { cn } from '@renderer/shared/utils/cn';
import { ProjectIcon, getProjectIdentity } from './ProjectCard';

// ─── Target id helpers (target = branch of a project) ───────────────────
const TARGET_SEPARATOR = '::';

export function toBranchTargetId(projectId: string, branchName: string): string {
  return `${projectId}${TARGET_SEPARATOR}${branchName}`;
}

// Git branch names cannot contain ':' so the last separator is always the real one
export function fromBranchTargetId(targetId: string): { projectId: string; branchName: string } {
  const index = targetId.lastIndexOf(TARGET_SEPARATOR);
  if (index < 0) return { projectId: targetId, branchName: '' };
  return {
    projectId: targetId.slice(0, index),
    branchName: targetId.slice(index + TARGET_SEPARATOR.length),
  };
}

// ─── Types ──────────────────────────────────────────────────────────────
export interface ConflictBranchOption {
  name: string;
  /** Branch is currently open in another window */
  busy: boolean;
}

export interface ConflictProjectOption {
  id: string;
  name: string;
  path: string;
  logoPath?: string | null;
  branches: ConflictBranchOption[];
}

interface ProjectConflictModalProps {
  /** Project that owns the conflicting branch */
  project: { id: string; name: string };
  /** Branch opened in two windows at once */
  branchName: string;
  /** Projects (with their branches) the user can switch to */
  projects: ConflictProjectOption[];
  /** Project with 1 branch → open that branch; 2+ branches → Workspace empty state lists them */
  onSelectProject: (projectId: string) => void;
  onUnselect: () => void;
  /** Ask the other window to release this branch so this window can continue */
  onTakeOver: () => void;
  /** Move focus to the window that holds this branch */
  onFocusOther: () => void;
}

type View = 'main' | 'projects';

// ─── Sub components ─────────────────────────────────────────────────────
type OptionTone = 'sky' | 'emerald' | 'violet' | 'rose';

const OPTION_TONE_CLASS: Record<OptionTone, { card: string; badge: string }> = {
  sky: {
    card: 'focus:border-sky-500/50',
    badge:
      'group-hover:bg-sky-500/10 group-hover:text-sky-500/70 group-focus:bg-sky-500/20 group-focus:text-sky-500',
  },
  emerald: {
    card: 'focus:border-emerald-500/50',
    badge:
      'group-hover:bg-emerald-500/10 group-hover:text-emerald-500/70 group-focus:bg-emerald-500/20 group-focus:text-emerald-500',
  },
  violet: {
    card: 'focus:border-violet-500/50',
    badge:
      'group-hover:bg-violet-500/10 group-hover:text-violet-500/70 group-focus:bg-violet-500/20 group-focus:text-violet-500',
  },
  rose: {
    card: 'focus:border-rose-500/50',
    badge:
      'group-hover:bg-rose-500/10 group-hover:text-rose-500/70 group-focus:bg-rose-500/20 group-focus:text-rose-500',
  },
};

interface OptionCardProps {
  icon: ComponentType<{ className?: string }>;
  tone: OptionTone;
  title: string;
  description?: string;
  onClick: () => void;
  showChevron?: boolean;
}

const OptionCard = memo(function OptionCard({
  icon: Icon,
  title,
  description,
  onClick,
  showChevron,
  tone,
}: OptionCardProps) {
  const toneClass = OPTION_TONE_CLASS[tone];
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 w-full px-3 py-2.5 rounded-md border border-border bg-card-background hover:bg-card-hover text-left cursor-pointer transition-colors outline-none',
        toneClass.card,
      )}
    >
      <span
        className={cn(
          'w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors bg-text-secondary/10 text-text-secondary',
          toneClass.badge,
        )}
      >
        <Icon className="w-4 h-4" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12.5px] text-text-primary">{title}</span>
        {description && (
          <span className="block mt-0.5 text-[11.5px] text-text-secondary leading-snug">
            {description}
          </span>
        )}
      </span>
      {showChevron && <ChevronRight className="w-3.5 h-3.5 text-text-secondary shrink-0" />}
    </button>
  );
});

const ProjectOptionCard = memo(function ProjectOptionCard({
  project,
  disabled,
  onClick,
}: {
  project: ConflictProjectOption;
  disabled: boolean;
  onClick: () => void;
}) {
  const identity = useMemo(
    () => getProjectIdentity(project.id + project.name),
    [project.id, project.name],
  );
  const freeBranches = project.branches.filter((b) => !b.busy).length;
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2 rounded-md border border-border bg-card-background text-left transition-colors shrink-0',
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-card-hover cursor-pointer',
      )}
    >
      <ProjectIcon color={identity.color} Icon={identity.Icon} logoPath={project.logoPath} />
      <span className="flex-1 min-w-0">
        <span className="block text-[12.5px] font-semibold text-text-primary truncate">
          {project.name}
        </span>
        <span className="block text-[11px] text-text-secondary/70 truncate" title={project.path}>
          {project.path}
        </span>
      </span>
      <span className="text-[11px] text-text-secondary shrink-0">
        {disabled ? 'No free branch' : `${freeBranches} ${freeBranches === 1 ? 'branch' : 'branches'}`}
      </span>
      {!disabled && <ChevronRight className="w-3.5 h-3.5 text-text-secondary shrink-0" />}
    </button>
  );
});

// ─── Component ──────────────────────────────────────────────────────────
export const ProjectConflictModal = memo(function ProjectConflictModal({
  projects,
  onSelectProject,
  onUnselect,
  onTakeOver,
  onFocusOther,
}: ProjectConflictModalProps) {
  const [view, setView] = useState<View>('main');
  const [query, setQuery] = useState('');

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q),
    );
  }, [projects, query]);

  const backToMain = () => {
    setQuery('');
    setView('main');
  };

  return (
    <Modal isOpen onClose={onUnselect} className="max-w-md max-h-[calc(100vh-2rem)]">
      <div className="flex items-center gap-3 px-5 pt-5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-text-primary">
            Branch is open in another window
          </h3>
          <p className="mt-1 text-[12.5px] text-text-secondary leading-relaxed">
            Switch to another branch or unselect it to avoid conflicts.
          </p>
        </div>
      </div>

      <div className="px-5 pt-4 pb-5 flex flex-col gap-2 min-h-0 flex-1">
        {view === 'main' && (
          <>
            <OptionCard
              icon={ExternalLink}
              tone="sky"
              title="Go to the other window"
              description="Switch to the window that has this branch open"
              onClick={onFocusOther}
            />
            <OptionCard
              icon={MonitorUp}
              tone="emerald"
              title="Work in this window"
              description="The other window will unselect this branch"
              onClick={onTakeOver}
            />
            {projects.length > 0 && (
              <OptionCard
                icon={Shuffle}
                tone="violet"
                title="Switch to another project or branch"
                description="Pick a project, then one of its available branches"
                onClick={() => setView('projects')}
                showChevron
              />
            )}
            <OptionCard
              icon={XCircle}
              tone="rose"
              title="Unselect branch"
              description="Clear the selection in this window (same as clicking outside)"
              onClick={onUnselect}
            />
          </>
        )}

        {view === 'projects' && (
          <>
            <div className="flex items-center gap-2 shrink-0">
              <button
                aria-label="Back"
                onClick={backToMain}
                className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md border border-border bg-card-background text-text-secondary hover:bg-card-hover hover:text-text-primary cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary/60 pointer-events-none" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full h-8 pl-8 pr-3 rounded-md border border-border bg-card-background text-[12.5px] text-text-primary placeholder:text-text-secondary/60 outline-none focus:border-primary/50"
                />
              </div>
            </div>
            <div className="text-[11px] uppercase tracking-wide text-text-secondary/70 shrink-0">
              Choose a project
            </div>
            <div className="flex flex-col gap-1.5 min-h-0 flex-1 overflow-y-auto">
              {filteredProjects.map((p) => (
                <ProjectOptionCard
                  key={p.id}
                  project={p}
                  disabled={!p.branches.some((b) => !b.busy)}
                  onClick={() => onSelectProject(p.id)}
                />
              ))}
              {filteredProjects.length === 0 && (
                <div className="py-6 text-center text-[12px] text-text-secondary/70">
                  No projects found
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
});