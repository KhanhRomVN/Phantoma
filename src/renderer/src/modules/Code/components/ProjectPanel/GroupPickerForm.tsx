/**
 * ------------------------------------------------------------------
 * Group Picker Form (Modal)
 * ------------------------------------------------------------------
 * Dialog to create or edit a Project Group.
 * - Live preview of the group header.
 * - Icon grid: pick from Lucide icons.
 * - Name input: limited length, Enter to save, Esc to cancel.
 * ------------------------------------------------------------------
 */

import { useState, memo } from 'react';
import {
  Folder,
  FolderOpen,
  FolderGit2,
  Package,
  Layers,
  Box,
  Archive,
  Briefcase,
  HardDrive,
  Server,
  Cloud,
  Database,
  Terminal,
  Code,
  GitBranch,
} from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';

// ─── Available Icons for Groups ──────────────────────────────────────
export const GROUP_ICONS = [
  { id: 'folder', icon: <Folder className="w-4 h-4" />, label: 'Folder' },
  { id: 'folder-open', icon: <FolderOpen className="w-4 h-4" />, label: 'Folder Open' },
  { id: 'git', icon: <FolderGit2 className="w-4 h-4" />, label: 'Git Repo' },
  { id: 'package', icon: <Package className="w-4 h-4" />, label: 'Package' },
  { id: 'layers', icon: <Layers className="w-4 h-4" />, label: 'Layers' },
  { id: 'box', icon: <Box className="w-4 h-4" />, label: 'Box' },
  { id: 'archive', icon: <Archive className="w-4 h-4" />, label: 'Archive' },
  { id: 'briefcase', icon: <Briefcase className="w-4 h-4" />, label: 'Work' },
  { id: 'drive', icon: <HardDrive className="w-4 h-4" />, label: 'Drive' },
  { id: 'server', icon: <Server className="w-4 h-4" />, label: 'Server' },
  { id: 'cloud', icon: <Cloud className="w-4 h-4" />, label: 'Cloud' },
  { id: 'database', icon: <Database className="w-4 h-4" />, label: 'DB' },
  { id: 'terminal', icon: <Terminal className="w-4 h-4" />, label: 'CLI' },
  { id: 'code', icon: <Code className="w-4 h-4" />, label: 'Code' },
  { id: 'branch', icon: <GitBranch className="w-4 h-4" />, label: 'Branch' },
];

const MAX_NAME_LENGTH = 30;

interface GroupPickerFormProps {
  initialIconId?: string;
  initialName?: string;
  onSave: (iconId: string, name: string) => void;
  onCancel: () => void;
  /** If true, this is an existing group being edited, not a new one */
  isEditing?: boolean;
  /** Legacy inline-form props, no longer used by the modal */
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

export const GroupPickerForm = memo(function GroupPickerForm({
  initialIconId = 'folder',
  initialName = '',
  onSave,
  onCancel,
  isEditing = false,
}: GroupPickerFormProps) {
  const [name, setName] = useState(initialName);
  const [selectedIconId, setSelectedIconId] = useState(initialIconId);

  const trimmed = name.trim();
  const currentIcon = GROUP_ICONS.find((g) => g.id === selectedIconId) || GROUP_ICONS[0];

  const handleSubmit = () => {
    if (!trimmed) return;
    onSave(selectedIconId, trimmed.slice(0, MAX_NAME_LENGTH));
  };

  return (
    <Modal isOpen onClose={onCancel} className="max-w-[400px]">
      <ModalHeader
        title={isEditing ? 'Edit group' : 'New group'}
        description="Organize related projects together"
        onClose={onCancel}
      />

      <ModalBody className="flex flex-col gap-4 py-4">
        {/* Live preview */}
        <div className="flex items-center gap-2.5 px-3 h-11 rounded-lg border border-divider bg-card-background">
          <span className="w-7 h-7 rounded-md grid place-items-center shrink-0 bg-[rgba(255,71,87,0.12)] text-[#ff4757]">
            {currentIcon.icon}
          </span>
          <span
            className={cn(
              'font-display font-semibold text-[12.5px] truncate',
              trimmed ? 'text-text-primary' : 'text-text-secondary/50',
            )}
          >
            {trimmed || 'Group name'}
          </span>
        </div>

        {/* Name */}
        <Input
          label="Name"
          autoFocus
          value={name}
          maxLength={MAX_NAME_LENGTH}
          placeholder="e.g. Backend services"
          hint={`${name.length}/${MAX_NAME_LENGTH}`}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        {/* Icon grid */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-primary">Icon</span>
          <div className="grid grid-cols-5 gap-1.5">
            {GROUP_ICONS.map((g) => {
              const active = g.id === selectedIconId;
              return (
                <button
                  key={g.id}
                  type="button"
                  title={g.label}
                  onClick={() => setSelectedIconId(g.id)}
                  className={cn(
                    'h-10 rounded-lg border flex items-center justify-center cursor-pointer transition-colors',
                    active
                      ? 'border-[#ff6a1f]/60 bg-[rgba(255,106,31,0.1)] text-[#ff6a1f]'
                      : 'border-divider bg-card-background text-text-secondary hover:bg-card-hover hover:text-text-primary',
                  )}
                >
                  {g.icon}
                </button>
              );
            })}
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="solid" disabled={!trimmed} onClick={handleSubmit}>
          {isEditing ? 'Save' : 'Create group'}
        </Button>
      </ModalFooter>
    </Modal>
  );
});

export default GroupPickerForm;