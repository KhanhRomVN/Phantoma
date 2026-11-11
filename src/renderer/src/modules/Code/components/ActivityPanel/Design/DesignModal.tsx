import { useEffect, useState } from 'react';
import { Palette, Monitor, Smartphone } from 'lucide-react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@renderer/components/ui/Modal';
import { cn } from '@renderer/utils/cn';

interface DesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string, platform: 'website' | 'mobile') => void;
}

const NAME_MAX = 40;
const DESC_MAX = 120;

type Platform = 'website' | 'mobile';

const PLATFORMS: Array<{ id: Platform; label: string; icon: typeof Monitor; description: string }> = [
  {
    id: 'website',
    label: 'Website (Desktop)',
    icon: Monitor,
    description: 'Responsive web pages optimized for desktop browsers',
  },
  {
    id: 'mobile',
    label: 'Mobile App',
    icon: Smartphone,
    description: 'Mobile-first UI components for iOS and Android',
  },
];

export function DesignModal({ isOpen, onClose, onSubmit }: DesignModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState<Platform>('website');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setPlatform('website');
    }
  }, [isOpen]);

  const canSubmit = name.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(name.trim(), description.trim(), platform);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader
        title="New design"
        description="Create a page diagram with live preview"
        onClose={onClose}
      />
      <ModalBody className="flex flex-col gap-4 py-4">
        <div>
          <label className="mb-2 block text-xs font-medium text-text-secondary">Platform</label>
          <div className="grid grid-cols-2 gap-3">
            {PLATFORMS.map((p) => {
              const Icon = p.icon;
              const isSelected = platform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatform(p.id)}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card-background hover:border-primary/50 hover:bg-card-hover',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg',
                      isSelected ? 'bg-primary/20 text-primary' : 'bg-background text-text-secondary',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p
                      className={cn(
                        'text-xs font-semibold',
                        isSelected ? 'text-primary' : 'text-text-primary',
                      )}
                    >
                      {p.label}
                    </p>
                    <p className="text-[11px] text-text-secondary">{p.description}</p>
                  </div>
                </button>
              );
            })}
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
          className="bg-button-soft-background text-text-secondary hover:bg-button-soft-background/80 hover:text-text-primary active:bg-button-soft-background/70 rounded-lg px-4 py-2 text-xs font-medium transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="bg-button-soft-background text-primary hover:bg-button-soft-background/80 active:bg-button-soft-background/70 disabled:cursor-not-allowed disabled:opacity-40 rounded-lg px-4 py-2 text-xs font-medium transition-all"
        >
          Create
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default DesignModal;