import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';

interface ConfirmDeleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  profiles: { id: string; email: string; displayName?: string; folder?: string | null }[];
}

export function ConfirmDeleteProfileModal({ isOpen, onClose, onConfirm, profiles }: ConfirmDeleteProfileModalProps) {
  const count = profiles.length;
  const isMulti = count > 1;
  const title = isMulti ? `Delete ${count} profiles?` : 'Delete profile?';

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={false} className='max-w-[400px]'>
      <ModalBody className='px-5 py-6'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <div className='grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-error/20 bg-error/10 text-error'>
            <AlertTriangle className='h-5 w-5' strokeWidth={1.8} />
          </div>

          <h3 className='text-base font-semibold leading-snug text-text-primary'>{title}</h3>

          <p className='max-w-[280px] text-xs leading-relaxed text-text-secondary'>
            Are you sure you want to delete{' '}
            <b className='break-all font-medium text-text-primary'>
              {isMulti ? `${count} profiles` : `"${profiles[0]?.email ?? ''}"`}
            </b>
            ? This will permanently delete {isMulti ? 'their folders' : 'its folder'} from this machine. This action cannot be undone.
          </p>

          {!isMulti && profiles[0]?.folder && (
            <p className='max-w-full break-all rounded-md bg-card-background px-2 py-1 font-mono text-[11px] text-text-secondary'>
              {profiles[0].folder}
            </p>
          )}

          {isMulti && (
            <div className='mt-1 max-h-48 w-full overflow-y-auto rounded-md bg-card-background p-1.5 text-left'>
              {profiles.map((p) => (
                <div key={p.id} className='flex items-center gap-2 px-1.5 py-1 text-[12px] text-text-secondary' title={p.email}>
                  <span className='truncate'>{p.email}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter className='gap-0 border-t border-border p-0'>
        <button
          onClick={onClose}
          className='h-[42px] flex-1 border-r border-border text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.03] hover:text-text-primary'
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className='flex h-[42px] flex-1 items-center justify-center gap-1.5 text-xs font-semibold text-error transition-colors hover:bg-error/[0.06]'
        >
          <Trash2 className='h-3.5 w-3.5' />
          Delete
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmDeleteProfileModal;