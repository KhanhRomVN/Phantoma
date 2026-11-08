/**
 * ------------------------------------------------------------------
 * Remote Diff Modal
 * ------------------------------------------------------------------
 * Modal xem diff của 1 file giữa remote default branch (origin/main|master)
 * và bản Local — tối đa 2 panel side-by-side.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { memo, useEffect, useMemo, useState } from 'react';
import { Loader, GitBranch } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { getFileIconPath } from '@renderer/utils/file-icon';
import { FileSection, parseDiff } from '../../ContentPanel/Git/DiffView';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface RemoteDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectPath: string;
  filePath: string | null;
}

interface PanelState {
  loading: boolean;
  error: string | null;
  diff: string;
}

const noop = () => {};
const ROW_CLASS = 'text-[13px] leading-[21px]';

// ─── Panel body ─────────────────────────────────────────────────────────
const DiffPanelBody = memo(function DiffPanelBody({ state }: { state: PanelState | undefined }) {
  const files = useMemo(
    () =>
      parseDiff(state?.diff ?? '').map((f) => ({
        ...f,
        hunks: f.hunks.map((h) => ({ ...h, lines: h.lines.filter((l) => l.type !== 'meta') })),
      })),
    [state?.diff],
  );

  if (!state || state.loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-text-secondary">
        <Loader className="w-4 h-4 animate-spin" strokeWidth={1.5} />
        <span>Loading diff...</span>
      </div>
    );
  }
  if (state.error) {
    return <div className="py-10 px-4 text-center text-[13px] text-error">{state.error}</div>;
  }
  if (files.length === 0) {
    return <div className="py-10 text-center text-[13px] text-text-secondary">No differences</div>;
  }
  return (
    <>
      {files.map((f) => (
        <FileSection
          key={f.path}
          file={f}
          collapsed={false}
          onToggle={noop}
          hideHeader
          rowClassName={ROW_CLASS}
        />
      ))}
    </>
  );
});

// ─── Component ─────────────────────────────────────────────────────────
export function RemoteDiffModal({ isOpen, onClose, projectPath, filePath }: RemoteDiffModalProps) {
  const [remoteRef, setRemoteRef] = useState('');
  const [panel, setPanel] = useState<PanelState | undefined>(undefined);

  useEffect(() => {
    setRemoteRef('');
    setPanel(undefined);
    if (!isOpen || !filePath) return;
    let cancelled = false;
    setPanel({ loading: true, error: null, diff: '' });
    window.api
      .invoke('git:file-diff-vs-remote', projectPath, filePath)
      .then((res: { diff?: string; remoteRef?: string; error?: string }) => {
        if (cancelled) return;
        if (res?.remoteRef) setRemoteRef(res.remoteRef);
        setPanel(
          res?.error
            ? { loading: false, error: res.error, diff: '' }
            : { loading: false, error: null, diff: res?.diff ?? '' },
        );
      })
      .catch((e: any) => {
        if (!cancelled) setPanel({ loading: false, error: e?.message ?? String(e), diff: '' });
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, projectPath, filePath]);

  const fileName = filePath?.split('/').pop() ?? '';
  const base = projectPath.replace(/\/+$/, '');
  const relPath = filePath?.startsWith(`${base}/`)
    ? filePath.slice(base.length + 1)
    : (filePath ?? '');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-[92vw] max-w-[1200px] min-h-[320px] max-h-[80vh]"
    >
      <ModalHeader
        onClose={onClose}
        title={
          <span className="flex items-center gap-2 min-w-0">
            <img src={getFileIconPath(fileName)} alt="" className="w-[18px] h-[18px] shrink-0" />
            <span className="truncate text-[15px]">{fileName}</span>
          </span>
        }
        description={<span className="text-[13px]">{relPath}</span>}
      />
      <ModalBody className="p-0 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="sticky top-0 z-10 grid grid-cols-2 h-9 border-b border-divider bg-card-background text-[13px] font-medium text-text-secondary">
            <span className="flex items-center gap-1.5 px-3 min-w-0">
              <GitBranch className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              <span className="truncate">{remoteRef || 'remote default'}</span>
            </span>
            <span className="flex items-center gap-1.5 px-3 min-w-0 border-l border-border">
              <GitBranch className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              <span className="truncate">Local</span>
            </span>
          </div>
          <DiffPanelBody state={panel} />
        </div>
      </ModalBody>
    </Modal>
  );
}

export default RemoteDiffModal;