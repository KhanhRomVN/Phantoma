import { useState, useMemo, useEffect, useRef, type ReactElement } from 'react';
import { FolderOpen, FileText, GitPullRequest, Copy, Check } from 'lucide-react';
import { type StackInfo } from '@renderer/utils/detectStack';
import { Favicon, getFaviconUrl } from '@renderer/shared/utils/faviconUtils';

interface ProjectDetailPanelProps {
  selectedProjectId: string | null;
  browsePath: string;
  stackCache: Map<string, StackInfo>;
  projects: Array<{ id: string; name: string; path: string }>;
  onSubmit: () => void;
  onClose: () => void;
}

// [DEBUG] Skeleton component for loading state
function DetailSkeleton() {
  return (
    <div className="h-full flex flex-col p-5 overflow-y-auto custom-scrollbar animate-pulse">
      {/* Top Section Skeleton */}
      <div className="flex items-start gap-3 mb-6 pb-4 border-b border-border/30">
        <div className="w-10 h-10 rounded-lg bg-white/[0.05] shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 w-3/4 bg-white/[0.05] rounded" />
          <div className="h-3 w-1/2 bg-white/[0.05] rounded" />
        </div>
      </div>

      {/* Overview Skeleton */}
      <div className="mb-5">
        <div className="h-3 w-20 bg-white/[0.05] rounded mb-3" />
        <div className="space-y-2">
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
            <div className="h-3 w-16 bg-white/[0.05] rounded" />
            <div className="h-3 w-full bg-white/[0.05] rounded" />
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
            <div className="h-3 w-12 bg-white/[0.05] rounded" />
            <div className="h-3 w-1/3 bg-white/[0.05] rounded" />
          </div>
        </div>
      </div>

      {/* Contributors Skeleton */}
      <div className="mb-5">
        <div className="h-3 w-24 bg-white/[0.05] rounded mb-3" />
        <div className="flex flex-wrap gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-6 w-20 bg-white/[0.05] rounded-md" />
          ))}
        </div>
      </div>

      {/* Languages Skeleton */}
      <div className="mb-5">
        <div className="h-3 w-20 bg-white/[0.05] rounded mb-3" />
        <div className="flex flex-wrap gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-6 w-24 bg-white/[0.05] rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper to map tech ID to a known domain for favicon service if direct URL isn't available
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

export function ProjectDetailPanel({
  selectedProjectId,
  browsePath,
  stackCache,
  projects,
}: ProjectDetailPanelProps) {
  const [copiedPath, setCopiedPath] = useState(false);

  // [DEBUG] Refs to track timing and prevent duplicate logs
  const lastLoggedKeyRef = useRef<string>('');
  const startTimeRef = useRef<number>(0);

  const targetData = useMemo(() => {
    if (browsePath) {
      return {
        name: browsePath.split('/').pop() || 'Untitled',
        path: browsePath,
        stackInfo: stackCache.get(browsePath),
      };
    }
    if (selectedProjectId) {
      const proj = projects.find((p) => p.id === selectedProjectId);
      if (proj) {
        return {
          name: proj.name,
          path: proj.path,
          stackInfo: stackCache.get(proj.path),
        };
      }
    }
    return null;
  }, [selectedProjectId, browsePath, stackCache, projects]);

  // [DEBUG] Log when selection changes or data updates
  useEffect(() => {
    const currentKey = `${selectedProjectId || ''}:${browsePath || ''}`;

    if (currentKey !== lastLoggedKeyRef.current) {
      lastLoggedKeyRef.current = currentKey;
      startTimeRef.current = Date.now();
    } else if (targetData?.stackInfo && !lastLoggedKeyRef.current.endsWith(':loaded')) {
      lastLoggedKeyRef.current += ':loaded';
    }
  }, [selectedProjectId, browsePath, targetData?.stackInfo]);

  const shortenPath = (path: string): string => {
    if (!path) return '';
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= 3) return path;
    const start = parts[0] === 'home' || parts[0] === 'Users' ? '~/' : '';
    const end = parts.slice(-2).join('/');
    return `${start}.../${end}`;
  };

  const formatBytes = (bytes?: number): string => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const timeAgo = (timestamp?: number): string => {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const formatRepoUrl = (url: string): string => {
    if (!url) return '';

    // 1. Remove protocol (https:// or http://) and SSH user prefix (git@)
    let clean = url.replace(/^https?:\/\//, '').replace(/^git@/, '');

    // 2. Remove trailing .git extension
    clean = clean.replace(/\.git$/, '');

    // 3. Extract only the owner/repo part by removing the hostname/domain
    // Handles formats like:
    // - github.com:Owner/Repo (SSH style after step 1)
    // - github.com/Owner/Repo (HTTPS style after step 1)
    // We look for the first occurrence of '/' or ':' followed by content, then take everything after it.
    // Actually simpler: split by common separators [: /] and take the last two non-empty segments if they exist,
    // BUT strictly speaking, we just want to strip the domain.
    // Domain usually ends with .com, .org, etc. Or simply before the first : or / that separates path.

    // Strategy: Find the index of the first ':' or '/' that comes AFTER a potential domain structure.
    // Since we already stripped 'git@' and 'https://', the string starts with domain.
    // e.g. "github.com:KhanhRomVN/AIWeb2API" or "github.com/KhanhRomVN/AIWeb2API"

    const match = clean.match(/^[^:/]+[:/]?(.*)$/);
    if (match && match[1]) {
      return match[1];
    }

    return clean;
  };

  // Get favicon URL for a tech/language ID
  const getTechIconUrl = (id: string): string => {
    const domain = TECH_DOMAIN_MAP[id.toLowerCase()];
    return domain ? getFaviconUrl(domain) : '';
  };

  if (!targetData) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-secondary/30 gap-2 text-center p-5">
        <FileText className="w-8 h-8 opacity-20" />
        <span className="text-xs">Select a project to view details</span>
      </div>
    );
  }

  const { name, path, stackInfo } = targetData;

  // Show skeleton while waiting for stack detection
  if (!stackInfo) {
    return <DetailSkeleton />;
  }

  // Determine the best icon for the header
  const headerIconUrl = stackInfo.primaryLanguage
    ? getTechIconUrl(stackInfo.primaryLanguage)
    : stackInfo.frameworks?.[0]
      ? getTechIconUrl(stackInfo.frameworks[0])
      : '';

  const handleCopyPath = () => {
    navigator.clipboard
      .writeText(path)
      .then(() => {
        setCopiedPath(true);
        setTimeout(() => setCopiedPath(false), 2000);
      })
      .catch((err) => console.error('Failed to copy path:', err));
  };

  const topSection = (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-10 h-10 rounded-lg grid place-items-center shrink-0 bg-white/[0.05] border border-border overflow-hidden">
        {headerIconUrl ? (
          <Favicon url={headerIconUrl} size={24} alt="" className="object-contain" />
        ) : (
          <FolderOpen className="w-5 h-5 text-text-secondary" />
        )}
      </div>
      <div className="flex-1 min-w-0 text-left group/path">
        <h3 className="text-base font-semibold text-text-primary truncate">{name}</h3>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] font-mono text-text-secondary/60 truncate flex-1" title={path}>
            {shortenPath(path)}
          </p>
          <button
            onClick={handleCopyPath}
            className="opacity-0 group-hover/path:opacity-100 p-1 rounded hover:bg-white/[0.05] text-text-secondary hover:text-text-primary transition-all shrink-0"
            title="Copy full path"
          >
            {copiedPath ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  );

  // Only render fields that have values
  const overviewFields: ReactElement[] = [];

  if (stackInfo?.repoUrl) {
    const formattedUrl = formatRepoUrl(stackInfo.repoUrl);
    overviewFields.push(
      <div
        key="repo-url"
        className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs items-center"
      >
        <span className="text-text-secondary/60 whitespace-nowrap text-left">Repo URL:</span>
        <span className="text-text-primary font-mono truncate text-right" title={stackInfo.repoUrl}>
          {formattedUrl}
        </span>
      </div>,
    );
  }
  if (stackInfo?.author) {
    overviewFields.push(
      <div key="author" className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs items-center">
        <span className="text-text-secondary/60 whitespace-nowrap text-left">Author:</span>
        <span className="text-text-primary text-right">{stackInfo.author}</span>
      </div>,
    );
  }
  if (stackInfo?.sizeBytes) {
    overviewFields.push(
      <div key="size" className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs items-center">
        <span className="text-text-secondary/60 whitespace-nowrap text-left">Size:</span>
        <span className="text-text-primary text-right">{formatBytes(stackInfo.sizeBytes)}</span>
      </div>,
    );
  }

  const overviewSection =
    overviewFields.length > 0 ? (
      <div className="mb-5">
        <h4 className="text-[11px] font-mono uppercase tracking-wide text-text-secondary/50 mb-3 pl-0 text-left">
          Overview
        </h4>
        <div className="space-y-2">{overviewFields}</div>
      </div>
    ) : null;

  const contributorsSection =
    stackInfo?.contributors && stackInfo.contributors.length > 0 ? (
      <div className="mb-5">
        <h4 className="text-[11px] font-mono uppercase tracking-wide text-text-secondary/50 mb-3 pl-0 text-left">
          Contributors
        </h4>
        <div className="flex flex-wrap gap-2">
          {stackInfo.contributors.slice(0, 5).map((c, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03] border border-border/50"
            >
              <img
                src={`https://avatars.githubusercontent.com/${c.username}?s=20`}
                alt={c.username}
                className="w-4 h-4 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getTechIconUrl('github');
                }}
              />
              <span className="text-[11px] text-text-primary font-medium">{c.username}</span>
            </div>
          ))}
          {stackInfo.contributors.length > 5 && (
            <span className="self-center text-[10px] text-text-secondary/50 ml-1">
              +{stackInfo.contributors.length - 5} more
            </span>
          )}
        </div>
      </div>
    ) : null;

  const languagesSection =
    stackInfo?.languages && stackInfo.languages.length > 0 ? (
      <div className="mb-5">
        <h4 className="text-[11px] font-mono uppercase tracking-wide text-text-secondary/50 mb-3 pl-0 text-left">
          Languages
        </h4>
        <div className="flex flex-wrap gap-2">
          {stackInfo.languages.map((lang, idx) => {
            const iconUrl = getTechIconUrl(lang.id);
            return (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03] border border-border/50"
              >
                {iconUrl ? (
                  <Favicon url={iconUrl} size={14} alt="" className="object-contain" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-text-secondary" />
                )}
                <span className="text-[11px] text-text-primary">{lang.name}</span>
                <span className="text-[10px] text-text-secondary/60 font-mono">
                  {lang.percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    ) : null;

  const frameworksSection =
    stackInfo?.frameworks && stackInfo.frameworks.length > 0 ? (
      <div className="mb-5">
        <h4 className="text-[11px] font-mono uppercase tracking-wide text-text-secondary/50 mb-3 pl-0 text-left">
          Frameworks
        </h4>
        <div className="flex flex-wrap gap-2">
          {stackInfo.frameworks.map((fwk, idx) => {
            const iconUrl = getTechIconUrl(fwk);
            return (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/[0.05] border border-primary/20"
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
    ) : null;

  const branchesSection =
    stackInfo?.branches && stackInfo.branches.length > 0 ? (
      <div className="mb-5">
        <h4 className="text-[11px] font-mono uppercase tracking-wide text-text-secondary/50 mb-3 pl-0 text-left">
          Branches
        </h4>
        <div className="space-y-1.5">
          {stackInfo.branches.map((br, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-md bg-white/[0.02] border border-border/30 hover:border-border/60 transition-colors group/item"
            >
              <div className="flex items-center gap-2 min-w-0">
                <GitPullRequest className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                <span className="text-xs text-text-primary font-mono truncate">{br.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-[10px] text-text-secondary/50 font-mono">
                <span>{timeAgo(br.lastCommitDate)}</span>
                <span className="border-l border-border/30 pl-3">{br.commitCount} commits</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className="h-full flex flex-col p-5 overflow-y-auto custom-scrollbar select-text">
      {topSection}
      {overviewSection}
      {contributorsSection}
      {languagesSection}
      {frameworksSection}
      {branchesSection}
    </div>
  );
}
