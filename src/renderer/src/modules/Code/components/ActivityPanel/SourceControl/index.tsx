/**
 * ------------------------------------------------------------------
 * Source Control
 * ------------------------------------------------------------------
 * VS Code-style Git source control panel in the Activity sidebar.
 * Shows current branch, commit box, staged / unstaged changes with
 * file-type icons, diff stats and per-file / bulk actions.
 *
 * Main features:
 * - Branch pill with unpushed commit count
 * - Auto-growing commit message box + Commit button (staged count)
 * - "Staged Changes" and "Changes" collapsible sections
 * - Per-file stage / unstage / discard (hover) + bulk actions
 * - Diff stats (+added / -deleted) and colored status letter
 * - Discard confirmation modal (handles tracked + untracked mix)
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
  CheckCircle2,
  ArrowUp,
} from 'lucide-react';

// ── Components ──
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';

// ── Utils ──
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';
import { cn } from '@renderer/shared/utils/cn';

// ── Hooks ──
import { useCodeStore } from '../../../hooks/useCodeStore';

// ─── Types ──────────────────────────────────────────────────────────────
interface ChangeItem {
  path: string;
  status: string;
  untracked?: boolean;
}

interface DiffStat {
  added: number;
  deleted: number;
}

interface GitStatusPayload {
  output?: string;
  branch?: string;
  diffStats?: Record<string, DiffStat>;
  unpushedCommits?: string[];
  error?: string;
}

interface DiscardTarget {
  items: ChangeItem[];
  staged: boolean;
  label: string;
}

// ─── Constants ──────────────────────────────────────────────────────────
const FALLBACK_FILE_ICON = '/images/icon/file.svg';

const ICON_BUTTON_CLASS =
  'p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors';

const STATUS_META: Record<string, { label: string; title: string; className: string }> = {
  M: { label: 'M', title: 'Modified', className: 'text-yellow-500' },
  A: { label: 'A', title: 'Added', className: 'text-green-500' },
  D: { label: 'D', title: 'Deleted', className: 'text-red-500' },
  R: { label: 'R', title: 'Renamed', className: 'text-blue-500' },
  C: { label: 'C', title: 'Copied', className: 'text-blue-500' },
  U: { label: 'U', title: 'Untracked', className: 'text-green-500' },
  '?': { label: 'U', title: 'Untracked', className: 'text-green-500' },
  T: { label: 'T', title: 'Type changed', className: 'text-yellow-500' },
};

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
  const [diffStats, setDiffStats] = useState<Record<string, DiffStat>>({});
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
        setDiffStats({});
        setBranch('');
        setUnpushed(0);
        return;
      }
      const parsed = parsePorcelain(res.output || '');
      setStaged(parsed.staged);
      setUnstaged(parsed.unstaged);
      setDiffStats(res.diffStats || {});
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

    const api = (window as any).api;
    const scheduleRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchStatus(), 500);
    };

    const offDir = api.on('fs:dir-changed', scheduleRefresh);
    const offFile = api.on('fs:file-changed', scheduleRefresh);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // api.on có thể trả về hàm unsubscribe, hoặc cần api.off (như FileExplore)
      if (typeof offDir === 'function') offDir();
      else api.off?.('fs:dir-changed', scheduleRefresh);
      if (typeof offFile === 'function') offFile();
      else api.off?.('fs:file-changed', scheduleRefresh);
    };
  }, [projectPath, fetchStatus]);

  // ── Git action runner ──
  const runGit = async (channel: string, ...args: unknown[]) => {
    if (!projectPath) return;
    let message: string | null = null;
    try {
      const res = await (window as any).api.invoke(channel, projectPath, ...args);
      if (res?.error) message = res.error;
    } catch (e: any) {
      message = e?.message || `${channel} failed`;
    }
    await fetchStatus();
    // fetchStatus xóa error khi thành công → set lại lỗi của action sau khi refresh
    if (message) setError(message);
  };

  // ── Handlers ──
  const handleStage = (files: string[]) => (files.length ? runGit('git:stage', files) : undefined);
  const handleUnstage = (files: string[]) =>
    files.length ? runGit('git:unstage', files) : undefined;
  const handleStageAll = () => runGit('git:stage-all');
  const handleUnstageAll = () => runGit('git:unstage-all');

  const openDiscardModal = (target: DiscardTarget) => {
    setDiscardTarget(target);
    setIsDiscardOpen(true);
  };

  const closeDiscardModal = () => {
    setIsDiscardOpen(false);
    setDiscardTarget(null);
  };

  const handleConfirmDiscard = async () => {
    if (!projectPath || !discardTarget) return;
    const tracked = discardTarget.items.filter((i) => !i.untracked).map((i) => i.path);
    const untracked = discardTarget.items.filter((i) => i.untracked).map((i) => i.path);
    closeDiscardModal();

    if (tracked.length > 0) {
      await runGit('git:discard', tracked, { staged: discardTarget.staged, untracked: false });
    }
    if (untracked.length > 0) {
      await runGit('git:discard', untracked, { staged: false, untracked: true });
    }
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
    } catch (e: any) {
      setError(e?.message || 'Commit failed');
    } finally {
      setCommitting(false);
    }
  };

  // ── Derived ──
  const canCommit = commitMessage.trim().length > 0 && staged.length > 0 && !committing;
  const totalChanges = staged.length + unstaged.length;
  const hasUntrackedInTarget = !!discardTarget?.items.some((i) => i.untracked);
  const commitTitle =
    staged.length === 0
      ? 'Stage ít nhất 1 thay đổi để commit'
      : !commitMessage.trim()
        ? 'Nhập commit message'
        : 'Commit (Ctrl+Enter)';

  // ── Render ──
  return (
    <div className="flex flex-col h-full bg-sidebar-background">
      {/* HeaderBar — đồng bộ với FileExplore */}
      <div className="flex items-center justify-between h-9 px-2 border-b border-divider flex-shrink-0 bg-sidebar-background">
        <span className="text-[11px] font-medium uppercase tracking-wide text-text-secondary truncate">
          Source Control
        </span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className={cn(ICON_BUTTON_CLASS, 'disabled:opacity-50')}
            title="Refresh"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Branch row */}
      {branch && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-divider shrink-0">
          <div className="flex items-center gap-1.5 min-w-0 px-2 py-0.5 rounded-full bg-card-background border border-border">
            <GitBranch className="w-3.5 h-3.5 shrink-0 text-primary" strokeWidth={1.5} />
            <span className="text-xs text-text-primary truncate" title={branch}>
              {branch}
            </span>
          </div>
          {unpushed > 0 && (
            <span
              className="flex items-center gap-0.5 text-[10px] text-text-secondary tabular-nums shrink-0"
              title={`${unpushed} commit chưa push`}
            >
              <ArrowUp className="w-3 h-3" strokeWidth={1.5} />
              {unpushed}
            </span>
          )}
          <span className="ml-auto text-[10px] text-text-secondary/60 shrink-0 tabular-nums">
            {totalChanges} thay đổi
          </span>
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
          rows={Math.min(6, Math.max(2, commitMessage.split('\n').length))}
          className="w-full bg-input-background border border-border rounded-md px-2 py-1.5 text-xs text-text-primary placeholder:text-text-secondary/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors resize-none"
        />
        <button
          onClick={handleCommit}
          disabled={!canCommit}
          title={commitTitle}
          className="mt-1.5 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md bg-button-solid-background text-button-solid-text hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {committing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
          ) : (
            <GitCommit className="w-3.5 h-3.5" strokeWidth={1.5} />
          )}
          Commit
          {staged.length > 0 && <span className="opacity-70 tabular-nums">({staged.length})</span>}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-2 mt-2 p-2 bg-error/10 border border-error/20 rounded-md flex items-start gap-2 text-[11px] text-error shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" strokeWidth={1.5} />
          <span className="break-words min-w-0">{error}</span>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto py-1">
        {!projectPath && (
          <div className="p-4 text-xs text-text-secondary/40 text-center">No project open</div>
        )}

        {projectPath && totalChanges === 0 && !loading && !error && (
          <div className="flex flex-col items-center gap-2 p-6 text-text-secondary/50">
            <CheckCircle2 className="w-6 h-6" strokeWidth={1.25} />
            <span className="text-xs">Working tree clean</span>
          </div>
        )}

        {staged.length > 0 && (
          <Section
            title="Staged Changes"
            items={staged}
            kind="staged"
            diffStats={diffStats}
            onUnstageAll={handleUnstageAll}
            onDiscardAll={() =>
              openDiscardModal({
                items: staged,
                staged: true,
                label: `${staged.length} file đã stage`,
              })
            }
            onUnstageFile={(p) => handleUnstage([p])}
            onDiscardFile={(item) =>
              openDiscardModal({ items: [item], staged: true, label: item.path })
            }
          />
        )}

        {unstaged.length > 0 && (
          <Section
            title="Changes"
            items={unstaged}
            kind="unstaged"
            diffStats={diffStats}
            onStageAll={handleStageAll}
            onDiscardAll={() =>
              openDiscardModal({
                items: unstaged,
                staged: false,
                label: `${unstaged.length} file`,
              })
            }
            onStageFile={(p) => handleStage([p])}
            onDiscardFile={(item) =>
              openDiscardModal({ items: [item], staged: false, label: item.path })
            }
          />
        )}
      </div>

      {/* Discard confirm modal */}
      <Modal isOpen={isDiscardOpen} onClose={closeDiscardModal} closeOnBackdropClick={false}>
        <ModalHeader
          title="Discard Changes"
          description={`Thay đổi trong "${discardTarget?.label ?? ''}" sẽ bị hủy vĩnh viễn.`}
          onClose={closeDiscardModal}
        />
        <ModalBody>
          <div className="flex items-start gap-3 p-3 rounded-md bg-error/10 border border-error/20">
            <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-[13px] text-text-secondary leading-relaxed">
              Hành động này không thể hoàn tác.
              {hasUntrackedInTarget && ' File chưa được theo dõi (untracked) sẽ bị xóa khỏi ổ đĩa.'}
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            onClick={closeDiscardModal}
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
  items: ChangeItem[];
  kind: 'staged' | 'unstaged';
  diffStats: Record<string, DiffStat>;
  onStageAll?: () => void;
  onUnstageAll?: () => void;
  onDiscardAll: () => void;
  onStageFile?: (p: string) => void;
  onUnstageFile?: (p: string) => void;
  onDiscardFile: (item: ChangeItem) => void;
}

function Section({
  title,
  items,
  kind,
  diffStats,
  onStageAll,
  onUnstageAll,
  onDiscardAll,
  onStageFile,
  onUnstageFile,
  onDiscardFile,
}: SectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-1">
      <div className="group flex items-center gap-1 px-1.5 py-1 hover:bg-card-hover transition-colors">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex-1 min-w-0 flex items-center gap-1 text-left"
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-text-secondary" strokeWidth={1.5} />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-text-secondary" strokeWidth={1.5} />
          )}
          <span className="text-[11px] font-semibold text-text-primary uppercase tracking-wide truncate">
            {title}
          </span>
        </button>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {onStageAll && (
            <button
              onClick={onStageAll}
              className="p-0.5 rounded text-text-secondary hover:text-text-primary hover:bg-card-background"
              title="Stage All"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          )}
          {onUnstageAll && (
            <button
              onClick={onUnstageAll}
              className="p-0.5 rounded text-text-secondary hover:text-text-primary hover:bg-card-background"
              title="Unstage All"
            >
              <Minus className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={onDiscardAll}
            className="p-0.5 rounded text-text-secondary hover:text-error hover:bg-card-background"
            title="Discard All"
          >
            <Undo2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <span className="text-[10px] text-text-secondary bg-card-background rounded-full px-1.5 shrink-0 tabular-nums">
          {items.length}
        </span>
      </div>

      {!collapsed &&
        items.map((item) => (
          <FileRow
            key={`${kind}-${item.path}`}
            item={item}
            kind={kind}
            stat={diffStats[item.path]}
            onStage={() => onStageFile?.(item.path)}
            onUnstage={() => onUnstageFile?.(item.path)}
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
  stat?: DiffStat;
  onStage: () => void;
  onUnstage: () => void;
  onDiscard: () => void;
}

function FileRow({ item, kind, stat, onStage, onUnstage, onDiscard }: FileRowProps) {
  const parts = item.path.split('/');
  const fileName = parts.pop() || item.path;
  const dir = parts.join('/');
  const meta = STATUS_META[item.status] || {
    label: item.status,
    title: item.status,
    className: 'text-text-secondary',
  };
  const isDeleted = item.status === 'D';

  return (
    <div
      className="group flex items-center gap-1.5 pl-5 pr-2 py-[3px] hover:bg-card-hover transition-colors cursor-pointer"
      title={item.path}
    >
      <img
        src={getFileIconPath(fileName)}
        alt=""
        className="w-4 h-4 shrink-0"
        onError={(e) => {
          const img = e.target as HTMLImageElement;
          if (img.src.endsWith(FALLBACK_FILE_ICON)) img.style.display = 'none';
          else img.src = FALLBACK_FILE_ICON;
        }}
      />
      <span
        className={cn(
          'text-xs truncate',
          isDeleted ? 'text-text-secondary line-through' : 'text-text-primary',
        )}
      >
        {fileName}
      </span>
      {dir && <span className="text-[10px] text-text-secondary/50 truncate min-w-0">{dir}</span>}

      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
            className="p-0.5 rounded text-text-secondary hover:text-error hover:bg-card-background"
            title="Discard Changes"
          >
            <Undo2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>

        {stat && (stat.added > 0 || stat.deleted > 0) && (
          <span className="text-[10px] font-mono tabular-nums flex items-center gap-1">
            {stat.added > 0 && <span className="text-green-500">+{stat.added}</span>}
            {stat.deleted > 0 && <span className="text-red-500">-{stat.deleted}</span>}
          </span>
        )}

        <span
          className={cn('text-[10px] font-mono font-semibold w-3 text-center', meta.className)}
          title={meta.title}
        >
          {meta.label}
        </span>
      </div>
    </div>
  );
}

export default SourceControl;
