/**
 * ------------------------------------------------------------------
 * Create Design Modal
 * ------------------------------------------------------------------
 * Modal for creating new design projects with platform selection.
 * Supports Website (responsive), Desktop, and Mobile platforms.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState } from 'react';

// ── UI ──
import { Monitor, Smartphone, Globe } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ─── Types ──────────────────────────────────────────────────────────────

export type DesignPlatform = 'website' | 'desktop' | 'mobile';

interface CreateDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, platform: DesignPlatform) => void;
}

// ─── Component ──────────────────────────────────────────────────────────

export function CreateDesignModal({ isOpen, onClose, onConfirm }: CreateDesignModalProps) {
  const [name, setName] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<DesignPlatform>('website');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim(), selectedPlatform);
    // Reset form
    setName('');
    setSelectedPlatform('website');
  };

  const handleCancel = () => {
    setName('');
    setSelectedPlatform('website');
    onClose();
  };

  const platforms: Array<{
    id: DesignPlatform;
    icon: typeof Globe;
    label: string;
    description: string;
    iconClass: string;
    activeClass: string;
    textClass: string;
    hoverBorderClass: string;
  }> = [
    {
      id: 'website',
      icon: Globe,
      label: 'Website',
      description: 'Responsive design for all devices (desktop, tablet, mobile)',
      iconClass: 'bg-info/10 text-info',
      activeClass: 'border-info/60 bg-info/5',
      textClass: 'text-info',
      hoverBorderClass: 'hover:border-info/50',
    },
    {
      id: 'desktop',
      icon: Monitor,
      label: 'Desktop',
      description: 'Optimized for computers, laptops, and large screens',
      iconClass: 'bg-success/10 text-success',
      activeClass: 'border-success/60 bg-success/5',
      textClass: 'text-success',
      hoverBorderClass: 'hover:border-success/50',
    },
    {
      id: 'mobile',
      icon: Smartphone,
      label: 'Mobile',
      description: 'Optimized for phones and tablets',
      iconClass: 'bg-warn/10 text-warn',
      activeClass: 'border-warn/60 bg-warn/5',
      textClass: 'text-warn',
      hoverBorderClass: 'hover:border-warn/50',
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} className="max-w-2xl">
      {/* Header */}
      <ModalHeader title="Create New Design" description="Create new design projects with platform selection." onClose={handleCancel} />

      {/* Content */}
      <ModalBody className="p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Input */}
        <Input
          id="design-name"
          type="text"
          label="Design Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter design name..."
          autoFocus
        />

        {/* Platform Selection */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            Choose Platform
          </label>
          <div className="grid grid-cols-1 gap-3">
            {platforms.map((platform) => {
              const Icon = platform.icon;
              const isSelected = selectedPlatform === platform.id;

              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left',
                    isSelected
                      ? platform.activeClass
                      : cn('border-border bg-background hover:bg-sidebar-item-hover', platform.hoverBorderClass),
                  )}
                >
                  <div className={cn('p-2 rounded-lg transition-colors', platform.iconClass)}>
                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                  </div>

                  <div className="flex-1">
                    <h3
                      className={cn(
                        'text-sm font-semibold leading-tight transition-colors',
                        isSelected ? platform.textClass : 'text-text-primary',
                      )}
                    >
                      {platform.label}
                    </h3>
                    <p className="text-xs text-text-secondary/80 leading-tight mt-0.5">
                      {platform.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </form>
      </ModalBody>

      {/* Footer Actions */}
      <ModalFooter>
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="solid" disabled={!name.trim()} onClick={handleSubmit}>
          Create Design
        </Button>
      </ModalFooter>
    </Modal>
  );
}
