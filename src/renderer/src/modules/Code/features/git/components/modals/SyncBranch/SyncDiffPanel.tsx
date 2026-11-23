import { gitIpc } from '../../../../../shared/ipc/git.ipc';
import { useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { DiffBlock } from '@renderer/components/common/DiffBlock';
import { getFileIconPath } from '@renderer/utils/file-icon';
import { SyncFile } from '../../../types/sync-branch.types';
import { STATUS_META, WARNING_TONES } from '../../../constants/sync-branch.constants';
import { Counts } from './SyncBranchControls';

export function SyncDiffPanel({
  projectPath,
  sourceRef,
  sourcePath,
  filePath,
  file,
  paths,
  onNavigate,
}: {
  projectPath: string;
  sourceRef: string;
  sourcePath?: string;
  filePath: string | null;
  file: SyncFile | null;
  paths: string[];
  onNavigate: (path: string) => void;
}) {
  const [state, setState] = useState<{ loading: boolean; error: string | null; diff: string }>({
    loading: true,
    error: null,
    diff: '',
  });

  useEffect(() => {
    if (!sourceRef || !filePath) return;
    let cancelled = false;
    setState({ loading: true, error: null, diff: '' });
    gitIpc.invoke(
        sourcePath ? 'git:worktree-file-diff' : 'git:branch-sync-file-diff',
        projectPath,
        sourcePath ?? sourceRef,
        filePath,
      )
      .then((res: { diff?: string; error?: string }) => {
        if (cancelled) return;
        setState({ loading: false, error: res?.error ?? null, diff: res?.diff ?? '' });
      })
      .catch((e: any) => {
        if (!cancelled) setState({ loading: false, error: e?.message || String(e), diff: '' });
      });
    return () => {
      cancelled = true;
    };
  }, [projectPath, sourceRef, filePath]);

  if (!filePath) {
    return (
      <div className="flex h-full min-w-0 flex-1 items-center justify-center text-[13.5px] text-text-secondary">
        No file to preview
      </div>
    );
  }

  const index = paths.indexOf(filePath);
  const canNav = index >= 0 && paths.length > 1;
  const go = (delta: number) => onNavigate(paths[(index + delta + paths.length) % paths.length]);
  const name = filePath.split('/').pop() ?? filePath;
  const dir = filePath.slice(0, Math.max(0, filePath.length - name.length - 1));
  const meta = file ? STATUS_META[file.status] : null;
  const BTN =
    'grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-md text-text-secondary outline-none transition-colors hover:bg-card-hover hover:text-text-primary';

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-text-secondary/20 px-4">
        <img src={getFileIconPath(name)} alt="" className="h-5 w-5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-mono text-[14px] font-medium text-text-primary">
            {name}
          </span>
          {dir && <span className="truncate font-mono text-[12px] text-text-secondary">{dir}</span>}
        </div>
        {meta && (
          <span
            className={cn('flex shrink-0 items-center gap-1 text-[12.5px] font-medium', meta.cls)}
          >
            <meta.icon className="h-3.5 w-3.5" />
            {meta.label}
          </span>
        )}
        {file && <Counts added={file.added} deleted={file.deleted} />}
        {canNav && (
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" title="Previous file" onClick={() => go(-1)} className={BTN}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-[12.5px] text-text-secondary">
              {index + 1} / {paths.length}
            </span>
            <button type="button" title="Next file" onClick={() => go(1)} className={BTN}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <ModalBody className="p-0">
        <DiffBlock
          diff={state.diff}
          loading={state.loading}
          error={state.error}
          rowClassName="text-[13.5px] leading-[22px]"
        />
      </ModalBody>
    </div>
  );
}

export function WarningBox({
  title,
  desc,
  tone = 'warn',
}: {
  title: string;
  desc: string;
  tone?: keyof typeof WARNING_TONES;
}) {
  const t = WARNING_TONES[tone];
  return (
    <div className="flex shrink-0 items-center gap-2.5 p-2">
      <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-md', t.badge)}>
        <t.icon className="h-3.5 w-3.5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('text-[12.5px] font-semibold', t.title)}>{title}</span>
        <span className="text-[11.5px] leading-snug text-text-secondary">{desc}</span>
      </div>
    </div>
  );
}
