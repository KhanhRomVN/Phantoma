import { useState } from 'react';
import { Button } from '@renderer/components/ui/Button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@renderer/components/ui/Modal';
import { PLATFORMS } from '../../constants';
import type { PlatformId } from '../../types';
import { Logo } from '../ui/Primitives';

interface ServiceModalProps {
  available: PlatformId[];
  onClose: () => void;
  onAdd: (platform: PlatformId) => void;
}

export function ServiceModal({ available, onClose, onAdd }: ServiceModalProps) {
  const [pick, setPick] = useState<PlatformId | null>(null);
  return (
    <Modal isOpen onClose={onClose}>
      <ModalHeader title="Add service" description="Choose a service that isn't in the list yet" onClose={onClose} />
      <ModalBody className="py-4">
        {available.length === 0 ? (
          <div className="py-6 text-center text-sm text-text-secondary">
            All services have been added.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {available.map((p) => (
              <button
                key={p}
                onClick={() => setPick(p)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-lg text-xs transition-colors ${
                  pick === p
                    ? 'bg-primary/15 text-primary'
                    : 'bg-card-background text-text-primary hover:bg-card-hover'
                }`}
              >
                <Logo platform={p} size={24} />
                {PLATFORMS[p].label}
              </button>
            ))}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          onClick={onClose}
          className="bg-primary/10 text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30 disabled:hover:bg-primary/10"
        >
          Cancel
        </Button>
        <Button
          onClick={() => pick && onAdd(pick)}
          disabled={!pick}
          className="bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30"
        >
          Add service
        </Button>
      </ModalFooter>
    </Modal>
  );
}