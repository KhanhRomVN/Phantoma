/**
 * ------------------------------------------------------------------
 * AddTargetModal - CLI
 * ------------------------------------------------------------------
 * Form thêm target CLI — cấu hình name, URL (để lấy favicon), command,
 * working directory và environment variables. Hỗ trợ edit mode.
 *
 * Các chức năng chính:
 * - Nhập name, URL (tùy chọn) và tự động fetch favicon
 * - Nhập command và working directory
 * - Thêm/xóa environment variables
 * - Kiểm tra trùng lặp name/command
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

// ── UI ──
import { Bug, Folder, Plus, Trash2 } from 'lucide-react';

// ── Types ──
import type { BaseModalProps } from './index';

// ── Utils ──

import { cn } from '@renderer/shared/utils/cn';

// ─── Types ──────────────────────────────────────────────────────────────
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

// ─── Helpers ────────────────────────────────────────────────────────────
/** Thêm https:// nếu URL người dùng nhập chưa có protocol. */
const withProtocol = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

// ─── Component ──────────────────────────────────────────────────────────
export const CLI = forwardRef<CLIRef, CLIBodyProps>(function CLI(
  { isOpen, onAdd, existingApps = [], editApp, onEdit, onCanSubmitChange },
  ref,
) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [command, setCommand] = useState('');
  const [workingDir, setWorkingDir] = useState('');
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [duplicateError, setDuplicateError] = useState<{ name?: string; value?: string }>({});
  const [faviconStatus, setFaviconStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);

  const isEdit = !!editApp;

  const isUrlInvalid = (() => {
    if (!url.trim()) return false;
    try {
      new URL(withProtocol(url));
      return false;
    } catch {
      return true;
    }
  })();

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

  // Fetch favicon when URL changes
  useEffect(() => {
    if (!url.trim()) {
      setFaviconStatus('idle');
      setFaviconUrl(null);
      return;
    }

    let isMounted = true;
    setFaviconStatus('loading');

    const checkImage = (src: string): Promise<boolean> =>
      new Promise((resolve) => {
        const testImg = new Image();
        testImg.onload = () => resolve(true);
        testImg.onerror = () => resolve(false);
        testImg.src = src;
      });

    const fetchFavicon = async () => {
      try {
        const hostname = new URL(withProtocol(url)).hostname;
        const candidates = [
          `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
          `https://${hostname}/favicon.ico`,
          `https://${hostname}/favicon.png`,
        ];
        for (const src of candidates) {
          const loaded = await checkImage(src);
          if (!isMounted) return;
          if (loaded) {
            setFaviconUrl(src);
            setFaviconStatus('success');
            return;
          }
        }
        if (isMounted) setFaviconStatus('error');
      } catch {
        if (isMounted) setFaviconStatus('error');
      }
    };

    // Debounce để tránh fetch ở mỗi lần gõ phím
    const timer = setTimeout(fetchFavicon, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [url]);

  // Reset on open/edit
  useEffect(() => {
    if (!isOpen) return;
    if (editApp) {
      setName(editApp.name || '');
      setUrl(editApp.url || '');
      setCommand(editApp.executablePath || '');
    } else {
      setName('');
      setUrl('');
      setCommand('');
    }
    setWorkingDir('');
    setEnvVars([]);
    setFaviconStatus('idle');
    setFaviconUrl(null);
  }, [isOpen, editApp]);

  const handleSelectFolder = async () => {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('dialog:show-save', {
        title: 'Select Working Directory',
        properties: ['openDirectory'],
      });
      if (result?.success && result?.filePath) {
        setWorkingDir(result.filePath);
      }
    } catch (error) {
      console.error('[CLI] Select folder failed:', error);
    }
  };

  const addEnvVar = () => {
    setEnvVars((prev) => [...prev, { key: '', value: '' }]);
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    setEnvVars((prev) => prev.map((env, i) => (i === index ? { ...env, [field]: value } : env)));
  };

  const removeEnvVar = (index: number) => {
    setEnvVars((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const normalizedUrl = withProtocol(url);
    if (isEdit && editApp && onEdit) {
      // url rỗng ('') để cho phép xóa URL đã lưu (toUpdateDTO bỏ qua undefined)
      onEdit(editApp.id, { name, executablePath: command, url: normalizedUrl });
      return;
    }
    if (!name || !command) return;
    try {
      await onAdd({
        name,
        executablePath: command,
        url: normalizedUrl || undefined,
        mode: 'intercept',
        platform: 'cli',
      });
    } catch (error) {
      console.error('[CLI] Add target failed:', error);
    }
  };

  const canSubmit =
    !!(name && command) && !duplicateError.name && !duplicateError.value && !isUrlInvalid;

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

      {/* URL (optional) — dùng để lấy favicon hiển thị trên TargetCard */}
      <div>
        <label className="block text-xs font-bold text-text-secondary mb-1.5">
          URL <span className="font-normal text-text-secondary/60">(optional)</span>
        </label>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-9 h-9 shrink-0 rounded-lg flex items-center justify-center border-2 transition-all bg-input-background',
              faviconStatus === 'idle' && 'border-border',
              faviconStatus === 'loading' && 'border-border animate-pulse',
              faviconStatus === 'success' && 'border-success',
              faviconStatus === 'error' && 'border-error',
            )}
          >
            {faviconStatus === 'loading' && (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
            {faviconStatus === 'success' && faviconUrl && (
              <img
                src={faviconUrl}
                alt="Favicon"
                className="w-6 h-6 object-contain"
                onError={() => setFaviconStatus('error')}
              />
            )}
            {faviconStatus === 'error' && <Bug className="w-5 h-5 text-error" />}
            {faviconStatus === 'idle' && <div className="w-6 h-6 rounded bg-border/30" />}
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className={cn(
              'flex-1 bg-input-background border rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary outline-none focus:border-primary',
              isUrlInvalid ? 'border-error' : 'border-border',
            )}
          />
        </div>
        {isUrlInvalid && <p className="text-xs text-error mt-1.5">Invalid URL</p>}
        <p className="text-[10px] text-text-secondary mt-1.5 italic">
          Used to display the favicon for this CLI target.
        </p>
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