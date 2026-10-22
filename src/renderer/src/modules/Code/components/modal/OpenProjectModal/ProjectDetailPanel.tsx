import { useState, useEffect, useRef, type ReactNode } from 'react';
import { FolderOpen, FileText, GitBranch, Copy, Check, Link2, HardDrive, User } from 'lucide-react';
import { type StackInfo } from '@renderer/utils/detectStack';
import { Favicon, getFaviconUrl } from '@renderer/shared/utils/faviconUtils';

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
