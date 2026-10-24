import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import {
  FolderOpen,
  FileText,
  GitBranch,
  Copy,
  Check,
  Link2,
  HardDrive,
  User,
  Globe,
  Clock,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  CornerDownLeft,
  Loader2,
  Search,
  X,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { Favicon, getFaviconUrl } from '@renderer/shared/utils/faviconUtils';
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';
import { detectProjectStack, type StackInfo } from '@renderer/utils/detectStack';
import { Modal } from '@renderer/components/ui/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { useCodeStore } from '../../hooks/useCodeStore';
import {
  addCloneEntry,
  getCloneHistory,
  removeCloneEntry,
  type CloneEntry,
} from '../../utils/cloneHistory';

interface ProjectDetailPanelProps {
  target: { name: string; path: string } | null;
  stackInfo?: StackInfo;
}

const TECH_DOMAIN_MAP: Record<string, string> = {
  typescript: 'https://www.typescriptlang.org',
  javascript: 'https://developer.mozilla.org/docs/Web/JavaScript',
  python: 'https://www.python.org',
  go: 'https://go.dev',
  rust: 'https://www.rust-lang.org',
  react: 'https://react.dev',
  vue: 'https://vuejs.org',
  angular: 'https://angular.dev',
  svelte: 'https://svelte.dev',
  nextjs: 'https://nextjs.org',
  nuxt: 'https://nuxt.com',
  vite: 'https://vite.dev',
  express: 'https://expressjs.com',
  nestjs: 'https://nestjs.com',
  django: 'https://www.djangoproject.com',
  flask: 'https://flask.palletsprojects.com',
  fastapi: 'https://fastapi.tiangolo.com',
  springboot: 'https://spring.io/projects/spring-boot',
  laravel: 'https://laravel.com',
  rails: 'https://rubyonrails.org',
  flutter: 'https://flutter.dev',
  electron: 'https://www.electronjs.org',
  docker: 'https://www.docker.com',
  github: 'https://github.com',
};

const LANG_COLORS = ['#4fa8e0', '#e0a84f', '#6fcf97', '#bb6bd9', '#eb5757', '#56ccf2'];

export const shortenPath = (path: string): string => {
  if (!path) return '';
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 3) return path;
  const start = parts[0] === 'home' || parts[0] === 'Users' ? '~/' : '';
  return `${start}.../${parts.slice(-2).join('/')}`;
};

const formatBytes = (bytes?: number): string => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const timeAgo = (timestamp?: number): string => {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${Math.max(seconds, 0)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const formatRepoUrl = (url: string): string =>
  url
    .replace(/^https?:\/\//, '')
    .replace(/^git@/, '')
    .replace(/\.git$/, '')
    .replace(/^[^:/]+[:/]/, '');

const getTechIconUrl = (id: string): string => {
  const domain = TECH_DOMAIN_MAP[id.toLowerCase()];
  return domain ? getFaviconUrl(domain) : '';
};

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h4 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary/60 mb-2.5 text-left">
      {children}
    </h4>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6 pt-5">
      <div className="rounded-lg border border-border/60 divide-y divide-border/40">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <div className="h-3 w-3 rounded bg-white/[0.06]" />
            <div className="h-3 w-16 rounded bg-white/[0.06]" />
            <div className="h-3 flex-1 rounded bg-white/[0.06]" />
          </div>
        ))}
      </div>
      <div>
        <div className="h-3 w-20 rounded bg-white/[0.06] mb-3" />
        <div className="h-1.5 w-full rounded-full bg-white/[0.06] mb-3" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-5 w-20 rounded-md bg-white/[0.06]" />
          ))}
        </div>
      </div>
      <div>
        <div className="h-3 w-24 rounded bg-white/[0.06] mb-3" />
        <div className="flex gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-7 w-24 rounded-md bg-white/[0.06]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProjectDetailPanel({ target, stackInfo }: ProjectDetailPanelProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCopied(false);
  }, [target?.path]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  if (!target) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="w-12 h-12 rounded-xl border border-dashed border-border grid place-items-center text-text-secondary/40">
          <FileText className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary/80">No project selected</p>
          <p className="text-xs text-text-secondary/60 mt-1 leading-relaxed max-w-[220px]">
            Pick a project on the left to preview its stack, contributors and branches.
          </p>
        </div>
      </div>
    );
  }

  const { name, path } = target;

  const headerIconUrl = stackInfo?.primaryLanguage
    ? getTechIconUrl(stackInfo.primaryLanguage)
    : stackInfo?.frameworks?.[0]
      ? getTechIconUrl(stackInfo.frameworks[0])
      : '';

  const handleCopyPath = () => {
    navigator.clipboard
      .writeText(path)
      .then(() => {
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => console.error('Failed to copy path:', err));
  };

  const overviewRows: {
    icon: ReactNode;
    label: string;
    value: string;
    title?: string;
    mono?: boolean;
  }[] = [];
  if (stackInfo?.repoUrl) {
    overviewRows.push({
      icon: <Link2 className="w-3.5 h-3.5" />,
      label: 'Repository',
      value: formatRepoUrl(stackInfo.repoUrl),
      title: stackInfo.repoUrl,
      mono: true,
    });
  }
  if (stackInfo?.author) {
    overviewRows.push({
      icon: <User className="w-3.5 h-3.5" />,
      label: 'Author',
      value: stackInfo.author,
    });
  }
  if (stackInfo?.sizeBytes) {
    overviewRows.push({
      icon: <HardDrive className="w-3.5 h-3.5" />,
      label: 'Size',
      value: formatBytes(stackInfo.sizeBytes),
    });
  }

  const languages = stackInfo?.languages ?? [];
  const frameworks = stackInfo?.frameworks ?? [];
  const contributors = stackInfo?.contributors ?? [];
  const branches = stackInfo?.branches ?? [];
  const hasDetails =
    overviewRows.length > 0 ||
    languages.length > 0 ||
    frameworks.length > 0 ||
    contributors.length > 0 ||
    branches.length > 0;

  return (
    <div className="flex flex-col p-5 select-text">
      <div className="flex items-start gap-3 pb-5 border-b border-border/60">
        <div className="w-11 h-11 rounded-xl grid place-items-center shrink-0 bg-white/[0.05] border border-border overflow-hidden">
          {headerIconUrl ? (
            <Favicon url={headerIconUrl} size={24} alt="" className="object-contain" />
          ) : (
            <FolderOpen className="w-5 h-5 text-text-secondary" />
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <h3 className="text-base font-semibold text-text-primary truncate">{name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p
              className="text-[11px] font-mono text-text-secondary/60 truncate flex-1"
              title={path}
            >
              {shortenPath(path)}
            </p>
            <button
              onClick={handleCopyPath}
              className="p-1 rounded-md text-text-secondary/60 hover:text-text-primary hover:bg-white/[0.06] transition-colors shrink-0"
              title="Copy full path"
            >
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {!stackInfo ? (
        <DetailSkeleton />
      ) : !hasDetails ? (
        <p className="text-xs text-text-secondary/60 pt-5 leading-relaxed">
          No stack information detected for this folder.
        </p>
      ) : (
        <div className="space-y-6 pt-5">
          {overviewRows.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-white/[0.02] divide-y divide-border/40">
              {overviewRows.map((row) => (
                <div key={row.label} className="flex items-center gap-3 px-3 py-2.5 text-xs">
                  <span className="text-text-secondary/60 shrink-0">{row.icon}</span>
                  <span className="text-text-secondary/70 shrink-0">{row.label}</span>
                  <span
                    className={`flex-1 min-w-0 truncate text-right text-text-primary ${row.mono ? 'font-mono' : ''}`}
                    title={row.title}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {languages.length > 0 && (
            <div>
              <SectionTitle>Languages</SectionTitle>
              <div className="flex h-1.5 rounded-full overflow-hidden bg-white/[0.05] gap-px">
                {languages.map((lang, idx) => (
                  <div
                    key={lang.id}
                    style={{
                      width: `${lang.percentage}%`,
                      backgroundColor: LANG_COLORS[idx % LANG_COLORS.length],
                    }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                {languages.map((lang, idx) => (
                  <div key={lang.id} className="flex items-center gap-1.5 text-[11px]">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: LANG_COLORS[idx % LANG_COLORS.length] }}
                    />
                    <span className="text-text-primary">{lang.name}</span>
                    <span className="text-text-secondary/60 font-mono">{lang.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {frameworks.length > 0 && (
            <div>
              <SectionTitle>Frameworks</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {frameworks.map((fwk) => {
                  const iconUrl = getTechIconUrl(fwk);
                  return (
                    <div
                      key={fwk}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/[0.06] border border-primary/20"
                    >
                      {iconUrl ? (
                        <Favicon url={iconUrl} size={14} alt="" className="object-contain" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-primary" />
                      )}
                      <span className="text-[11px] text-primary font-medium capitalize">{fwk}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {contributors.length > 0 && (
            <div>
              <SectionTitle>Contributors</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {contributors.slice(0, 5).map((c) => (
                  <div
                    key={c.username}
                    className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-white/[0.03] border border-border/60"
                  >
                    <img
                      src={`https://avatars.githubusercontent.com/${c.username}?s=20`}
                      alt={c.username}
                      className="w-4 h-4 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getTechIconUrl('github');
                      }}
                    />
                    <span className="text-[11px] text-text-primary font-medium">{c.username}</span>
                  </div>
                ))}
                {contributors.length > 5 && (
                  <span className="self-center text-[10px] text-text-secondary/60">
                    +{contributors.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {branches.length > 0 && (
            <div>
              <SectionTitle>Branches</SectionTitle>
              <div className="space-y-1.5">
                {branches.slice(0, 6).map((br) => (
                  <div
                    key={br.name}
                    className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-border/40 hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GitBranch className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                      <span className="text-xs text-text-primary font-mono truncate">
                        {br.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-[10px] text-text-secondary/60 font-mono">
                      {br.lastCommitDate ? <span>{timeAgo(br.lastCommitDate)}</span> : null}
                      {br.commitCount !== undefined && <span>{br.commitCount} commits</span>}
                    </div>
                  </div>
                ))}
                {branches.length > 6 && (
                  <p className="text-[10px] text-text-secondary/50 pl-1">
                    +{branches.length - 6} more branches
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
const DEFAULT_CLONE_DEST = '/home/khanhromvn/projects';

const LANG_EXT: Record<string, string> = {
  typescript: 'ts',
  javascript: 'js',
  python: 'py',
  go: 'go',
  rust: 'rs',
  java: 'java',
  kotlin: 'kt',
  swift: 'swift',
  ruby: 'rb',
  php: 'php',
  csharp: 'cs',
  'c#': 'cs',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  html: 'html',
  css: 'css',
  scss: 'scss',
  vue: 'vue',
  svelte: 'svelte',
  dart: 'dart',
  lua: 'lua',
  shell: 'sh',
  json: 'json',
  markdown: 'md',
};

function LanguageBadgeIcon({ stack }: { stack?: StackInfo }) {
  const top = stack?.languages?.length
    ? stack.languages.reduce((a, b) => (b.percentage > a.percentage ? b : a))
    : undefined;
  const key = (top?.id ?? stack?.primaryLanguage ?? '').toLowerCase();
  if (!key) return <FolderOpen className="w-4 h-4" />;
  return (
    <img
      src={getFileIconPath(`file.${LANG_EXT[key] ?? key}`)}
      alt=""
      className="w-4 h-4 object-contain"
      draggable={false}
    />
  );
}

type Mode = 'local' | 'clone';
type Selection = { type: 'folder' } | { type: 'project'; id: string } | null;

interface OpenProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectAdded?: (projectId: string) => void;
}

export function OpenProjectModal({ isOpen, onClose, onProjectAdded }: OpenProjectModalProps) {
  const addProject = useCodeStore((s) => s.addProject);
  const setCurrentProject = useCodeStore((s) => s.setCurrentProject);
  const projects = useCodeStore((s) => s.projects);
  const removeProject = useCodeStore((s) => s.removeProject);
  const currentProjectId = useCodeStore((s) => s.currentProjectId);

  const [mode, setMode] = useState<Mode>('local');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [browsePath, setBrowsePath] = useState('');
  const [selection, setSelection] = useState<Selection>(null);
  const [stackCache, setStackCache] = useState<Map<string, StackInfo>>(new Map());

  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneFolderName, setCloneFolderName] = useState('');
  const [cloneDest, setCloneDest] = useState(DEFAULT_CLONE_DEST);
  const [folderNameEdited, setFolderNameEdited] = useState(false);

  const fetchingPathsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    setMode('local');
    setLoading(false);
    setError('');
    setSearchQuery('');
    setBrowsePath('');
    setSelection(null);
    setCloneUrl('');
    setCloneFolderName('');
    setCloneDest(DEFAULT_CLONE_DEST);
    setFolderNameEdited(false);
  }, [isOpen]);

  const recentProjects = useMemo(() => {
    let list = projects.filter((p) => p.id !== currentProjectId);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q),
      );
    }
    return [...list].reverse();
  }, [projects, searchQuery, currentProjectId]);

  const target = useMemo(() => {
    if (mode !== 'local' || !selection) return null;
    if (selection.type === 'folder' && browsePath) {
      return { name: browsePath.split('/').pop() || 'Untitled', path: browsePath };
    }
    if (selection.type === 'project') {
      const proj = projects.find((p) => p.id === selection.id);
      if (proj) return { name: proj.name, path: proj.path };
    }
    return null;
  }, [mode, selection, browsePath, projects]);

  useEffect(() => {
    const paths = [target?.path, browsePath, ...recentProjects.map((p) => p.path)].filter(
      (p): p is string => !!p,
    );
    paths.forEach((path) => {
      if (stackCache.has(path) || fetchingPathsRef.current.has(path)) return;

      fetchingPathsRef.current.add(path);
      detectProjectStack(path)
        .then((info) => {
          setStackCache((prev) => new Map(prev).set(path, info));
        })
        .catch((err) => {
          console.error(`[OpenProjectModal] Detection failed for "${path}":`, err);
          setStackCache((prev) =>
            new Map(prev).set(path, {
              frameworks: [],
              languages: [],
              contributors: [],
              branches: [],
            }),
          );
        })
        .finally(() => {
          fetchingPathsRef.current.delete(path);
        });
    });
  }, [target?.path, browsePath, recentProjects, stackCache]);

  const cloneUrlValid = GIT_URL_REGEX.test(cloneUrl.trim());
  const cloneFolderValid = cloneFolderName.trim().length > 0 && !/[\\/]/.test(cloneFolderName);
  const canSubmit =
    mode === 'clone'
      ? cloneUrlValid && cloneFolderValid && cloneDest.trim().length > 0
      : selection !== null && target !== null;

  const handleSearchChange = (value: string) => {
    if (GIT_URL_REGEX.test(value.trim())) {
      setMode('clone');
      setCloneUrl(value.trim());
      setCloneFolderName(deriveFolderName(value));
      setFolderNameEdited(false);
      setSearchQuery('');
      return;
    }
    setSearchQuery(value);
  };

  const handleCloneUrlChange = (value: string) => {
    setCloneUrl(value);
    if (!folderNameEdited) setCloneFolderName(deriveFolderName(value));
  };

  const handleCloneFolderChange = (value: string) => {
    setCloneFolderName(value);
    setFolderNameEdited(true);
  };

  const pickDirectory = async (_title: string): Promise<string | null> => {
    try {
      const result = await window.api.invoke('dialog:select-paths', { kind: 'folder' });
      return result?.success && result.paths?.[0] ? result.paths[0] : null;
    } catch (err) {
      console.error('[OpenProjectModal] Browse failed:', err);
      return null;
    }
  };

  const handleBrowseFolder = async () => {
    const picked = await pickDirectory('Select Project Folder');
    if (picked) {
      setBrowsePath(picked);
      setSelection({ type: 'folder' });
      setMode('local');
    }
  };

  const handleBrowseDest = async () => {
    const picked = await pickDirectory('Select Clone Destination');
    if (picked) setCloneDest(picked);
  };

  const handleReuseClone = (entry: { url: string; name: string }) => {
    setCloneUrl(entry.url);
    setCloneFolderName(entry.name);
    setFolderNameEdited(true);
  };

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError('');
    try {
      if (mode === 'clone') {
        const url = cloneUrl.trim();
        const folderName = cloneFolderName.trim();
        const dest = `${cloneDest.trim().replace(/\/+$/, '')}/${folderName}`;
        await window.api.invoke('git:clone', { url, dest });
        addCloneEntry(url, folderName, dest);
        const newId = addProject({
          name: folderName,
          path: dest,
          color: '#4fa8e0',
          template: 'blank',
        });
        onProjectAdded?.(newId);
      } else if (selection?.type === 'folder' && browsePath) {
        const name = browsePath.split('/').pop() || 'Untitled';
        const newId = addProject({ name, path: browsePath, color: '#4fa8e0', template: 'blank' });
        onProjectAdded?.(newId);
      } else if (selection?.type === 'project') {
        setCurrentProject(selection.id);
        onProjectAdded?.(selection.id);
      }
      onClose();
    } catch (err: any) {
      console.error('[OpenProjectModal] Submit failed:', err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [
    canSubmit,
    loading,
    mode,
    cloneUrl,
    cloneFolderName,
    cloneDest,
    selection,
    browsePath,
    addProject,
    setCurrentProject,
    onClose,
  ]);

  const handleOpenProjectDirect = (id: string) => {
    setCurrentProject(id);
    onClose();
  };

  const handleRemoveProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeProject(id);
    if (selection?.type === 'project' && selection.id === id) setSelection(null);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && mode === 'clone' && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const actionLabel =
    mode === 'clone'
      ? 'Clone & Open'
      : selection?.type === 'folder'
        ? 'Open Folder'
        : 'Open Project';

  const headerTitle = mode === 'clone' ? 'Clone Repository' : 'Open Project';
  const headerDesc =
    mode === 'clone'
      ? 'Import a project from a remote Git URL'
      : 'Pick a recent project or browse your filesystem';

  const renderTabs = () => (
    <div className="flex items-center p-0.5 rounded-lg bg-sidebar-item-hover border border-border shrink-0">
      {(
        [
          { id: 'local', label: 'Local', icon: FolderOpen },
          { id: 'clone', label: 'Clone', icon: GitBranch },
        ] as const
      ).map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => switchMode(id)}
          className={cn(
            'h-8 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all',
            mode === id
              ? 'bg-background text-text-primary shadow-sm border border-border'
              : 'text-text-secondary hover:text-text-primary border border-transparent',
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );

  const renderToolbar = () => (
    <div className="flex items-center gap-2.5 mb-4">
      {renderTabs()}
      {mode === 'local' && (
        <>
          <div className="flex-1 min-w-0 flex items-center gap-2.5 h-10 bg-sidebar-item-hover rounded-lg px-3 border border-border focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
            <Search className="w-4 h-4 text-text-secondary shrink-0" strokeWidth={1.5} />
            <input
              type="text"
              autoFocus
              spellCheck={false}
              placeholder="Search projects, or paste a Git URL..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="flex-1 min-w-0 bg-transparent outline-none text-text-primary placeholder:text-text-secondary/50 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-text-secondary hover:text-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={handleBrowseFolder}
            className="h-10 w-10 rounded-lg text-text-secondary hover:bg-white/[0.05] hover:text-text-primary flex items-center justify-center transition-all border border-border shrink-0"
            title="Browse"
            aria-label="Browse folder"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );

  const renderRow = (opts: {
    key: string;
    name: string;
    path: string;
    selected: boolean;
    stack?: StackInfo;
    onSelect: () => void;
    onOpen?: () => void;
    onRemove?: (e: React.MouseEvent) => void;
  }) => (
    <div
      key={opts.key}
      role="button"
      tabIndex={0}
      style={{ outline: 'none', boxShadow: 'none' }}
      onClick={opts.onSelect}
      onDoubleClick={opts.onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          opts.onSelect();
        }
      }}
      className={cn(
        'group flex items-center gap-3 p-2.5 cursor-pointer transition-colors border-l-2 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:shadow-none',
        opts.selected
          ? 'rounded-l-none rounded-r-lg bg-text-secondary/[0.08] border-l-text-secondary'
          : 'rounded-lg border-l-transparent hover:bg-white/[0.04]',
      )}
    >
      <div
        className={cn(
          'w-9 h-9 rounded-lg grid place-items-center shrink-0 border border-border transition-colors',
          opts.selected
            ? 'bg-text-secondary/15 text-text-primary'
            : 'bg-white/[0.05] text-text-secondary',
        )}
      >
        <LanguageBadgeIcon stack={opts.stack} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="font-medium text-sm text-text-primary truncate">{opts.name}</div>
        <small className="block text-[11px] font-mono text-text-secondary/60 truncate" title={opts.path}>
          {opts.path}
        </small>
      </div>
      {opts.onRemove && (
        <button
          onClick={opts.onRemove}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 rounded-md grid place-items-center text-text-secondary/50 hover:text-error hover:bg-error/10 transition-all shrink-0"
          title="Remove from recent"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  const renderLocalList = () => {
    if (recentProjects.length === 0 && !browsePath) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-4">
          <div className="w-14 h-14 rounded-2xl border border-dashed border-border grid place-items-center text-text-secondary/40">
            <FolderOpen className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary/90 mb-1">
              {searchQuery ? 'No matching projects' : 'No recent projects yet'}
            </p>
            <p className="text-xs text-text-secondary/60 max-w-[240px] mx-auto leading-relaxed">
              {searchQuery
                ? 'Try a different keyword, or browse for a folder.'
                : 'Browse a folder or clone a repository to get started.'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {browsePath && (
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary/60 mb-2 pl-1 text-left">
              Selected folder
            </h4>
            {renderRow({
              key: 'browse',
              name: browsePath.split('/').pop() || 'Untitled',
              path: browsePath,
              selected: selection?.type === 'folder',
              stack: stackCache.get(browsePath),
              onSelect: () => setSelection({ type: 'folder' }),
            })}
          </div>
        )}
        {recentProjects.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary/60 mb-2 pl-1 text-left">
              Recent projects
              <span className="ml-2 font-mono text-text-secondary/40">{recentProjects.length}</span>
            </h4>
            <div className="space-y-1">
              {recentProjects.map((proj) =>
                renderRow({
                  key: proj.id,
                  name: proj.name,
                  path: proj.path,
                  selected: selection?.type === 'project' && selection.id === proj.id,
                  stack: stackCache.get(proj.path),
                  onSelect: () => setSelection({ type: 'project', id: proj.id }),
                  onOpen: () => handleOpenProjectDirect(proj.id),
                  onRemove: (e) => handleRemoveProject(e, proj.id),
                }),
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[1080px] h-[680px] p-0 overflow-hidden rounded-2xl border border-border shadow-2xl flex flex-col bg-background"
    >
      <ModalHeader
        title={headerTitle}
        description={headerDesc}
        onClose={onClose}
        className="[&_h3]:text-left [&_p]:text-left px-6 py-4 border-b border-border bg-background"
      />
      <ModalBody className="p-0 flex-1 min-h-0 overflow-hidden bg-background">
        <div
          className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] h-full w-full overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          <div className="flex flex-col min-w-0 h-full overflow-hidden p-5 pb-0">
            {renderToolbar()}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-5">
              {mode === 'local' ? (
                renderLocalList()
              ) : (
                <NewRepositoryForm
                  url={cloneUrl}
                  folderName={cloneFolderName}
                  dest={cloneDest}
                  onUrlChange={handleCloneUrlChange}
                  onFolderNameChange={handleCloneFolderChange}
                  onDestChange={setCloneDest}
                  onBrowseDest={handleBrowseDest}
                />
              )}
            </div>
          </div>
          <div className="h-full border-l border-border bg-card-background/30 overflow-y-auto custom-scrollbar hidden lg:block">
            {mode === 'clone' ? (
              <RecentClones onReuse={handleReuseClone} />
            ) : (
              <ProjectDetailPanel
                target={target}
                stackInfo={target ? stackCache.get(target.path) : undefined}
              />
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter className="items-center px-5 py-3.5 bg-sidebar-background/50 border-t border-border">
        <div className="flex-1 mr-auto min-w-0 text-[11.5px]">
          {error ? (
            <span className="flex items-center gap-1.5 text-error truncate" title={error}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{error}</span>
            </span>
          ) : (
            <span className="text-text-secondary/60 truncate block">
              {mode === 'local' && 'Double-click a recent project to open it instantly'}
            </span>
          )}
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="h-8 px-4 text-xs font-medium rounded-lg bg-transparent border border-border text-text-secondary hover:bg-white/[0.05] hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className={cn(
              'h-8 px-4 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all border-none',
              canSubmit && !loading
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-text-secondary/10 text-text-secondary/50 cursor-not-allowed',
            )}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {actionLabel}
          </button>
        </div>
      </ModalFooter>
    </Modal>
  );
}

export default OpenProjectModal;