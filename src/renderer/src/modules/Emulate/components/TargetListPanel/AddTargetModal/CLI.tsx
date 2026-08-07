import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

// Types
import type { BaseModalProps } from './index';

// Utils
import { cn } from '@renderer/shared/utils/cn';

type CLIBodyProps = Pick<
  BaseModalProps,
  'isOpen' | 'onAdd' | 'existingApps' | 'editApp' | 'onEdit'
>;

export interface CLIRef {
  submit: () => Promise<void>;
  canSubmit: boolean;
}

export const CLI = forwardRef<CLIRef, CLIBodyProps>(function CLI(
  { isOpen, onAdd, existingApps = [], editApp, onEdit },
  ref,
) {
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
        (app) => app.name?.toLowerCase() === name?.toLowerCase(),
      );
      const existingByCommand = appsToCheck.find(
        (app) => app.executablePath?.toLowerCase() === command?.toLowerCase(),
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

  const handleSubmit = async () => {
    if (isEdit && editApp && onEdit) {
      onEdit(editApp.id, { name, executablePath: command });
      return;
    }
    if (!name || !command) return;
    try {
      await onAdd({ name, executablePath: command, mode: 'intercept', platform: 'cli' });
    } catch (error) {
      console.error('[CLI] Add target failed:', error);
    }
  };

  const canSubmit = !!(name && command) && !duplicateError.name && !duplicateError.value;

  useImperativeHandle(ref, () => ({ submit: handleSubmit, canSubmit }), [handleSubmit, canSubmit]);

  return (
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
        {duplicateError.name && <p className="text-xs text-error mt-1.5">{duplicateError.name}</p>}
      </div>
      <div>
        <label className="block text-xs font-bold text-text-secondary mb-1.5">Command</label>
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
  );
});

export default CLI;
