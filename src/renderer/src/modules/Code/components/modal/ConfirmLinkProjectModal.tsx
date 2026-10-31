import { useEffect, useState } from 'react';
import { AlertTriangle, Check, GitMerge } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';

export interface MergeCandidate {
  id: string;
  name: string;
  hasBranch?: boolean;
}

interface ConfirmLinkProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetProjectId: string) => void;
  newProjectName: string;
  branchName: string;
  candidates: MergeCandidate[];
}

export function ConfirmLinkProjectModal({
  isOpen,
  onClose,
  onConfirm,
  newProjectName,
  branchName,
  candidates,
}: ConfirmLinkProjectModalProps) {
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (isOpen) setSelectedId(candidates[0]?.id ?? '');
  }, [isOpen, candidates]);

  const selected = candidates.find((c) => c.id === selectedId);
  const duplicate = !!selected?.hasBranch;
  const label = branchName || 'detached';

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[400px]">
      <ModalBody className="px-5 py-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <GitMerge className="h-5 w-5" strokeWidth={1.8} />
          </div>

          <h3 className="text-base font-semibold leading-snug text-text-primary">
            Link into existing project?
          </h3>

          <p className="max-w-[300px] text-xs leading-relaxed text-text-secondary">
            <b className="font-medium text-text-primary">{newProjectName}</b> uses the same git
            repository as {candidates.length > 1 ? 'these projects' : 'a project you already have'}.
            Link it as branch <b className="font-medium text-text-primary">{label}</b>
          </p>

          {duplicate && (
            <div
              role="alert"
              className="flex w-full items-start gap-2 rounded-md border border-error/40 bg-error/10 px-3 py-2.5 text-left text-xs leading-relaxed text-error"
            >
              <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
              <span>
                <b>{selected?.name}</b> already has a branch named <b>{label}</b>. Linking will
                point that branch to this folder instead.
              </span>
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter className="gap-0 border-t border-divider p-0">
        <button
          onClick={onClose}
          className="h-[42px] flex-1 border-r border-divider text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.03] hover:text-text-primary"
        >
          Keep separate
        </button>
        <button
          onClick={() => selectedId && onConfirm(selectedId)}
          disabled={!selectedId}
          className="flex h-[42px] flex-1 items-center justify-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/[0.06] disabled:opacity-50"
        >
          <GitMerge className="h-3.5 w-3.5" />
          {duplicate ? 'Link anyway' : 'Link'}
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmLinkProjectModal;
