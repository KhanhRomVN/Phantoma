import { useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { PLATFORMS } from '../../constants';
import type { PlatformId, PlatformInfo } from '../../types';
import { Modal } from '../ui/Modal';
import { Logo } from '../ui/Primitives';

interface AddAccountModalProps {
  onClose: () => void;
}

export function AddAccountModal({ onClose }: AddAccountModalProps) {
  const [pick, setPick] = useState<PlatformId>('telegram');
  return (
    <Modal title="Add account" icon={Plus} onClose={onClose}>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(Object.entries(PLATFORMS) as [PlatformId, PlatformInfo][]).map(([k, p]) => (
          <button
            key={k}
            onClick={() => setPick(k)}
            className={`ch-hv flex flex-col items-center gap-1.5 py-3 rounded-lg text-[11.5px] text-text-primary border ${
              pick === k ? 'bg-primary/15 border-primary' : 'bg-background border-border'
            }`}
          >
            <Logo platform={k} size={24} />
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg mb-4 text-[11.5px] bg-success/10 border border-success/30 text-success">
        <ShieldCheck size={14} /> Login sessions are sandboxed and stored with AES-256 encryption on
        this device.
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="ch-hv2 px-3 h-8 rounded-lg text-[12px] border border-border text-text-secondary"
        >
          Cancel
        </button>
        <button
          onClick={onClose}
          className="px-3 h-8 rounded-lg text-[12px] font-semibold bg-primary text-text-foreground"
        >
          Log in to {PLATFORMS[pick].label}
        </button>
      </div>
    </Modal>
  );
}