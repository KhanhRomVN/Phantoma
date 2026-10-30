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

interface ConfirmMergeProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetProjectId: string) => void;
  newProjectName: string;
  branchName: string;
  candidates: MergeCandidate[];
}

export function ConfirmMergeProjectModal({
  isOpen,
  onClose,
  onConfirm,
  newProjectName,
  branchName,
  candidates,
}: ConfirmMergeProjectModalProps) {
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (isOpen) setSelectedId(candidates[0]?.id ?? '');
  }, [isOpen, candidates]);

  const selected = candidates.find((c) => c.id === selectedId);
  const duplicate = !!selected?.hasBranch;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[420px]">
      <ModalBody className="px-5 py-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <GitMerge className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold leading-snug text-text-primary">
              Merge into existing project?
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-text-secondary">
            <b className="font-medium text-text-primary">{newProjectName}</b> uses the same git
            repository as {candidates.length > 1 ? 'these projects' : 'a project you already have'}.
            Merge it as branch{' '}
            <b className="font-medium text-text-primary">{branchName || 'detached'}</b> of:
          </p>
          <div className="flex max-h-[220px] flex-col gap-1 overflow-y-auto">
            {candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  'flex h-9 items-center justify-between rounded-md border px-3 text-left text-[13px] outline-none transition-colors',
                  selectedId === c.id
                    ? 'border-primary bg-primary/10 text-text-primary'
                    : 'border-border text-text-secondary hover:text-text-primary',
                )}
              >
                <span className="truncate">{c.name}</span>
                {selectedId === c.id && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
          {duplicate && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-error/40 bg-error/10 px-3 py-2.5 text-xs leading-relaxed text-error"
            >
              <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
              <span>
                <b>{selected?.name}</b> already has a branch named <b>{branchName || 'detached'}</b>.
                Merging will point that branch to this folder instead.
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
          {duplicate ? 'Merge anyway' : 'Merge'}
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmMergeProjectModal;