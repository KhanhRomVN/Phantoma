import { useEffect, useState } from 'react';
import { AlertTriangle, Link2 } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { Button } from '@renderer/components/ui/Button';

export type DuplicateRepoKind = 'different-branch' | 'same-branch';

interface DuplicateRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (linkName: string) => void;
  kind: DuplicateRepoKind;
  existingName: string;
  existingBranch: string;
  newBranch: string;
  defaultLinkName: string;
}

export function DuplicateRepoModal({
  isOpen,
  onClose,
  onConfirm,
  kind,
  existingName,
  existingBranch,
  newBranch,
  defaultLinkName,
}: DuplicateRepoModalProps) {
  const [linkName, setLinkName] = useState(defaultLinkName);

  useEffect(() => {
    if (isOpen) setLinkName(defaultLinkName);
  }, [isOpen, defaultLinkName]);

  const isSameBranch = kind === 'same-branch';
  const Icon = isSameBranch ? AlertTriangle : Link2;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[420px]">
      <ModalBody className="py-6 px-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl border grid place-items-center shrink-0 ${
              isSameBranch
                ? 'bg-error/10 border-error/20 text-error'
                : 'bg-[#ff6a1f]/10 border-[#ff6a1f]/20 text-[#ff6a1f]'
            }`}
          >
            <Icon className="w-5 h-5" strokeWidth={1.8} />
          </div>

          <h3 className="text-base font-semibold text-text-primary leading-snug">
            {isSameBranch ? 'Same repo and same branch' : 'Same repo, different branch'}
          </h3>

          <p className="text-xs text-text-secondary leading-relaxed max-w-[320px]">
            {isSameBranch ? (
              <>
                This folder is the same repo as{' '}
                <b className="font-medium text-text-primary">{existingName}</b> and is on the same
                branch <b className="font-medium text-text-primary">{newBranch || '—'}</b>. Adding it
                may cause conflicting changes between the two folders.
              </>
            ) : (
              <>
                This folder is the same repo as{' '}
                <b className="font-medium text-text-primary">{existingName}</b>, only on a different
                branch (<b className="font-medium text-text-primary">{existingBranch || '—'}</b> →{' '}
                <b className="font-medium text-text-primary">{newBranch || '—'}</b>). The two project
                folders will be linked under one name.
              </>
            )}
          </p>

          {!isSameBranch && (
            <div className="w-full text-left">
              <div className="text-[10.5px] text-text-secondary/60 mb-1">Link name</div>
              <input
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                className="w-full h-8 px-2.5 rounded-md bg-button-soft-background text-xs text-text-primary outline-none border border-divider focus:border-[#ff6a1f]/50"
              />
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter className="gap-0 p-0 border-t border-divider">
        <Button
          onClick={onClose}
          className="flex-1 h-[42px] text-xs font-medium bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/20 hover:text-text-primary active:bg-text-secondary/30 border-r border-divider rounded-none"
        >
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(linkName.trim() || defaultLinkName)}
          className="flex-1 h-[42px] text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-text-primary active:bg-primary/80 transition-colors rounded-none flex items-center justify-center gap-1.5"
        >
          <Icon className="w-3.5 h-3.5" />
          {isSameBranch ? 'Add anyway' : 'Link projects'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default DuplicateRepoModal;