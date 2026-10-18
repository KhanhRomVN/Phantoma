import { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  GitBranch,
  Clock,
  Trash2,
  FolderOpen,
  CheckCircle2,
  ShieldCheck,
  CornerDownLeft,
} from 'lucide-react';
import { getCloneHistory, removeCloneEntry, type CloneEntry } from '../../../utils/cloneHistory';
import { shortenPath } from './ProjectDetailPanel';

export const GIT_URL_REGEX = /^(https?:\/\/|git@)\S+/i;

export const deriveFolderName = (url: string): string =>
  url.trim().match(/[/:]([^/:]+?)(?:\.git)?\/?$/)?.[1] ?? '';

const inputClass =
  'w-full h-10 rounded-lg bg-sidebar-item-hover border border-border px-3 text-sm font-mono text-text-primary outline-none placeholder:text-text-secondary/40 focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all';

interface NewRepositoryFormProps {
  url: string;
  folderName: string;
  dest: string;
  onUrlChange: (value: string) => void;
  onFolderNameChange: (value: string) => void;
  onDestChange: (value: string) => void;
  onBrowseDest: () => void;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-text-secondary">{label}</label>
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
}: NewRepositoryFormProps) {
  const trimmedUrl = url.trim();
  const isValidUrl = GIT_URL_REGEX.test(trimmedUrl);
  const showUrlError = trimmedUrl.length > 0 && !isValidUrl;
  const folderInvalid = /[\\/]/.test(folderName);
  const finalPath = `${dest.trim().replace(/\/+$/, '')}/${folderName.trim()}`;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
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
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/50 pointer-events-none" />
          <input
            type="text"
            autoFocus
            spellCheck={false}
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://github.com/owner/repo.git"
            className={`${inputClass} pl-9 ${showUrlError ? 'border-error/50 focus:border-error/60 focus:ring-error/15' : ''}`}
          />
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Folder name"
          hint={folderInvalid ? <span className="text-[10px] text-error">No slashes allowed</span> : null}
        >
          <input
            type="text"
            spellCheck={false}
            value={folderName}
            onChange={(e) => onFolderNameChange(e.target.value)}
            placeholder="repo"
            className={inputClass}
          />
        </Field>

        <Field label="Clone into">
          <div className="flex gap-2">
            <input
              type="text"
              spellCheck={false}
              value={dest}
              onChange={(e) => onDestChange(e.target.value)}
              className={`${inputClass} text-text-secondary`}
            />
            <button
              type="button"
              onClick={onBrowseDest}
              title="Choose destination folder"
              className="h-10 w-10 shrink-0 rounded-lg border border-border bg-sidebar-item-hover text-text-secondary hover:text-text-primary hover:bg-sidebar-item-active grid place-items-center transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
        </Field>
      </div>

      <div
        className={`rounded-lg border px-3.5 py-3 transition-all ${
          isValidUrl && folderName.trim() && !folderInvalid
            ? 'border-primary/25 bg-primary/[0.05]'
            : 'border-dashed border-border bg-white/[0.01]'
        }`}
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary/60 mb-1.5">
          Destination preview
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-text-primary/90 break-all">
          <GitBranch className="w-3.5 h-3.5 shrink-0 text-text-secondary" />
          {isValidUrl && folderName.trim() ? finalPath : 'Paste a repository URL to continue'}
        </div>
      </div>

      <div className="flex items-center gap-4 text-[11px] text-text-secondary/60">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
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

const DATE_GROUP_ORDER = ['Today', 'Yesterday', 'Last Week', 'Last Month', 'Last Year', 'Earlier'];

const getDateGroup = (timestamp: number): string => {
  const diffDays = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'Last Week';
  if (diffDays < 30) return 'Last Month';
  if (diffDays < 365) return 'Last Year';
  return 'Earlier';
};

interface RecentClonesProps {
  onReuse: (entry: CloneEntry) => void;
}

export function RecentClones({ onReuse }: RecentClonesProps) {
  const [history, setHistory] = useState<CloneEntry[]>([]);

  useEffect(() => {
    setHistory(getCloneHistory());
  }, []);

  const groups = useMemo(() => {
    const map: Record<string, CloneEntry[]> = {};
    history.forEach((entry) => {
      const label = getDateGroup(entry.timestamp);
      if (!map[label]) map[label] = [];
      map[label].push(entry);
    });
    return Object.entries(map)
      .sort((a, b) => DATE_GROUP_ORDER.indexOf(a[0]) - DATE_GROUP_ORDER.indexOf(b[0]))
      .map(([label, items]) => ({ label, items }));
  }, [history]);

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeCloneEntry(id);
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="flex flex-col p-5">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary/60 mb-4">
        <Clock className="w-3 h-3" />
        Recent clones
        {history.length > 0 && <span className="font-mono text-text-secondary/40">{history.length}</span>}
      </div>

      {groups.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl border border-dashed border-border grid place-items-center text-text-secondary/40">
            <GitBranch className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <p className="text-xs text-text-secondary/60 leading-relaxed max-w-[200px]">
            Repositories you clone will show up here for quick reuse.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <h5 className="text-[10px] font-mono uppercase tracking-widest text-text-secondary/40 mb-1.5 pl-1">
                {group.label}
              </h5>
              <div className="space-y-1">
                {group.items.map((repo) => (
                  <div
                    key={repo.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onReuse(repo)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onReuse(repo);
                      }
                    }}
                    title="Click to reuse this URL"
                    className="group flex items-center gap-3 p-2 rounded-lg cursor-pointer border border-transparent hover:bg-white/[0.04] hover:border-border focus:outline-none focus-visible:border-primary/40 transition-all"
                  >
                    <div className="w-8 h-8 rounded-md grid place-items-center shrink-0 bg-white/[0.05] border border-border text-text-secondary">
                      <GitBranch className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium text-xs text-text-primary truncate">{repo.name}</div>
                      <small className="block text-[10px] font-mono text-text-secondary/50 truncate">
                        {shortenPath(repo.dest)}
                      </small>
                    </div>
                    <button
                      onClick={(e) => handleRemove(e, repo.id)}
                      title="Remove from history"
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-6 h-6 rounded grid place-items-center text-text-secondary/50 hover:text-error hover:bg-error/10 transition-all shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}