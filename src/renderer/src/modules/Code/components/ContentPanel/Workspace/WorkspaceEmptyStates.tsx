/**
 * Empty states:
 *  - EmptyState          → no project selected
 *  - WorkspaceEmptyState → project selected but no panels open
 */

import { memo, useMemo, type ReactNode } from 'react';
import {
  Plus,
  Terminal as TerminalIcon,
  Globe,
  FileText,
  FolderOpen,
  GitBranch,
  MessageSquare,
  LayoutGrid,
} from 'lucide-react';
import { useCodeStore } from '../../../hooks/useCodeStore';

// ─── Shared pieces ────────────────────────────────────────────────────

// Full class names must be written out so Tailwind can detect them.
const ACCENTS = {
  primary: { hover: 'hover:border-primary/50', icon: 'text-primary bg-primary/10 group-hover:bg-primary/20' },
  info: { hover: 'hover:border-info/50', icon: 'text-info bg-info/10 group-hover:bg-info/20' },
  warn: { hover: 'hover:border-warn/50', icon: 'text-warn bg-warn/10 group-hover:bg-warn/20' },
  success: { hover: 'hover:border-success/50', icon: 'text-success bg-success/10 group-hover:bg-success/20' },
  purple: { hover: 'hover:border-purple/50', icon: 'text-purple bg-purple/10' },
} as const;

type Accent = keyof typeof ACCENTS;

function ActionCard({
  icon,
  title,
  subtitle,
  accent,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  accent: Accent;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group flex items-center gap-3 text-left px-3 py-2.5 rounded-xl border border-border bg-card-background transition-all hover:-translate-y-0.5 ${ACCENTS[accent].hover} ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
    >
      <span
        className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 transition-colors ${ACCENTS[accent].icon}`}
      >
        {icon}
      </span>
      <span>
        <strong className="block text-[12.5px] font-medium text-text-primary">{title}</strong>
        <small className="block text-[11px] text-text-secondary">{subtitle}</small>
      </span>
    </button>
  );
}

function Hints({ items }: { items: [key: string, label: string][] }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-6 text-[11px] text-text-secondary">
      {items.map(([key, label]) => (
        <span key={key}>
          <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-card-background mr-1.5">
            {key}
          </kbd>
          {label}
        </span>
      ))}
    </div>
  );
}

/** Stacked-cards artwork with a centered icon. */
function CardStackArt({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-[92px] h-[92px] mb-5">
      <i className="absolute inset-0 rounded-[22px] border border-divider bg-card-background transform rotate-[-8deg]" />
      <i className="absolute inset-0 rounded-[22px] border border-transparent bg-card-hover transform rotate-[5deg]" />
      <i className="absolute inset-0 rounded-[22px] border border-primary/50 bg-card-background shadow-[0_8px_30px_rgba(255,106,31,0.2)] grid place-items-center text-primary">
        {children}
      </i>
    </div>
  );
}

function EmptyStateShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-background relative overflow-hidden p-6">
      {/* Subtle glow background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-primary blur-[130px]" />
      </div>
      <div className="relative z-10 text-center max-w-[580px] w-full flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}

// ─── No project selected ──────────────────────────────────────────────

export const EmptyState = memo(function EmptyState() {
  const setProjectManagerOpen = useCodeStore((s) => s.setProjectManagerOpen);
  const setNewProjectOpen = useCodeStore((s) => s.setNewProjectOpen);
  const projects = useCodeStore((s) => s.projects);
  const setCurrentProject = useCodeStore((s) => s.setCurrentProject);

  // Up to 2 most recent projects
  const recentProjects = useMemo(() => projects.slice(0, 2), [projects]);

  return (
    <EmptyStateShell>
      <CardStackArt>
        <FolderOpen className="w-9 h-9 stroke-[1.4]" />
      </CardStackArt>

      <h1 className="text-[17px] font-semibold text-text-primary mb-1.5">
        Select a project to get started
      </h1>
      <p className="text-sub text-[12.5px] max-w-[420px] text-text-secondary leading-relaxed">
        Projects contain your tasks, sessions, and workspace. Open an existing project or create a
        new one to work with agents.
      </p>

      <div className="grid grid-cols-3 gap-2.5 mt-6 w-full">
        <ActionCard
          accent="info"
          icon={<FolderOpen className="w-4 h-4" />}
          title="Open Project"
          subtitle="Choose folder on disk"
          onClick={() => setProjectManagerOpen(true)}
        />
        <ActionCard
          accent="primary"
          icon={<Plus className="w-4 h-4" />}
          title="New Project"
          subtitle="Create from empty template"
          onClick={() => setNewProjectOpen(true)}
        />
        <ActionCard
          accent="purple"
          icon={<GitBranch className="w-4 h-4" />}
          title="Clone from Git"
          subtitle="Paste repository URL"
          disabled
        />
      </div>

      {recentProjects.length > 0 && (
        <div className="w-full mt-6 text-left">
          <h2 className="text-[11px] font-medium text-text-secondary mb-2 ml-1">Recent</h2>
          <div className="border border-border rounded-xl bg-card-background overflow-hidden">
            {recentProjects.map((project, index) => {
              const branchName = project.branches?.[0]?.name || 'main';
              const sessionCount =
                project.branches?.reduce((acc, b) => acc + (b.sessions?.length || 0), 0) || 0;
              const statusText =
                sessionCount > 0
                  ? `${branchName} · ${sessionCount} session${sessionCount > 1 ? 's' : ''}`
                  : `${branchName} · no active sessions`;

              return (
                <button
                  key={project.id}
                  onClick={() => setCurrentProject(project.id)}
                  className={`w-full flex items-center gap-2.5 h-11 px-3 text-left hover:bg-white/[0.03] transition-colors ${
                    index !== recentProjects.length - 1 ? 'border-b border-divider' : ''
                  }`}
                >
                  <span className="w-6.5 h-6.5 rounded-lg grid place-items-center shrink-0 text-primary bg-primary/10">
                    <GitBranch className="w-3.5 h-3.5" />
                  </span>
                  <span className="flex-1 font-semibold text-[12.5px] text-text-primary truncate">
                    {project.name}
                  </span>
                  <span className="font-mono text-[11px] text-text-secondary">{statusText}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Hints
        items={[
          ['⌘ O', 'open project'],
          ['⌘ N', 'new project'],
          ['⌘ K', 'quick search'],
        ]}
      />
    </EmptyStateShell>
  );
});
EmptyState.displayName = 'EmptyState';

// ─── Project selected, no panels ──────────────────────────────────────

export type EmptyWorkspaceAction = 'session' | 'terminal' | 'file' | 'preview';

export const WorkspaceEmptyState = memo(function WorkspaceEmptyState({
  onAddPanel,
}: {
  onAddPanel?: (action: EmptyWorkspaceAction) => void;
}) {
  const handleAction = (action: EmptyWorkspaceAction) => {
    if (onAddPanel) {
      onAddPanel(action);
    } else {
      // Fallback: dispatch event if prop not passed
      window.dispatchEvent(new CustomEvent('phantoma:add-workspace-panel', { detail: action }));
    }
  };

  return (
    <EmptyStateShell>
      <CardStackArt>
        <LayoutGrid className="w-9 h-9 stroke-[1.4]" />
      </CardStackArt>

      <h1 className="text-[17px] font-semibold text-text-primary mb-1.5">Workspace is empty</h1>
      <p className="text-sub text-[12.5px] max-w-[420px] text-text-secondary leading-relaxed">
        Open terminal, file, or preview and drag tabs to split the workspace into up to 4 panes.
      </p>

      <div className="grid grid-cols-2 gap-2.5 mt-6 w-full">
        <ActionCard
          accent="warn"
          icon={<MessageSquare className="w-4 h-4" />}
          title="New Session"
          subtitle="Assign task to agent"
          onClick={() => handleAction('session')}
        />
        <ActionCard
          accent="success"
          icon={<TerminalIcon className="w-4 h-4" />}
          title="Terminal"
          subtitle="Run commands in project"
          onClick={() => handleAction('terminal')}
        />
        <ActionCard
          accent="info"
          icon={<FileText className="w-4 h-4" />}
          title="Open File"
          subtitle="Browse directory tree"
          onClick={() => handleAction('file')}
        />
        <ActionCard
          accent="primary"
          icon={<Globe className="w-4 h-4" />}
          title="Preview"
          subtitle="localhost:5173"
          onClick={() => handleAction('preview')}
        />
      </div>

      <Hints
        items={[
          ['⌘ T', 'new tab'],
          ['⌘ \\', 'split right'],
          ['⌘ P', 'quick open'],
        ]}
      />
    </EmptyStateShell>
  );
});
WorkspaceEmptyState.displayName = 'WorkspaceEmptyState';
