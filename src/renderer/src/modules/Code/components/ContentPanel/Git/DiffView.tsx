/**
 * ------------------------------------------------------------------
 * Git Diff View
 * ------------------------------------------------------------------
 * Replaces the commit graph in the center area: shows the diff of the
 * file clicked in the right panel. Esc goes back. The diff rendering
 * itself lives in components/common/DiffBlock.
 * ------------------------------------------------------------------
 */

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, GitBranch, Loader2 } from 'lucide-react';

import {
  FileSection,
  parseDiff,
  type FileDiff,
} from '@renderer/components/common/DiffBlock';

export { FileSection, parseDiff };
export type { FileDiff };

// ─── Diff View ──────────────────────────────────────────────────────────
interface DiffViewProps {
  projectPath: string;
  hash?: string;
  localBranch?: string | null;
  subject: string;
  activePath: string | null;
  onClose: () => void;
}

export const DiffView = memo(function DiffView({
  projectPath,
  hash,
  localBranch = null,
  subject,
  activePath,
  onClose,
}: DiffViewProps) {
  const [files, setFiles] = useState<FileDiff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    window.api
      .invoke(localBranch ? 'git:local-diff' : 'git:commit-diff', projectPath, localBranch ?? hash)
      .then((res: { diff?: string; error?: string }) => {
        if (cancelled) return;
        if (res?.error) {
          setError(res.error);
          setFiles([]);
          return;
        }
        setFiles(parseDiff(res?.diff ?? ''));
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message ?? String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectPath, hash, localBranch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const totals = useMemo(
    () =>
      files.reduce((acc, f) => ({ added: acc.added + f.added, deleted: acc.deleted + f.deleted }), {
        added: 0,
        deleted: 0,
      }),
    [files],
  );

  return (
    <section className={'flex-1 min-w-0 flex flex-col min-h-0'}>
      <div className={'h-11 shrink-0 px-3 flex items-center gap-3 border-b border-border'}>
        <button
          onClick={onClose}
          title={'Back to graph (Esc)'}
          className={
            'w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors cursor-pointer'
          }
        >
          <ArrowLeft className={'w-3.5 h-3.5'} />
        </button>
        <span className={'min-w-0 truncate text-[12.5px] font-semibold text-text-primary'}>
          {subject}
        </span>
        <span
          className={
            'shrink-0 inline-flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded bg-card-background border border-divider text-text-secondary'
          }
        >
          {localBranch && <GitBranch className={'w-3 h-3'} />}
          {localBranch ?? (hash ?? '').slice(0, 7)}
        </span>
        <span className={'flex-1'} />
        <span
          className={'text-[11.5px] text-text-secondary shrink-0'}
        >{`${files.length} files`}</span>
        <span className={'font-mono text-[11.5px] text-green shrink-0'}>{`+${totals.added}`}</span>
        <span className={'font-mono text-[11.5px] text-red shrink-0'}>{`-${totals.deleted}`}</span>
      </div>

      {loading ? (
        <div className={'flex-1 flex items-center justify-center'}>
          <Loader2 className={'w-5 h-5 animate-spin text-text-secondary/60'} />
        </div>
      ) : error ? (
        <div
          className={
            'flex-1 flex flex-col items-center justify-center gap-2 text-text-secondary/60 text-xs'
          }
        >
          <AlertCircle className={'w-5 h-5'} />
          {error}
        </div>
      ) : files.length === 0 ? (
        <div className={'flex-1 flex items-center justify-center text-xs text-text-secondary/40'}>
          No diff available
        </div>
      ) : (
        <div ref={rootRef} className={'flex-1 overflow-y-auto'}>
          {files
            .filter((f) => f.path === (activePath ?? files[0]?.path))
            .map((f) => (
              <FileSection key={f.path} file={f} collapsed={false} onToggle={() => undefined} />
            ))}
        </div>
      )}
    </section>
  );
});