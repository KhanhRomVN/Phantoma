import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Folder, Plus, Trash2 } from 'lucide-react';

import { logger } from '@renderer/utils/logger';

// ── Types ──
import type { BaseModalProps } from './index';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

type CLIBodyProps = Pick<
  BaseModalProps,
  'isOpen' | 'onAdd' | 'existingApps' | 'editApp' | 'onEdit' | 'onCanSubmitChange'
>;

interface EnvVar {
  key: string;
  value: string;
}

export interface CLIRef {
  submit: () => Promise<void>;
  canSubmit: boolean;
}

export const CLI = forwardRef<CLIRef, CLIBodyProps>(function CLI(
  { isOpen, onAdd, existingApps = [], editApp, onEdit, onCanSubmitChange },
  ref,
) {
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [workingDir, setWorkingDir] = useState('');
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
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
    setWorkingDir('');
    setEnvVars([]);
  }, [isOpen, editApp]);

  const handleSelectFolder = async () => {
    try {
      const result = await window.api.invoke('selectFolder');
      if (result?.folderPath) {
        setWorkingDir(result.folderPath);
      }
    } catch (error) {
      logger.error('[CLI] Select folder failed:', error);
    }
  };

  const addEnvVar = () => {
    setEnvVars((prev) => [...prev, { key: '', value: '' }]);
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    setEnvVars((prev) =>
      prev.map((env, i) => (i === index ? { ...env, [field]: value } : env)),
    );
  };

  const removeEnvVar = (index: number) => {
    setEnvVars((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (isEdit && editApp && onEdit) {
      onEdit(editApp.id, { name, executablePath: command });
      return;
    }
    if (!name || !command) return;
    try {
      await onAdd({ name, executablePath: command, mode: 'intercept', platform: 'cli' });
    } catch (error) {
      logger.error('[CLI] Add target failed:', error);
    }
  };

  const canSubmit = !!(name && command) && !duplicateError.name && !duplicateError.value;

  useImperativeHandle(ref, () => ({ submit: handleSubmit, canSubmit }), [handleSubmit, canSubmit]);

  useEffect(() => {
    onCanSubmitChange?.(canSubmit);
  }, [canSubmit, onCanSubmitChange]);

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

      {/* Working Directory */}
      <div>
        <label className="block text-xs font-bold text-text-secondary mb-1.5">
          Working Directory
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={workingDir}
            onChange={(e) => setWorkingDir(e.target.value)}
            placeholder="/path/to/project"
            className="flex-1 bg-input-background border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={handleSelectFolder}
            title="Choose folder"
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg border border-border bg-input-background text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors"
          >
            <Folder className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Environment Variables */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold text-text-secondary">
            Environment Variables
          </label>
          <button
            type="button"
            onClick={addEnvVar}
            className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
        {envVars.length === 0 ? (
          <p className="text-xs text-text-secondary/60 italic">No environment variables</p>
        ) : (
          <div className="space-y-2">
            {envVars.map((env, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={env.key}
                  onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                  placeholder="KEY"
                  className="flex-1 bg-input-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={env.value}
                  onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                  placeholder="VALUE"
                  className="flex-1 bg-input-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => removeEnvVar(index)}
                  title="Remove"
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default CLI;