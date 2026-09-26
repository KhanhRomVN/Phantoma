/**
 * ------------------------------------------------------------------
 * Source Control
 * ------------------------------------------------------------------
 * VS Code-style Git source control panel in the Activity sidebar.
 * Shows current branch, staged/unstaged changes, commit input, and
 * per-file / bulk stage / unstage / discard actions.
 *
 * Main features:
 * - Branch display with unpushed commit count
 * - Commit message + Commit button (enabled with staged changes)
 * - Staged Changes and Changes (unstaged) sections
 * - Per-file stage / unstage / discard (hover)
 * - Bulk stage-all / unstage-all / discard-all
 * - Discard confirmation modal
 * - Auto refresh on mount and fs:dir-changed / fs:file-changed
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect, useCallback, useRef } from 'react';

// ── UI ──
import {
  GitBranch,
  GitCommit,
  RefreshCw,
  Plus,
  Minus,
  Undo2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// ── Components ──
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';

// ── Hooks ──
import { useCodeStore } from '../../../hooks/useCodeStore';

// ─── Types ──────────────────────────────────────────────────────────────
interface ChangeItem {
  path: string;
  status: string;
  untracked?: boolean;
}

interface GitStatusPayload {
  output?: string;
  branch?: string;
  diffStats?: Record<string, { added: number; deleted: number }>;
  unpushedCommits?: string[];
  error?: string;
}

interface DiscardTarget {
  files: string[];
  staged: boolean;
  untracked: boolean;
  label: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────
/** Parse `git status --porcelain` output into staged / unstaged groups. */
function parsePorcelain(output: string): { staged: ChangeItem[]; unstaged: ChangeItem[] } {
  const staged: ChangeItem[] = [];
  const unstaged: ChangeItem[] = [];

  for (const line of output.split('\n')) {
    if (!line.trim()) continue;

    const x = line[0];
    const y = line[1];
    let p = line.slice(3).trim();
    // Rename: "old -> new"
    if (p.includes(' -> ')) p = p.split(' -> ').pop()!.trim();
    // Strip quotes if git wrapped path
    if (p.startsWith('"') && p.endsWith('"')) p = p.slice(1, -1);

    if (x === '?' && y === '?') {
      unstaged.push({ path: p, status: 'U', untracked: true });
      continue;
    }
    if (x !== ' ') staged.push({ path: p, status: x });
    if (y !== ' ') unstaged.push({ path: p, status: y });
  }

  return { staged, unstaged };
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  M: { label: 'M', className: 'text-yellow-500' },
  A: { label: 'A', className: 'text-green-500' },
  D: { label: 'D', className: 'text-red-500' },
  R: { label: 'R', className: 'text-blue-500' },
  C: { label: 'C', className: 'text-blue-500' },
  U: { label: 'U', className: 'text-green-500' },
  '?': { label: 'U', className: 'text-green-500' },
  T: { label: 'T', className: 'text-yellow-500' },
};

// ─── Component ──────────────────────────────────────────────────────────
export function SourceControl() {
  // ── Store ──
  const projectPath = useCodeStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.path,
  );

  // ── State ──
  const [branch, setBranch] = useState('');
  const [staged, setStaged] = useState<ChangeItem[]>([]);
  const [unstaged, setUnstaged] = useState<ChangeItem[]>([]);
  const [unpushed, setUnpushed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [committing, setCommitting] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [discardTarget, setDiscardTarget] = useState<DiscardTarget | null>(null);

  // ── Refs ──
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch status ──
  const fetchStatus = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    try {
      const res: GitStatusPayload = await (window as any).api.invoke('git:status', projectPath);
      if (res?.error) {
        setError(res.error);
        setStaged([]);
        setUnstaged([]);
        setBranch('');
        setUnpushed(0);
        return;
      }
      const parsed = parsePorcelain(res.output || '');
      setStaged(parsed.staged);
      setUnstaged(parsed.unstaged);
      setBranch(res.branch || '');
      setUnpushed((res.unpushedCommits || []).length);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load git status');
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  // ── Auto refresh on mount + project change ──
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ── Listen to file system changes ──
  useEffect(() => {
    if (!projectPath) return;

    const scheduleRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchStatus(), 500);
    };

    const offDir = (window as any).api.on('fs:dir-changed', scheduleRefresh);
    const offFile = (window as any).api.on('fs:file-changed', scheduleRefresh);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (typeof offDir === 'function') offDir();
      if (typeof offFile === 'function') offFile();
    };
  }, [projectPath, fetchStatus]);

  // ── Handlers ──
  const handleStage = async (files: string[]) => {
    if (!projectPath || files.length === 0) return;
    await (window as any).api.invoke('git:stage', projectPath, files);
    await fetchStatus();
  };

  const handleUnstage = async (files: string[]) => {
    if (!projectPath || files.length === 0) return;
    await (window as any).api.invoke('git:unstage', projectPath, files);
    await fetchStatus();
  };

  const handleStageAll = async () => {
    if (!projectPath) return;
    await (window as any).api.invoke('git:stage-all', projectPath);
    await fetchStatus();
  };

  const handleUnstageAll = async () => {
    if (!projectPath) return;
    await (window as any).api.invoke('git:unstage-all', projectPath);
    await fetchStatus();
  };

  const openDiscardModal = (target: DiscardTarget) => {
    setDiscardTarget(target);
    setIsDiscardOpen(true);
  };

  const handleConfirmDiscard = async () => {
    if (!projectPath || !discardTarget) return;
    await (window as any).api.invoke('git:discard', projectPath, discardTarget.files, {
      staged: discardTarget.staged,
      untracked: discardTarget.untracked,
    });
    setIsDiscardOpen(false);
    setDiscardTarget(null);
    await fetchStatus();
  };

  const handleCommit = async () => {
    if (!projectPath || !commitMessage.trim() || staged.length === 0) return;
    setCommitting(true);
    try {
      const res = await (window as any).api.invoke('git:commit', projectPath, commitMessage.trim());
      if (res?.error) {
        setError(res.error);
        return;
      }
      setCommitMessage('');
      setError(null);
      await fetchStatus();
    } finally {
      setCommitting(false);
    }
  };

  // ── Derived ──
  const canCommit = commitMessage.trim().length > 0 && staged.length > 0 && !committing;

  // ── Render ──
  return (
    <div className="flex flex-col h-full bg-sidebar-background">
      {/* HeaderBar — đồng bộ với FileExplore */}
      <div className="flex items-center justify-between h-9 px-2 border-b border-divider flex-shrink-0 bg-sidebar-background">
        <span className="text-[13px] text-text-secondary truncate">Source Control</span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              className={'w-3.5 h-3.5 ' + (loading ? 'animate-spin' : '')}
              strokeWidth={1.5}
            />
          </button>
        </div>
      </div>

      {/* Branch row */}
      {branch && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-divider text-xs text-text-secondary shrink-0">
          <GitBranch className="w-3.5 h-3.5 text-text-secondary/60" strokeWidth={1.5} />
          <span className="truncate">{branch}</span>
          {unpushed > 0 && (
            <span className="ml-auto text-[10px] text-text-secondary/60">{unpushed}↑</span>
          )}
        </div>
      )}

      {/* Commit input */}
      <div className="p-2 border-b border-divider shrink-0">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              handleCommit();
            }
          }}
          placeholder="Message (Ctrl+Enter to commit)"
          rows={2}
          className="w-full bg-input-background border border-border rounded-md px-2 py-1 text-xs text-text-primary placeholder:text-text-secondary/40 outline-none focus:border-accent/50 resize-none"
        />
        <button
          onClick={handleCommit}
          disabled={!canCommit}
          className="mt-1.5 w-full flex items-center justify-center gap-1.5 px-2 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {committing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
          ) : (
            <GitCommit className="w-3.5 h-3.5" strokeWidth={1.5} />
          )}
          Commit
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-2 mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-md flex items-center gap-2 text-[11px] text-red-500">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {!projectPath && (
          <div className="p-4 text-xs text-text-secondary/40 text-center">No project open</div>
        )}

        {projectPath && staged.length === 0 && unstaged.length === 0 && !loading && !error && (
          <div className="p-4 text-xs text-text-secondary/40 text-center">No changes</div>
        )}

        {staged.length > 0 && (
          <Section
            title="Staged Changes"
            count={staged.length}
            items={staged}
            kind="staged"
            onStageAll={undefined}
            onUnstageAll={handleUnstageAll}
            onDiscardAll={() =>
              openDiscardModal({
                files: staged.map((i) => i.path),
                staged: true,
                untracked: false,
                label: `${staged.length} staged file(s)`,
              })
            }
            onStageFile={() => {}}
            onUnstageFile={(p) => handleUnstage([p])}
            onDiscardFile={(item) =>
              openDiscardModal({
                files: [item.path],
                staged: true,
                untracked: false,
                label: item.path,
              })
            }
          />
        )}

        {unstaged.length > 0 && (
          <Section
            title="Changes"
            count={unstaged.length}
            items={unstaged}
            kind="unstaged"
            onStageAll={handleStageAll}
            onUnstageAll={undefined}
            onDiscardAll={() =>
              openDiscardModal({
                files: unstaged.map((i) => i.path),
                staged: false,
                untracked: false,
                label: `${unstaged.length} file(s)`,
              })
            }
            onStageFile={(p) => handleStage([p])}
            onUnstageFile={() => {}}
            onDiscardFile={(item) =>
              openDiscardModal({
                files: [item.path],
                staged: false,
                untracked: !!item.untracked,
                label: item.path,
              })
            }
          />
        )}
      </div>

      {/* Discard confirm modal */}
      <Modal
        isOpen={isDiscardOpen}
        onClose={() => setIsDiscardOpen(false)}
        closeOnBackdropClick={false}
      >
        <ModalHeader
          title="Discard Changes"
          description={`Thay đổi trong "${discardTarget?.label ?? ''}" sẽ bị hủy vĩnh viễn.`}
          onClose={() => setIsDiscardOpen(false)}
        />
        <ModalBody>
          <div className="flex items-start gap-3 p-3 rounded-md bg-error/10 border border-error/20">
            <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-[13px] text-text-secondary leading-relaxed">
              Hành động này không thể hoàn tác.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            onClick={() => setIsDiscardOpen(false)}
            className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors text-[13px]"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirmDiscard}
            className="px-4 py-2 rounded-lg bg-error text-white hover:bg-error/90 transition-colors text-[13px] flex items-center gap-2"
          >
            <Undo2 className="w-4 h-4" strokeWidth={1.5} />
            Discard
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

// ─── Section ────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  count: number;
  items: ChangeItem[];
  kind: 'staged' | 'unstaged';
  onStageAll?: () => void;
  onUnstageAll?: () => void;
  onDiscardAll: () => void;
  onStageFile: (p: string) => void;
  onUnstageFile: (p: string) => void;
  onDiscardFile: (item: ChangeItem) => void;
}

function Section({
  title,
  count,
  items,
  kind,
  onStageAll,
  onUnstageAll,
  onDiscardAll,
  onStageFile,
  onUnstageFile,
  onDiscardFile,
}: SectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      <div className="group flex items-center gap-1 px-2 py-1 hover:bg-card-hover transition-colors">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="p-0.5 rounded text-text-secondary shrink-0"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
          ) : (
            <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
          )}
        </button>
        <span className="text-[11px] font-medium text-text-primary uppercase tracking-wide truncate">
          {title}
        </span>
        <span className="text-[10px] text-text-secondary/60 bg-card-background rounded-full px-1.5 shrink-0 tabular-nums">
          {count}
        </span>
        <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {onStageAll && (
            <button
              onClick={onStageAll}
              className="p-0.5 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover"
              title="Stage All"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          )}
          {onUnstageAll && (
            <button
              onClick={onUnstageAll}
              className="p-0.5 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover"
              title="Unstage All"
            >
              <Minus className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={onDiscardAll}
            className="p-0.5 rounded text-text-secondary hover:text-red-500 hover:bg-card-hover"
            title="Discard All"
          >
            <Undo2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {!collapsed &&
        items.map((item) => (
          <FileRow
            key={`${kind}-${item.path}`}
            item={item}
            kind={kind}
            onStage={() => onStageFile(item.path)}
            onUnstage={() => onUnstageFile(item.path)}
            onDiscard={() => onDiscardFile(item)}
          />
        ))}
    </div>
  );
}

// ─── FileRow ────────────────────────────────────────────────────────────

interface FileRowProps {
  item: ChangeItem;
  kind: 'staged' | 'unstaged';
  onStage: () => void;
  onUnstage: () => void;
  onDiscard: () => void;
}

function FileRow({ item, kind, onStage, onUnstage, onDiscard }: FileRowProps) {
  const parts = item.path.split('/');
  const fileName = parts.pop() || item.path;
  const dir = parts.join('/');
  const meta = STATUS_META[item.status] || { label: item.status, className: 'text-text-secondary' };

  return (
    <div
      className="group flex items-center gap-2 pl-6 pr-2 py-0.5 hover:bg-card-hover transition-colors cursor-pointer"
      title={item.path}
    >
      <span className={'text-[10px] font-mono w-3 shrink-0 ' + meta.className}>{meta.label}</span>
      <span className="text-xs text-text-primary truncate">{fileName}</span>
      {dir && <span className="text-[10px] text-text-secondary/50 truncate">{dir}</span>}
      <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {kind === 'unstaged' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStage();
            }}
            className="p-0.5 rounded text-text-secondary hover:text-text-primary hover:bg-card-background"
            title="Stage"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnstage();
            }}
            className="p-0.5 rounded text-text-secondary hover:text-text-primary hover:bg-card-background"
            title="Unstage"
          >
            <Minus className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDiscard();
          }}
          className="p-0.5 rounded text-text-secondary hover:text-red-500 hover:bg-card-background"
          title="Discard Changes"
        >
          <Undo2 className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}