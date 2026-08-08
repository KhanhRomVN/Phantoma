import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  items: string[];
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  items,
}) => {
  const count = items.length;
  const isMulti = count > 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={false}>
      <ModalHeader
        title={isMulti ? `Xóa ${count} mục` : 'Xóa file'}
        description={
          isMulti
            ? 'Các mục sau sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.'
            : `"${items[0] || ''}" sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.`
        }
        onClose={onClose}
      />
      <ModalBody>
        {isMulti && (
          <div className="max-h-32 overflow-y-auto bg-card-background rounded-md p-2 mb-2">
            {items.map((name, i) => (
              <div key={i} className="text-[13px] text-text-secondary py-0.5 truncate">
                {name}
              </div>
            ))}
          </div>
        )}
        <div className="flex items-start gap-3 p-3 rounded-md bg-error/10 border border-error/20">
          <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-[13px] text-text-secondary leading-relaxed">
            File đã xóa không thể khôi phục. Hãy chắc chắn bạn không cần chúng nữa.
          </p>
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors text-[13px]"
        >
          Hủy
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-lg bg-error text-white hover:bg-error/90 transition-colors text-[13px] flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
          {isMulti ? `Xóa ${count} mục` : 'Xóa'}
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default DeleteConfirmModal;