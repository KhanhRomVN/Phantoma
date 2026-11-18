import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { IconBtn } from './Primitives';

interface ModalProps {
  title: string;
  icon: LucideIcon;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, icon: Icon, onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/75"
      onClick={onClose}
    >
      <div
        className="w-[440px] rounded-xl overflow-hidden bg-panel-background border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 h-11 border-b border-border text-text-primary">
          <Icon size={15} className="text-primary" />
          <span className="text-[13px] font-semibold">{title}</span>
          <span className="ml-auto">
            <IconBtn icon={X} tip="Close" onClick={onClose} />
          </span>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}