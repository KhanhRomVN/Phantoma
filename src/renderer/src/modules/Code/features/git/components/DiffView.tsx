import { memo, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, GitBranch, Loader2, Plus, Undo2 } from 'lucide-react';
import { codeApi } from '../../../shared/api/code.api';
import CodeBlock, { detectLanguageId } from '@renderer/components/common/CodeBlock';
import { cn } from '@renderer/utils/cn';
import { getFileIconPath } from '@renderer/utils/file-icon';
import { KIND_MARK, type FileActions } from './ChangedFiles';
import { fileKind, splitPath, type CommitFile } from '../utils/graph.util';

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
  branchRoot?: string;
  file?: CommitFile | null;
  actions?: FileActions;
  activePath: string | null;
  onClose: () => void;
}

export const DiffView = memo(function DiffView({
  projectPath,
  hash,
  localBranch = null,
  branchRoot,
  file = null,
  actions,
  activePath,
  onClose,
}: DiffViewProps) {
  const [files, setFiles] = useState<FileDiff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const viewOnly = !localBranch && !!hash && !!activePath && !file;

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewOnly) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (localBranch
      ? codeApi.git.localDiff(projectPath, localBranch, branchRoot)
      : codeApi.git.commitDiff(projectPath, hash ?? '')
    )
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
  }, [projectPath, hash, localBranch, branchRoot, viewOnly]);

  useEffect(() => {
    if (!viewOnly || !hash || !activePath) {
      setContent(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setContent(null);
    codeApi.git
      .commitFileContent(projectPath, hash, activePath)
      .then((res: { content?: string; error?: string }) => {
        if (cancelled) return;
        if (res?.error) setError(res.error);
        else setContent(res?.content ?? '');
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
  }, [projectPath, hash, activePath, viewOnly]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);


  return (
    <section className={'flex-1 min-w-0 flex flex-col min-h-0'}>
      <div className={'h-11 shrink-0 px-3 flex items-center gap-3 border-b border-border'}>
        <button
          onClick={onClose}
          title={'Back to graph (Esc)'}
          className={
            'w-7 h-7 rounded-md flex items-center justify-center bg-primary/10 text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30 transition-colors cursor-pointer'
          }
        >
          <ArrowLeft className={'w-3.5 h-3.5'} />
        </button>
        {file && (
          <>
            <img src={getFileIconPath(splitPath(file.path).name)} alt={''} className={'w-4 h-4 shrink-0'} />
            <span
              className={cn(
                'min-w-0 truncate text-[12.5px] font-semibold',
                fileKind(file) === 'deleted' ? 'text-text-secondary line-through' : 'text-text-primary',
              )}
            >
              {splitPath(file.path).name}
            </span>
            <span
              title={KIND_MARK[fileKind(file)].title}
              className={cn(
                'shrink-0 font-mono text-[12px] font-semibold leading-none',
                KIND_MARK[fileKind(file)].className,
              )}
            >
              {`(${KIND_MARK[fileKind(file)].mark})`}
            </span>
            <span className={'min-w-0 truncate text-[11px] text-text-secondary/60'}>
              {splitPath(file.path).dir}
            </span>
          </>
        )}
        {viewOnly && activePath && (
          <>
            <img src={getFileIconPath(splitPath(activePath).name)} alt={''} className={'w-4 h-4 shrink-0'} />
            <span className={'min-w-0 truncate text-[12.5px] font-semibold text-text-primary'}>
              {splitPath(activePath).name}
            </span>
            <span className={'min-w-0 truncate text-[11px] text-text-secondary/60'}>
              {splitPath(activePath).dir}
            </span>
          </>
        )}
        <span
          className={
            'shrink-0 inline-flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded-md border border-dashed border-text-secondary/40 text-text-secondary'
          }
        >
          {localBranch && <GitBranch className={'w-3 h-3'} />}
          {localBranch ?? (hash ?? '').slice(0, 7)}
        </span>
        <span className={'flex-1'} />
        {file && actions?.onDiscard && (file.unstaged || file.staged) && (
          <button
            onClick={() => actions.onDiscard?.(file)}
            title={'Discard changes'}
            className={
              'shrink-0 w-7 h-7 rounded-md flex items-center justify-center bg-red/10 text-red hover:bg-red/20 active:bg-red/30 transition-colors cursor-pointer'
            }
          >
            <Undo2 className={'w-3.5 h-3.5'} />
          </button>
        )}
        {file && actions?.onStage && file.unstaged && (
          <button
            onClick={() => actions.onStage?.(file)}
            title={'Stage change'}
            className={
              'shrink-0 w-7 h-7 rounded-md flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 transition-colors cursor-pointer'
            }
          >
            <Plus className={'w-3.5 h-3.5'} />
          </button>
        )}
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
      ) : viewOnly && content !== null ? (
        <div className={'flex-1 min-h-0'}>
          <CodeBlock
            key={`${hash}:${activePath}`}
            code={content}
            language={detectLanguageId(activePath ?? undefined)}
            showLineNumbers
            hideDiagnostics
            className={'!min-h-0 h-full'}
            editorOptions={{
              readOnly: true,
              domReadOnly: true,
              renderLineHighlight: 'none',
              occurrencesHighlight: 'off',
              selectionHighlight: false,
              matchBrackets: 'never',
              minimap: { enabled: false },
            }}
          />
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
              <FileSection
                key={f.path}
                file={f}
                collapsed={false}
                hideHeader
                onToggle={() => undefined}
              />
            ))}
        </div>
      )}
    </section>
  );
});