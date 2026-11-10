import { memo } from 'react';
import { Modal, ModalBody } from '@renderer/components/ui/Modal';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '@renderer/components/ui/Button';
import type { TaskStatus } from '../../services/task.service';
import { cn } from '@renderer/utils/cn';

interface ConfirmUnlinkTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  onConfirm: (newStatus: TaskStatus) => void;
}

export const ConfirmUnlinkTaskModal = memo(function ConfirmUnlinkTaskModal({
  isOpen,
  onClose,
  taskTitle,
  onConfirm,
}: ConfirmUnlinkTaskModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[420px] w-[90vw]">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-divider">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-warning" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">Unlink Task</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 grid place-items-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors outline-none"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ModalBody className="p-4 flex flex-col gap-4">
        <div className="space-y-2">
          <p className="text-sm text-text-primary">
            Bạn đang unlink task <span className="font-semibold">"{taskTitle}"</span>
          </p>
          <p className="text-xs text-text-secondary">
            Task này sẽ bị gỡ khỏi branch hiện tại. Chọn trạng thái mới:
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onConfirm('done')}
            className={cn(
              'w-full px-4 py-3 rounded-lg border transition-all text-left',
              'border-border hover:border-success/50 hover:bg-success/5',
              'focus:outline-none focus:ring-2 focus:ring-success/20',
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-text-primary">Done</div>
                <div className="text-xs text-text-secondary mt-0.5">
                  Đánh dấu task đã hoàn thành
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onConfirm('todo')}
            className={cn(
              'w-full px-4 py-3 rounded-lg border transition-all text-left',
              'border-border hover:border-text-secondary/30 hover:bg-card-hover',
              'focus:outline-none focus:ring-2 focus:ring-text-secondary/20',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full border-2 border-text-secondary shrink-0"
                style={{ borderStyle: 'solid' }}
              />
              <div>
                <div className="text-sm font-medium text-text-primary">To do</div>
                <div className="text-xs text-text-secondary mt-0.5">
                  Trả task về trạng thái chưa làm
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-divider">
          <Button
            onClick={onClose}
            className="bg-button-soft-background text-text-secondary hover:bg-button-soft-background/80 hover:text-text-primary active:bg-button-soft-background/70"
          >
            Cancel
          </Button>
        </div>
      </ModalBody>
    </Modal>
  );
});

export default ConfirmUnlinkTaskModal;