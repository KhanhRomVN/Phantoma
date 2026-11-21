import { useState } from 'react';
import {
  Briefcase,
  GraduationCap,
  Hexagon,
  Home,
  Laptop,
  Terminal,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@renderer/components/ui/Button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@renderer/components/ui/Modal';

const ICON_CHOICES: LucideIcon[] = [
  User,
  Briefcase,
  Hexagon,
  Terminal,
  Users,
  Laptop,
  Home,
  TrendingUp,
  GraduationCap,
];

interface GroupModalProps {
  onClose: () => void;
  onCreate: (name: string, icon: LucideIcon) => void;
}

export function GroupModal({ onClose, onCreate }: GroupModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<LucideIcon>(ICON_CHOICES[0]);
  const valid = name.trim().length > 0;
  const submit = () => {
    if (valid) onCreate(name.trim(), icon);
  };
  return (
    <Modal isOpen onClose={onClose}>
      <ModalHeader title="Add group" onClose={onClose} />
      <ModalBody className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-text-secondary">Group name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="e.g. Work, Family…"
            className="w-full h-9 rounded-lg px-3 text-sm outline-none bg-input-background text-text-primary placeholder:text-text-secondary border border-border focus:border-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-text-secondary">Icon</span>
          <div className="grid grid-cols-5 gap-2">
            {ICON_CHOICES.map((Ic, i) => (
              <button
                key={i}
                onClick={() => setIcon(Ic)}
                className={`h-10 rounded-lg flex items-center justify-center transition-colors ${
                  icon === Ic
                    ? 'bg-primary/15 text-primary'
                    : 'bg-card-background text-text-secondary hover:bg-card-hover'
                }`}
              >
                <Ic size={18} />
              </button>
            ))}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          onClick={onClose}
          className="bg-primary/10 text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30 disabled:hover:bg-primary/10"
        >
          Cancel
        </Button>
        <Button
          onClick={submit}
          disabled={!valid}
          className="bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30"
        >
          Create group
        </Button>
      </ModalFooter>
    </Modal>
  );
}