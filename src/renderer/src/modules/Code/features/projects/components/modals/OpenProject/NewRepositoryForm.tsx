// ─── Imports ─────────────────────────────────────────────────────────────────
// ── UI ──
import { FolderOpen, Globe, CheckCircle2, ShieldCheck, CornerDownLeft } from 'lucide-react';

// ── Utils ──
import { GIT_URL_REGEX } from '../../../utils/open-project.util';

// ─── Constants ───────────────────────────────────────────────────────────────
export const inputClass =
  'w-full h-9 rounded-lg bg-input-background border border-transparent px-3 text-sm font-mono text-text-primary outline-none focus:outline-none focus:ring-0 focus:border-primary/40 placeholder:text-text-secondary transition-colors';

// ─── Interfaces ──────────────────────────────────────────────────────────────
export interface NewRepositoryFormProps {
  url: string;
  folderName: string;
  dest: string;
  onUrlChange: (value: string) => void;
  onFolderNameChange: (value: string) => void;
  onDestChange: (value: string) => void;
  onBrowseDest: () => void;
  folderConflict?: 'exists' | 'added' | null;
  suggestedName?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-text-secondary">
          {label}
          {required && <span className="ml-0.5 text-error">*</span>}
        </label>
        {hint}
      </div>
      {children}
    </div>
  );
}

export function NewRepositoryForm({
  url,
  folderName,
  dest,
  onUrlChange,
  onFolderNameChange,
  onDestChange,
  onBrowseDest,
  folderConflict,
  suggestedName,
}: NewRepositoryFormProps) {
  // ── Derived ──
  const trimmedUrl = url.trim();
  const isValidUrl = GIT_URL_REGEX.test(trimmedUrl);
  const showUrlError = trimmedUrl.length > 0 && !isValidUrl;
  const folderInvalid = /[\\/]/.test(folderName);

  // ── Render ──
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <Field
        label="Repository URL"
        hint={
          isValidUrl ? (
            <span className="flex items-center gap-1 text-[10px] text-success">
              <CheckCircle2 className="w-3 h-3" />
              Valid URL
            </span>
          ) : showUrlError ? (
            <span className="text-[10px] text-error">Use an https:// or git@ URL</span>
          ) : null
        }
      >
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue pointer-events-none" />
          <input
            type="text"
            autoFocus
            spellCheck={false}
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://github.com/owner/repo.git"
            className={`${inputClass} pl-9 ${showUrlError ? 'border-error/50 focus:border-error/60' : ''}`}
          />
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Folder name"
          hint={
            folderInvalid ? (
              <span className="text-[10px] text-error">No slashes allowed</span>
            ) : folderConflict ? (
              <span className="flex items-center gap-1.5 text-[10px] text-error">
                {folderConflict === 'exists' ? 'Already exists in destination' : 'Already added as a project'}
                {suggestedName && (
                  <button
                    type="button"
                    onClick={() => onFolderNameChange(suggestedName)}
                    className="underline text-text-secondary hover:text-text-primary"
                  >
                    Use {suggestedName}
                  </button>
                )}
              </span>
            ) : null
          }
        >
          <input
            type="text"
            spellCheck={false}
            value={folderName}
            onChange={(e) => onFolderNameChange(e.target.value)}
            placeholder="repo"
            className={`${inputClass} ${folderConflict ? 'border-error/50' : ''}`}
          />
        </Field>

        <Field label="Clone into" required>
          <div className="flex gap-2">
            <input
              type="text"
              spellCheck={false}
              value={dest}
              placeholder="Choose a destination folder"
              onChange={(e) => onDestChange(e.target.value)}
              className={`${inputClass} text-text-secondary`}
            />
            <button
              type="button"
              onClick={onBrowseDest}
              title="Choose destination folder"
              className="h-9 w-9 shrink-0 rounded-lg bg-teal/10 text-teal hover:bg-teal/20 active:bg-teal/30 grid place-items-center transition-colors outline-none focus:outline-none"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
        </Field>
      </div>

      <div className="flex items-center gap-4 text-[11px] text-text-secondary">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-green" />
          HTTPS and SSH supported, credentials use your system keychain
        </span>
        <span className="flex items-center gap-1.5 ml-auto shrink-0">
          <CornerDownLeft className="w-3 h-3" />
          Enter to clone
        </span>
      </div>
    </div>
  );
}
