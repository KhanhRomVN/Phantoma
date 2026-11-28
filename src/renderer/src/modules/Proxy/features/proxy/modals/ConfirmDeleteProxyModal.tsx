import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';

interface ConfirmDeleteProxyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  proxies: { id: string; name: string; host: string; port: number; usedBy: string[] }[];
}

export function ConfirmDeleteProxyModal({ isOpen, onClose, onConfirm, proxies }: ConfirmDeleteProxyModalProps) {
  const count = proxies.length;
  const isMulti = count > 1;
  const inUse = proxies.reduce((a, p) => a + p.usedBy.length, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={false} className='max-w-[400px]'>
      <ModalBody className='px-5 py-6'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <div className='grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-error/20 bg-error/10 text-error'>
            <AlertTriangle className='h-5 w-5' strokeWidth={1.8} />
          </div>
          <h3 className='text-base font-semibold leading-snug text-text-primary'>
            {isMulti ? `Delete ${count} proxies?` : 'Delete proxy?'}
          </h3>
          <p className='max-w-[290px] text-xs leading-relaxed text-text-secondary'>
            Are you sure you want to delete{' '}
            <b className='break-all font-medium text-text-primary'>
              {isMulti ? `${count} proxies` : `"${proxies[0]?.name ?? ''}"`}
            </b>
            ? This action cannot be undone.
          </p>
          {inUse > 0 && (
            <p className='rounded-md bg-warn/10 px-2.5 py-1.5 text-[11px] text-warn'>
              {inUse} profile assignment{inUse > 1 ? 's' : ''} will lose their proxy.
            </p>
          )}
          {isMulti && (
            <div className='mt-1 max-h-40 w-full overflow-y-auto rounded-md bg-card-background p-1.5 text-left'>
              {proxies.map((p) => (
                <div key={p.id} className='flex items-center justify-between gap-2 px-1.5 py-1 text-[12px] text-text-secondary'>
                  <span className='truncate'>{p.name}</span>
                  <span className='shrink-0 font-mono text-[11px]'>
                    {p.host}:{p.port}
                  </span>
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

export default ConfirmDeleteProxyModal;