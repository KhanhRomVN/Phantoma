import { type ReactNode } from 'react';
import { FileText, GitBranch, Link2, HardDrive, User } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Favicon } from '@renderer/utils/favicon';
import { type StackInfo } from '../../../utils/detect-stack.util';
import { ProjectLogoImage } from '../../ProjectLogo';
import { LANG_COLORS, Tone, TONE_SOFT, TONE_DOT } from '../../../constants/open-project.constants';
import {
  hashTone,
  formatBytes,
  timeAgo,
  formatRepoUrl,
  getTechIconUrl,
} from '../../../utils/open-project.util';
import { LanguageBadgeIcon } from './LanguageBadgeIcon';
import { LogoCandidate } from '../../../types/open-project.types';

export interface ProjectDetailPanelProps {
  target: { name: string; path: string } | null;
  stackInfo?: StackInfo;
  logoCandidates?: LogoCandidate[];
  logoCurrent?: string | null;
  onLogoPick?: (filePath: string | null) => void;
  selectedBranch?: string;
  onBranchSelect?: (name: string) => void;
}

export function SectionTitle({
  children,
  tone = 'blue',
  count,
}: {
  children: ReactNode;
  tone?: Tone;
  count?: number;
}) {
  return (
    <h4 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary mb-2 text-left">
      <span className={cn('w-1.5 h-1.5 rounded-full', TONE_DOT[tone])} />
      {children}
      {count !== undefined && (
        <span className={cn('px-1.5 py-0.5 rounded-md font-mono leading-none', TONE_SOFT[tone])}>
          {count}
        </span>
      )}
    </h4>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  tone = 'blue',
}: {
  icon: ReactNode;
  title: string;
  description: string;
  tone?: Tone;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
      <div className={cn('w-12 h-12 rounded-2xl grid place-items-center', TONE_SOFT[tone])}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="text-xs text-text-secondary mt-1 leading-relaxed max-w-[220px]">{description}</p>
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-5 pt-4">
      <div className="rounded-xl bg-white/[0.03] divide-y divide-border/30">
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
    </div>
  );
}

export function ProjectDetailPanel({
  target,
  stackInfo,
  logoCandidates = [],
  logoCurrent = null,
  onLogoPick,
  selectedBranch,
  onBranchSelect,
}: ProjectDetailPanelProps) {
  const currentLabel = onBranchSelect ? 'Default' : 'Current';
  if (!target) {
    return (
      <EmptyState
        icon={<FileText className="w-5 h-5" strokeWidth={1.5} />}
        title="No project selected"
        description="Pick a project on the left to preview its stack, contributors and branches."
        tone="purple"
      />
    );
  }

  const { name, path } = target;
  const currentLogoSrc = logoCandidates.find((c) => c.path === logoCurrent)?.src;
  const headTone = hashTone(name);

  const overviewRows: {
    icon: ReactNode;
    label: string;
    value: string;
    title?: string;
    mono?: boolean;
    tone: Tone;
  }[] = [];
  if (stackInfo?.repoUrl) {
    overviewRows.push({
      icon: <Link2 className="w-3.5 h-3.5" />,
      label: 'Repository',
      value: formatRepoUrl(stackInfo.repoUrl),
      title: stackInfo.repoUrl,
      mono: true,
      tone: 'blue',
    });
  }
  if (stackInfo?.author) {
    overviewRows.push({
      icon: <User className="w-3.5 h-3.5" />,
      label: 'Author',
      value: stackInfo.author,
      tone: 'purple',
    });
  }
  if (stackInfo?.sizeBytes) {
    overviewRows.push({
      icon: <HardDrive className="w-3.5 h-3.5" />,
      label: 'Size',
      value: formatBytes(stackInfo.sizeBytes),
      tone: 'teal',
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
    <div className="flex flex-col select-text">
      <div className="relative px-5 pt-5 pb-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-purple/10 to-transparent pointer-events-none" />
        <span className={cn('absolute top-0 left-0 h-0.5 w-full opacity-60', TONE_DOT[headTone])} />
        <div className="relative flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl grid place-items-center shrink-0 bg-background/60 border border-border/60 overflow-hidden">
            {logoCurrent && currentLogoSrc ? (
              <img src={currentLogoSrc} alt="" className="w-full h-full object-contain" draggable={false} />
            ) : logoCurrent ? (
              <ProjectLogoImage path={logoCurrent} side={64} className="w-full h-full object-contain" />
            ) : (
              <LanguageBadgeIcon stack={stackInfo} className="w-6 h-6" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h3 className="text-base font-semibold text-text-primary truncate">{name}</h3>
            <p className="mt-0.5 w-full text-[11px] font-mono text-text-secondary truncate" title={path}>
              {path}
            </p>
          </div>
        </div>
        {logoCandidates.length > 0 && (
          <div className="relative mt-4 text-left">
            <div className="text-[10px] uppercase tracking-[0.1em] text-text-secondary mb-1.5">Logo</div>
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
              {logoCandidates.map((c) => (
                <button
                  key={c.path}
                  type="button"
                  title={`${c.name} (${c.width}×${c.height})`}
                  onClick={() => onLogoPick?.(logoCurrent === c.path ? null : c.path)}
                  className={cn(
                    'w-10 h-10 shrink-0 rounded-lg border overflow-hidden grid place-items-center bg-background/60 transition-colors',
                    logoCurrent === c.path
                      ? 'border-dashed border-primary'
                      : 'border-border/60 hover:border-text-secondary/60',
                  )}
                >
                  {c.src ? (
                    <img src={c.src} alt="" className="w-full h-full object-contain" draggable={false} />
                  ) : (
                    <ProjectLogoImage path={c.path} side={64} className="w-full h-full object-contain" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        {!stackInfo ? (
          <DetailSkeleton />
        ) : !hasDetails ? (
          <p className="text-xs text-text-secondary pt-4 leading-relaxed">
            No stack information detected for this folder.
          </p>
        ) : (
          <div className="space-y-5 pt-4">
            {overviewRows.length > 0 && (
              <div>
                <SectionTitle tone="blue">Overview</SectionTitle>
                <div className="rounded-xl bg-white/[0.03] divide-y divide-border/30">
                  {overviewRows.map((row) => (
                    <div key={row.label} className="flex items-center gap-3 px-3 py-2.5 text-xs">
                      <span className={cn('w-6 h-6 rounded-md grid place-items-center shrink-0', TONE_SOFT[row.tone])}>
                        {row.icon}
                      </span>
                      <span className="text-text-secondary shrink-0">{row.label}</span>
                      <span
                        className={`flex-1 min-w-0 truncate text-right text-text-primary ${row.mono ? 'font-mono' : ''}`}
                        title={row.title}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {languages.length > 0 && (
              <div>
                <SectionTitle tone="yellow">Languages</SectionTitle>
                <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.05] gap-px">
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
                      <span className="text-text-secondary font-mono">{lang.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {frameworks.length > 0 && (
              <div>
                <SectionTitle tone="purple">Frameworks</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {frameworks.map((fwk) => {
                    const iconUrl = getTechIconUrl(fwk);
                    const tone = hashTone(fwk);
                    return (
                      <div
                        key={fwk}
                        className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md', TONE_SOFT[tone])}
                      >
                        {iconUrl ? (
                          <Favicon url={iconUrl} size={14} alt="" className="object-contain" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                        <span className="text-[11px] font-medium capitalize">{fwk}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {contributors.length > 0 && (
              <div>
                <SectionTitle tone="pink" count={contributors.length}>
                  Contributors
                </SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {contributors.slice(0, 5).map((c) => (
                    <div
                      key={c.username}
                      className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-md bg-white/[0.04]"
                    >
                      <img
                        src={`https://avatars.githubusercontent.com/${c.username}?s=28`}
                        alt={c.username}
                        className="w-5 h-5 rounded object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getTechIconUrl('github');
                        }}
                      />
                      <span className="text-xs text-text-primary font-medium">{c.username}</span>
                    </div>
                  ))}
                  {contributors.length > 5 && (
                    <span className="self-center text-[10px] text-text-secondary">
                      +{contributors.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {branches.length > 0 && (
              <div>
                <SectionTitle tone="green" count={branches.length}>
                  Branches
                </SectionTitle>
                <div className="space-y-1.5">
                  {branches.slice(0, 6).map((br) => (
                    <div
                      key={br.name}
                      role={onBranchSelect ? 'button' : undefined}
                      onClick={onBranchSelect ? () => onBranchSelect(br.name) : undefined}
                      className={cn(
                        'flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg bg-white/[0.03] border transition-colors',
                        onBranchSelect && 'cursor-pointer',
                        onBranchSelect && selectedBranch === br.name
                          ? 'border-dashed border-primary'
                          : 'border-transparent hover:bg-white/[0.06]',
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <GitBranch className="w-3.5 h-3.5 text-green shrink-0" />
                        <span className="text-xs text-text-primary font-mono truncate">{br.name}</span>
                        {br.isCurrent && (
                          <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md bg-success/10 text-[9px] leading-none font-semibold uppercase tracking-[0.06em] text-success">
                            {currentLabel}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[10px] text-text-secondary font-mono">
                        {br.lastCommitDate ? <span>{timeAgo(br.lastCommitDate)}</span> : null}
                        {br.commitCount !== undefined && <span>{br.commitCount} commits</span>}
                      </div>
                    </div>
                  ))}
                  {branches.length > 6 && (
                    <p className="text-[10px] text-text-secondary pl-1">+{branches.length - 6} more branches</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
