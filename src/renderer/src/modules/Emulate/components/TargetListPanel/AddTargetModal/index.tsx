/**
 * ------------------------------------------------------------------
 * AddTargetModal
 * ------------------------------------------------------------------
 * Modal thêm target mới — chuyển hướng theo platform (web/pc/
 * android/cli). Quản lý submit và trạng thái canSubmit.
 *
 * Các chức năng chính:
 * - Chọn platform và render form tương ứng
 * - Quản lý title/description cho edit mode
 * - Validate canSubmit trước khi thêm target
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React, { useRef, useCallback, useState, useEffect } from 'react';

// ── UI ──
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';
import { Website } from './Website';
import { Android } from './Android';
import { PC } from './PC';
import { CLI } from './CLI';

// ── Types ──
import type { AppPlatform, AppMode } from '../../../types/apps';

// ─── Types ──────────────────────────────────────────────────────────────
export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (app: {
    name: string;
    url?: string;
    executablePath?: string;
    mode: AppMode;
    platform: AppPlatform;
    icon?: string;
    emulatorSerial?: string;
    packageName?: string;
  }) => void | Promise<void>;
  existingApps?: {
    id?: string;
    name?: string;
    url?: string;
    executablePath?: string;
    emulatorSerial?: string;
    packageName?: string;
  }[];
  editApp?: { id: string; name: string; url?: string; executablePath?: string } | null;
  onEdit?: (id: string, data: { name: string; url?: string; executablePath?: string }) => void;
  onCanSubmitChange?: (value: boolean) => void;
}

interface AddTargetModalProps {
  isOpen: boolean;
  platform: AppPlatform;
  onClose: () => void;
  onAdd: BaseModalProps['onAdd'];
  existingApps?: BaseModalProps['existingApps'];
  editApp?: BaseModalProps['editApp'];
  onEdit?: BaseModalProps['onEdit'];
}

interface BodyRef {
  submit: () => Promise<void>;
  canSubmit: boolean;
}

const PLATFORM_CONFIG: Partial<
  Record<
    AppPlatform,
    { title: string; description: string; isEditTitle?: string; isEditDesc?: string }
  >
> = {
  web: {
    title: 'Add Website',
    description: 'Configure your website target',
    isEditTitle: 'Edit Website',
    isEditDesc: 'Update target details',
  },
  pc: { title: 'Add App', description: 'Configure your app target' },
  cli: {
    title: 'Add CLI Command',
    description: 'Configure your CLI target',
    isEditTitle: 'Edit CLI Command',
    isEditDesc: 'Update target details',
  },
  android: {
    title: 'Add Android Device',
    description: 'Chọn thiết bị Android từ danh sách scan được',
  },
};

export const AddTargetModal: React.FC<AddTargetModalProps> = ({
  isOpen,
  platform,
  onClose,
  onAdd,
  existingApps,
  editApp,
  onEdit,
}) => {
  const bodyRef = useRef<BodyRef>(null);
  const [canSubmit, setCanSubmit] = useState(false);

  const isEdit = !!editApp;
  const config = PLATFORM_CONFIG[platform] || { title: 'Add Target', description: '' };
  const title = isEdit ? config.isEditTitle || config.title : config.title;
  const description = isEdit ? config.isEditDesc || config.description : config.description;

  useEffect(() => {
    if (!isOpen) {
      setCanSubmit(false);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (bodyRef.current) {
      await bodyRef.current.submit();
      onClose();
    }
  }, [onClose]);

  const renderBody = () => {
    switch (platform) {
      case 'web':
        return (
          <Website
            ref={bodyRef}
            isOpen={isOpen}
            onAdd={onAdd}
            existingApps={existingApps}
            editApp={editApp}
            onEdit={onEdit}
            onCanSubmitChange={setCanSubmit}
          />
        );
      case 'android':
        return (
          <Android
            ref={bodyRef}
            isOpen={isOpen}
            onAdd={onAdd}
            existingApps={existingApps}
            onCanSubmitChange={setCanSubmit}
          />
        );
      case 'pc':
        return (
          <PC
            ref={bodyRef}
            isOpen={isOpen}
            onAdd={onAdd}
            existingApps={existingApps}
            onCanSubmitChange={setCanSubmit}
          />
        );
      case 'cli':
        return (
          <CLI
            ref={bodyRef}
            isOpen={isOpen}
            onAdd={onAdd}
            existingApps={existingApps}
            editApp={editApp}
            onEdit={onEdit}
            onCanSubmitChange={setCanSubmit}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className={platform === 'pc' ? 'max-w-5xl' : 'max-w-2xl'}>
      <ModalHeader title={title} description={description} onClose={onClose} />
      <ModalBody>{renderBody()}</ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
        >
          {isEdit ? 'Save Changes' : 'Add Target'}
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default AddTargetModal;