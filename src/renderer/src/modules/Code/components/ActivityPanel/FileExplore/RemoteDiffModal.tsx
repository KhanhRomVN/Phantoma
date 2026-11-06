/**
 * ------------------------------------------------------------------
 * Remote Diff Modal
 * ------------------------------------------------------------------
 * Modal xem diff 2 cột (trái: remote default branch, phải: local) của
 * 1 file, dùng lại FileSection/parseDiff của Git DiffView.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
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

const noop = () => {};
const ROW_CLASS = 'text-[13px] leading-[21px]';

// ─── Component ─────────────────────────────────────────────────────────
export function RemoteDiffModal({ isOpen, onClose, projectPath, filePath }: RemoteDiffModalProps) {
  const [diff, setDiff] = useState('');
  const [remoteRef, setRemoteRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !filePath) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDiff('');
    window.api
      .invoke('git:file-diff-vs-remote', projectPath, filePath)
      .then((res: { diff?: string; remoteRef?: string; error?: string }) => {
        if (cancelled) return;
        if (res?.error) {
          setError(res.error);
          return;
        }
        setDiff(res?.diff ?? '');
        setRemoteRef(res?.remoteRef ?? '');
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
  }, [isOpen, projectPath, filePath]);

  const files = useMemo(
    () =>
      parseDiff(diff).map((f) => ({
        ...f,
        hunks: f.hunks.map((h) => ({ ...h, lines: h.lines.filter((l) => l.type !== 'meta') })),
      })),
    [diff],
  );

  const fileName = filePath?.split('/').pop() ?? '';
  const base = projectPath.replace(/\/+$/, '');
  const relPath = filePath?.startsWith(`${base}/`) ? filePath.slice(base.length + 1) : (filePath ?? '');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-fit min-w-[560px] max-w-[60vw] min-h-[320px] max-h-[70vh]"
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
        <div className="grid grid-cols-2 h-9 shrink-0 border-b border-divider text-[13px] font-medium text-text-secondary">
          <span className="flex items-center gap-1.5 px-3 min-w-0">
            <GitBranch className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span className="truncate">{remoteRef || 'remote default'}</span>
          </span>
          <span className="flex items-center gap-1.5 px-3 min-w-0 border-l border-border">
            <GitBranch className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span className="truncate">Local</span>
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-text-secondary">
              <Loader className="w-4 h-4 animate-spin" strokeWidth={1.5} />
              <span>Đang tải diff...</span>
            </div>
          ) : error ? (
            <div className="py-10 px-4 text-center text-[13px] text-error">{error}</div>
          ) : files.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-text-secondary">
              Không có khác biệt
            </div>
          ) : (
            files.map((f) => (
              <FileSection
                key={f.path}
                file={f}
                collapsed={false}
                onToggle={noop}
                hideHeader
                rowClassName={ROW_CLASS}
              />
            ))
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}

export default RemoteDiffModal;