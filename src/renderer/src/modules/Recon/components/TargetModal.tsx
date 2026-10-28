import { useEffect, useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';
import { Input } from '@renderer/components/ui/Input';
import { Button } from '@renderer/components/ui/Button';
import type { ReconTarget } from '../ReconController';
import { TYPE_META, TYPE_ORDER, resolveType, withAlpha, TypeIcon } from './targetType';
import type { TargetType } from './targetType';

export interface TargetModalValue {
  identifier: string;
  type: TargetType;
}

interface TargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: TargetModalValue) => void;
  target?: ReconTarget | null;
}

const PLACEHOLDER: Record<TargetType, string> = {
  person: 'Nguyễn Văn A hoặc user@example.com',
  website: 'https://example.com',
  domain: 'example.com',
  phone: '+84 912 345 678',
  company: 'Tên công ty',
  other: 'Giá trị mục tiêu',
};

export default function TargetModal({ isOpen, onClose, onSubmit, target }: TargetModalProps) {
  const isEdit = !!target;
  const [type, setType] = useState<TargetType>('person');
  const [identifier, setIdentifier] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setType(target ? resolveType(target.type) : 'person');
    setIdentifier(target?.email ?? '');
  }, [isOpen, target]);

  const trimmed = identifier.trim();
  const unchanged = !!target && trimmed === target.email && type === resolveType(target.type);
  const canSubmit = !!trimmed && !unchanged;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ identifier: trimmed, type });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className='max-w-lg'>
      <ModalHeader
        title={isEdit ? 'Chỉnh sửa target' : 'Thêm target mới'}
        description={isEdit ? target?.email : 'Chọn loại mục tiêu và nhập giá trị cần điều tra'}
        onClose={onClose}
      />

      <ModalBody className='space-y-4 py-4'>
        <div>
          <div className='text-xs font-medium text-text-secondary mb-2'>Loại mục tiêu</div>
          <div className='grid grid-cols-3 gap-2'>
            {TYPE_ORDER.map((t) => {
              const { label, color } = TYPE_META[t];
              const on = t === type;
              return (
                <button
                  key={t}
                  type='button'
                  onClick={() => setType(t)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                    on ? '' : 'border-border text-text-secondary hover:bg-card-background-hover hover:text-text-primary'
                  }`}
                  style={
                    on
                      ? { backgroundColor: withAlpha(color, 0.15), color, borderColor: withAlpha(color, 0.5) }
                      : undefined
                  }
                >
                  <TypeIcon type={t} size={18} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label='Giá trị'
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
          placeholder={PLACEHOLDER[type]}
          leftIcon={<TypeIcon type={type} size={14} />}
          hint={
            isEdit
              ? 'Thay đổi sẽ được áp dụng cho hồ sơ target này.'
              : 'Hệ thống sẽ quét các nguồn OSINT liên quan đến giá trị này.'
          }
          autoFocus
        />
      </ModalBody>

      <ModalFooter>
        <Button variant='outline' onClick={onClose}>
          Hủy
        </Button>
        <Button variant='solid' disabled={!canSubmit} onClick={handleSubmit}>
          {isEdit ? 'Lưu thay đổi' : 'Bắt đầu Recon'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}