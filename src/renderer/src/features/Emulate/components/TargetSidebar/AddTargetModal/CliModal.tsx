import React, { useState, useEffect } from 'react';
import { cn } from '../../../../../shared/lib/utils';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../../components/ui/Modal';
import { BaseModalProps } from './types';

export const CliModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingApps = [],
  editApp,
  onEdit,
}) => {
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [duplicateError, setDuplicateError] = useState<{ name?: string; value?: string }>({});

  const isEdit = !!editApp;

  // Duplicate error detection
  useEffect(() => {
    const appsToCheck =
      isEdit && editApp ? existingApps.filter((app) => app.id !== editApp.id) : existingApps;
    const error: { name?: string; value?: string } = {};
    if (name && command) {
      const existingByName = appsToCheck.find(
        (app) => app.name?.toLowerCase() === name.toLowerCase(),
      );
      const existingByCommand = appsToCheck.find(
        (app) => app.executablePath?.toLowerCase() === command.toLowerCase(),
      );
      if (existingByName) error.name = `Name "${existingByName.name}" already exists`;
      if (existingByCommand)
        error.value = `Command "${existingByCommand.executablePath}" already exists`;
    }
    setDuplicateError(error);
  }, [name, command, existingApps, isEdit, editApp]);

  // Reset on open/edit
  useEffect(() => {
    if (!isOpen) return;
    if (editApp) {
      setName(editApp.name || '');
      setCommand(editApp.executablePath || '');
    } else {
      setName('');
      setCommand('');
    }
  }, [isOpen, editApp]);

  const handleSubmit = () => {
    if (isEdit && editApp && onEdit) {
      onEdit(editApp.id, { name, executablePath: command });
      onClose();
      return;
    }
    if (!name || !command) return;
    onAdd({ name, executablePath: command, mode: 'intercept', platform: 'cli' });
    onClose();
  };

  const canSubmit = !!(name && command) && !duplicateError.name && !duplicateError.value;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <ModalHeader
        title={isEdit ? 'Edit CLI Command' : 'Add CLI Command'}
        description={isEdit ? 'Update target details' : 'Configure your CLI target'}
        onClose={onClose}
      />
      <ModalBody>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Node API"
              className={cn(
                'w-full bg-input-background border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary',
                duplicateError.name ? 'border-error' : 'border-border',
              )}
            />
            {duplicateError.name && (
              <p className="text-xs text-error mt-1.5">{duplicateError.name}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5">
              Command
            </label>
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g. node server.js --port 3000"
              rows={3}
              className={cn(
                'w-full bg-input-background border rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary outline-none focus:border-primary resize-none',
                duplicateError.value ? 'border-error' : 'border-border',
              )}
            />
            {duplicateError.value && (
              <p className="text-xs text-error mt-1.5">{duplicateError.value}</p>
            )}
            <p className="text-[10px] text-text-secondary mt-1.5 italic">
              The command will be proxied through the MITM proxy for traffic inspection.
            </p>
          </div>
        </div>
      </ModalBody>
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

export default CliModal;