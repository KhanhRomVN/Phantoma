import { Square } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';

interface ConfirmStopBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  profile: { email: string; browser?: string } | null;
}

export function ConfirmStopBrowserModal({ isOpen, onClose, onConfirm, profile }: ConfirmStopBrowserModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={false} className='max-w-[400px]'>
      <ModalBody className='px-5 py-6'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <div className='grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-warn/20 bg-warn/10 text-warn'>
            <Square className='h-5 w-5' strokeWidth={1.8} />
          </div>

          <h3 className='text-base font-semibold leading-snug text-text-primary'>Stop browser?</h3>

          <p className='max-w-[300px] text-xs leading-relaxed text-text-secondary'>
            Close the running browser of{' '}
            <b className='break-all font-medium text-text-primary'>"{profile?.email ?? ''}"</b>? Unsaved work in the
            browser will be lost.
            {profile?.browser === 'chromium' && ' Its temporary data folder will be deleted.'}
          </p>
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
          className='flex h-[42px] flex-1 items-center justify-center gap-1.5 text-xs font-semibold text-warn transition-colors hover:bg-warn/[0.06]'
        >
          <Square className='h-3.5 w-3.5' />
          Stop
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmStopBrowserModal;