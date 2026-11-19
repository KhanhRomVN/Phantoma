import { GitMerge } from 'lucide-react';
import type { Chat } from '../../types';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Primitives';

interface MergeModalProps {
  chats: Chat[];
  onConfirm: () => void;
  onClose: () => void;
}

export function MergeModal({ chats, onConfirm, onClose }: MergeModalProps) {
  return (
    <Modal title="Merge conversations" icon={GitMerge} onClose={onClose}>
      <p className="text-[12px] mb-3 text-text-secondary">
        The conversations below will be combined into a single thread. Messages are still sent to
        their original platform.
      </p>
      <div className="flex flex-col gap-1.5 mb-4">
        {chats.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] bg-background border border-border text-text-primary"
          >
            <Avatar name={c.name} size={24} />
            {c.name}
            <span className="ml-auto text-text-secondary">{c.unread} unread</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="ch-hv2 px-3 h-8 rounded-lg text-[12px] border border-border text-text-secondary"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-3 h-8 rounded-lg text-[12px] font-semibold bg-primary text-text-foreground"
        >
          Merge {chats.length} conversations
        </button>
      </div>
    </Modal>
  );
}