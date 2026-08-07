import { Globe, Palette } from 'lucide-react';
import { Modal, ModalHeader, ModalBody } from '@renderer/components/ui/Modal';

interface ServiceCard {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const SERVICE_CARDS: ServiceCard[] = [
  {
    id: 'website',
    name: 'Website',
    description: 'Giám sát & debug web app qua CDP',
    icon: <Globe className="w-5 h-5" />,
    color: '#5eb3ff',
  },
  {
    id: 'design',
    name: 'UI Design',
    description: 'Thiết kế giao diện trực quan',
    icon: <Palette className="w-5 h-5" />,
    color: '#c792ea',
  },
];

interface NewServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewServiceModal({ isOpen, onClose }: NewServiceModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <ModalHeader title="Thêm Service" onClose={onClose} />

      <ModalBody className="space-y-3 p-4">
        <p className="text-xs text-text-secondary/60">
          Chọn loại service để thêm vào project hiện tại.
        </p>

        <div className="grid grid-cols-1 gap-2">
          {SERVICE_CARDS.map((card) => (
            <div
              key={card.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-sidebar-item-hover/50 hover:bg-sidebar-item-hover cursor-pointer transition-colors"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${card.color}15`, color: card.color }}
              >
                {card.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary">{card.name}</div>
                <div className="text-[11px] text-text-secondary/50 mt-0.5">{card.description}</div>
              </div>
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: card.color }}
              />
            </div>
          ))}
        </div>
      </ModalBody>
    </Modal>
  );
}

export default NewServiceModal;
