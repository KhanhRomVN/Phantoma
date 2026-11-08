import { AlertTriangle, Minus, Plus, Trash2, type LucideIcon } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { Button } from '@renderer/components/ui/Button';
import { cn } from '@renderer/utils/cn';

export type FileChangeAction = 'discard' | 'stage' | 'unstage';

interface ActionConfig {
  title: string;
  prefix: string;
  suffix: string;
  confirmLabel: string;
  BadgeIcon: LucideIcon;
  ConfirmIcon: LucideIcon;
  badgeClass: string;
  confirmClass: string;
}

const ACTION_CONFIG: Record<FileChangeAction, ActionConfig> = {
  discard: {
    title: 'Discard Changes?',
    prefix: 'Are you sure you want to discard changes in',
    suffix: '? This cannot be undone.',
    confirmLabel: 'Discard',
    BadgeIcon: AlertTriangle,
    ConfirmIcon: Trash2,
    badgeClass: 'bg-error/10 border-error/20 text-error',
    confirmClass: 'bg-error/10 text-error hover:bg-error hover:text-text-primary active:bg-error/80',
  },
  stage: {
    title: 'Stage Changes?',
    prefix: 'Do you want to stage changes in',
    suffix: '?',
    confirmLabel: 'Stage',
    BadgeIcon: Plus,
    ConfirmIcon: Plus,
    badgeClass: 'bg-primary/10 border-primary/20 text-primary',
    confirmClass: 'bg-primary/10 text-primary hover:bg-primary hover:text-text-primary active:bg-primary/80',
  },
  unstage: {
    title: 'Unstage Changes?',
    prefix: 'Do you want to unstage changes in',
    suffix: '?',
    confirmLabel: 'Unstage',
    BadgeIcon: Minus,
    ConfirmIcon: Minus,
    badgeClass: 'bg-primary/10 border-primary/20 text-primary',
    confirmClass: 'bg-primary/10 text-primary hover:bg-primary hover:text-text-primary active:bg-primary/80',
  },
};

interface ConfirmFileChangeModalProps {
  isOpen: boolean;
  action: FileChangeAction;
  fileName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmFileChangeModal({
  isOpen,
  action,
  fileName,
  onClose,
  onConfirm,
}: ConfirmFileChangeModalProps) {
  const cfg = ACTION_CONFIG[action];
  const { BadgeIcon, ConfirmIcon } = cfg;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className={'max-w-[400px]'}>
      <ModalBody className={'py-6 px-5'}>
        <div className={'flex flex-col items-center text-center gap-3'}>
          <div
            className={cn(
              'w-11 h-11 rounded-xl border grid place-items-center shrink-0',
              cfg.badgeClass,
            )}
          >
            <BadgeIcon className={'w-5 h-5'} strokeWidth={1.8} />
          </div>

          <h3 className={'text-base font-semibold text-text-primary leading-snug'}>{cfg.title}</h3>

          <p className={'text-xs text-text-secondary leading-relaxed max-w-[280px]'}>
            {cfg.prefix} <b className={'font-medium text-text-primary break-all'}>{fileName}</b>
            {cfg.suffix}
          </p>
        </div>
      </ModalBody>

      <ModalFooter className={'gap-0 p-0 border-t border-divider'}>
        <Button
          onClick={onClose}
          className={
            'flex-1 h-[42px] text-xs font-medium bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/20 hover:text-text-primary active:bg-text-secondary/30 border-r border-divider rounded-none'
          }
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={cn(
            'flex-1 h-[42px] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 rounded-none',
            cfg.confirmClass,
          )}
        >
          <ConfirmIcon className={'w-3.5 h-3.5'} />
          {cfg.confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmFileChangeModal;