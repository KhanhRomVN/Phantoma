import { useEffect, useState } from 'react';
import { Palette, LayoutTemplate } from 'lucide-react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@renderer/components/ui/Modal';

interface DesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => void;
}

const NAME_MAX = 40;
const DESC_MAX = 120;

export function DesignModal({ isOpen, onClose, onSubmit }: DesignModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
    }
  }, [isOpen]);

  const canSubmit = name.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(name.trim(), description.trim());
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader
        title="New design"
        description="Create a page diagram with live preview"
        onClose={onClose}
      />
      <ModalBody className="flex flex-col gap-4 py-4">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card-background p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <LayoutTemplate className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-primary">Starter template</p>
            <p className="text-[11px] text-text-secondary">Home (/) and Profile (/profile), linked together</p>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary">Name</label>
            <span className="text-[10px] tabular-nums text-text-secondary/50">
              {name.length}/{NAME_MAX}
            </span>
          </div>
          <div className="relative">
            <Palette className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary/60" />
            <input
              autoFocus
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Design name"
              className="w-full rounded-lg border border-border bg-input-background py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary/50 transition-colors focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary">Description (optional)</label>
            <span className="text-[10px] tabular-nums text-text-secondary/50">
              {description.length}/{DESC_MAX}
            </span>
          </div>
          <textarea
            value={description}
            maxLength={DESC_MAX}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What is this design for?"
            className="w-full resize-none rounded-lg border border-border bg-input-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 transition-colors focus:border-primary focus:outline-none"
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-xs text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Create
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default DesignModal;