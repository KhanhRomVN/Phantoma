// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useEffect, useMemo, useState } from 'react';

// ── UI ──
import { Folder, FolderOpen, Loader2, Search } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { Button } from '@renderer/components/ui/Button';

// ── Components ──
import { ChangedFiles, type FileSelection } from '../ChangedFiles';

// ── Services ──
import { codeApi } from '../../../../shared/api/code.api';

// ── Utils ──
import type { Commit, CommitFile } from '../../utils/graph.util';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface ExportCommitModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectPath: string;
  commit: Commit | null;
  onDone: (
    message: string,
    variant?: 'info' | 'success' | 'error' | 'warning' | 'loading',
    description?: string,
  ) => void;
}

// ─── Functions ───────────────────────────────────────────────────────────────
const pickFolder = async (): Promise<string | null> => {
  try {
    const result = await (window as any).electron.ipcRenderer.invoke('dialog:select-paths', {
      kind: 'folder',
    });
    return result?.success && result?.paths?.[0] ? result.paths[0] : null;
  } catch {
    return null;
  }
};

// ─── Constants ───────────────────────────────────────────────────────────────
const SOFT_CANCEL =
  'flex-1 h-[42px] text-xs font-medium rounded-none border-r border-border bg-primary/10 text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30 disabled:hover:bg-primary/10';
const SOFT_CONFIRM =
  'flex-1 h-[42px] text-xs font-semibold rounded-none flex items-center justify-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 disabled:opacity-40 disabled:cursor-not-allowed';

// ─── Component ───────────────────────────────────────────────────────────────
export function ExportCommitModal({
  isOpen,
  onClose,
  projectPath,
  commit,
  onDone,
}: ExportCommitModalProps) {
  // ── State ──
  const [paths, setPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [dest, setDest] = useState('');
  const [folderName, setFolderName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ── Effects ──
  useEffect(() => {
    if (!isOpen || !commit) return;
    let cancelled = false;
    setLoading(true);
    setChecked(new Set());
    setQuery('');
    setError('');
    const repoName = projectPath.replace(/\/+$/, '').split('/').pop() || 'repo';
    setFolderName(`${repoName}-${commit.hash.slice(0, 7)}`);
    codeApi.git
      .commitTree(projectPath, commit.hash)
      .then((res: { paths?: string[] }) => {
        if (!cancelled) setPaths(res?.paths ?? []);
      })
      .catch(() => {
        if (!cancelled) setPaths([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, commit, projectPath]);

  // ── Derived ──
  const q = query.trim().toLowerCase();
  const files = useMemo<CommitFile[]>(
    () =>
      paths
        .filter((p) => !q || p.toLowerCase().includes(q))
        .map((path) => ({ path, added: 0, deleted: 0, unchanged: true })),
    [paths, q],
  );

  const selection = useMemo<FileSelection>(
    () => ({
      isChecked: (p) => checked.has(p),
      toggle: (ps) =>
        setChecked((prev) => {
          const next = new Set(prev);
          const all = ps.every((p) => next.has(p));
          ps.forEach((p) => (all ? next.delete(p) : next.add(p)));
          return next;
        }),
    }),
    [checked],
  );

  const preview = useMemo(() => {
    const rows: { depth: number; label: string; dir: boolean }[] = [];
    const seen = new Set<string>();
    const sorted = Array.from(checked).sort();
    sorted.slice(0, 40).forEach((p) => {
      const segs = p.split('/');
      segs.forEach((seg, i) => {
        const key = segs.slice(0, i + 1).join('/');
        if (seen.has(key)) return;
        seen.add(key);
        rows.push({ depth: i + 2, label: seg, dir: i < segs.length - 1 });
      });
    });
    return { rows, more: Math.max(0, sorted.length - 40) };
  }, [checked]);

  // ── Handlers ──
  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handlePick = async () => {
    const folder = await pickFolder();
    if (folder) setDest(folder);
  };

  // ── Derived ──
  const canExport =
    !!commit && checked.size > 0 && !!dest && !!folderName.trim() && !submitting;

  // ── Handlers ──
  const handleExport = async () => {
    if (!commit || !canExport) return;
    setSubmitting(true);
    setError('');
    try {
      const target = `${dest.replace(/\/+$/, '')}/${folderName.trim()}`;
      const res = await codeApi.git.exportCommit(projectPath, commit.hash, Array.from(checked), target);
      if (res?.error) {
        setError(res.error);
        onDone('Export failed', 'error', String(res.error).split('\n')[0]);
        return;
      }
      onDone(
        'Exported source',
        'success',
        `${checked.size} file${checked.size === 1 ? '' : 's'} from ${commit.hash.slice(0, 7)} to ${dest.replace(/\/+$/, '')}/${folderName.trim()}`,
      );
      onClose();
    } catch (e: any) {
      setError(e?.message || String(e));
      onDone('Export failed', 'error', String(e?.message || e).split('\n')[0]);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──
  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-[560px]">
      <ModalBody className="py-5 px-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-text-primary leading-snug">
              Export source from commit
            </h3>
            <p className="text-xs text-text-secondary truncate">
              <span className="font-mono">{commit?.hash.slice(0, 7)}</span> {commit?.subject}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/60" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter files..."
                className="w-full pl-7 pr-2 h-8 text-xs bg-input-background border border-border rounded-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
              />
            </div>
            <Button
              onClick={() => selection.toggle(files.map((f) => f.path))}
              disabled={files.length === 0}
              className="h-8 px-3 text-xs bg-primary/10 text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30 disabled:hover:bg-primary/10"
            >
              Toggle all
            </Button>
          </div>

          <div className="h-[320px] overflow-y-auto rounded-md border border-border">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-text-secondary/60" />
              </div>
            ) : (
              <ChangedFiles files={files} view="tree" selection={selection} />
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              spellCheck={false}
              placeholder="Destination folder (existing files are overwritten)"
              className="flex-1 h-8 px-3 font-mono text-xs bg-input-background border border-border rounded-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
            />
            <Button
              onClick={handlePick}
              className="h-8 px-3 text-xs flex items-center gap-1.5 bg-primary/10 text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Browse
            </Button>
          </div>

          <input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value.replace(/[\\/]/g, ''))}
            spellCheck={false}
            placeholder="Folder name"
            className="h-8 px-3 font-mono text-xs bg-input-background border border-border rounded-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
          />

          <div className="max-h-[200px] overflow-y-auto rounded-md border border-border bg-input-background/40 px-3 py-2 font-mono text-[12.5px]">
            <div className="flex h-6 items-center gap-1.5 text-text-secondary">
              <Folder className="h-3.5 w-3.5" />
              <span className="truncate">{dest ? `${dest.replace(/\/+$/, '')}/` : '<destination>/'}</span>
            </div>
            <div className="flex h-6 items-center gap-1.5" style={{ paddingLeft: 16 }}>
              <span className="text-text-secondary/40">└</span>
              <Folder className="h-3.5 w-3.5 text-primary" />
              <span className="truncate font-semibold text-text-primary">{folderName || '<folder name>'}</span>
            </div>
            {preview.rows.map((row, i) => (
              <div key={i} className="flex h-6 items-center gap-1.5" style={{ paddingLeft: row.depth * 16 }}>
                <span className="text-text-secondary/40">└</span>
                {row.dir && <Folder className="h-3.5 w-3.5 text-text-secondary" />}
                <span className="truncate text-text-secondary">{row.label}</span>
              </div>
            ))}
            {preview.more > 0 && (
              <div className="h-6 text-text-secondary/60" style={{ paddingLeft: 32 }}>
                … +{preview.more} more
              </div>
            )}
          </div>

          <p className="text-[11px] text-text-secondary">{checked.size} file(s) selected</p>
          {error && <p className="text-xs text-error leading-relaxed break-words">{error}</p>}
        </div>
      </ModalBody>

      <ModalFooter className="gap-0 p-0 border-t border-border">
        <Button onClick={handleClose} disabled={submitting} className={SOFT_CANCEL}>
          Cancel
        </Button>
        <Button onClick={handleExport} disabled={!canExport} className={SOFT_CONFIRM}>
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Export
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ExportCommitModal;