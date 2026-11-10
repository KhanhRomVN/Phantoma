/**
 * ------------------------------------------------------------------
 * Sync File Diff Modal
 * ------------------------------------------------------------------
 * Modal xem diff của 1 file mà SyncBranchModal sắp pull từ branch nguồn
 * về branch hiện tại. Phần hiển thị diff dùng DiffBlock dùng chung.
 * ------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { DiffBlock } from '@renderer/components/common/DiffBlock';
import { getFileIconPath } from '@renderer/utils/file-icon';

interface SyncFileDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectPath: string;
  sourceRef: string;
  sourceLabel: string;
  filePath: string | null;
  files?: string[];
  onNavigate?: (path: string) => void;
}

interface PanelState {
  loading: boolean;
  error: string | null;
  diff: string;
}

export function SyncFileDiffModal({
  isOpen,
  onClose,
  projectPath,
  sourceRef,
  sourceLabel,
  filePath,
  files = [],
  onNavigate,
}: SyncFileDiffModalProps) {
  const [panel, setPanel] = useState<PanelState>({ loading: false, error: null, diff: '' });
  const index = filePath ? files.indexOf(filePath) : -1;
  const canNav = !!onNavigate && index >= 0 && files.length > 1;
  const go = (delta: number) => {
    if (!canNav) return;
    onNavigate!(files[(index + delta + files.length) % files.length]);
  };

  useEffect(() => {
    if (!isOpen || !canNav) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, canNav, index, files, onNavigate]);

  useEffect(() => {
    if (!isOpen || !filePath || !sourceRef) return;
    let cancelled = false;
    setPanel({ loading: true, error: null, diff: '' });
    (window as any).api
      .invoke('git:branch-sync-file-diff', projectPath, sourceRef, filePath)
      .then((res: { diff?: string; error?: string }) => {
        if (cancelled) return;
        setPanel({ loading: false, error: res?.error ?? null, diff: res?.diff ?? '' });
      })
      .catch((e: any) => {
        if (!cancelled) setPanel({ loading: false, error: e?.message || String(e), diff: '' });
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, projectPath, sourceRef, filePath]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-[92vw] max-w-[1200px] min-h-[320px] max-h-[80vh]"
    >
      <ModalHeader
        onClose={onClose}
        title={
          <span className="flex items-center gap-2">
            <img
              src={getFileIconPath(filePath?.split('/').pop() ?? '')}
              alt=""
              className="h-5 w-5 shrink-0"
            />
            <span className="truncate">{filePath ?? ''}</span>
          </span>
        }
        description={`Changes pulling from ${sourceLabel || 'the source'}`}
      />
      {canNav && (
        <div className="flex shrink-0 items-center gap-2 border-b border-text-secondary/20 px-4 py-1.5">
          <button
            type="button"
            title="Previous file (←)"
            onClick={() => go(-1)}
            className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-text-secondary outline-none transition-colors hover:bg-card-hover hover:text-text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-[12.5px] text-text-secondary">
            {index + 1} / {files.length}
          </span>
          <button
            type="button"
            title="Next file (→)"
            onClick={() => go(1)}
            className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-text-secondary outline-none transition-colors hover:bg-card-hover hover:text-text-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
      <ModalBody className="p-0">
        <DiffBlock diff={panel.diff} loading={panel.loading} error={panel.error} />
      </ModalBody>
    </Modal>
  );
}

export default SyncFileDiffModal;