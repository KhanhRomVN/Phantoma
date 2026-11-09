/**
 * ------------------------------------------------------------------
 * PR Detail
 * ------------------------------------------------------------------
 * Khung chi tiết một Pull Request: header màu theo trạng thái, thống
 * kê, thanh hành động và 4 tab (Overview / Commits / Files /
 * Conversation) để không bị chôn danh sách commit và comment dưới
 * danh sách file dài.
 * ------------------------------------------------------------------
 */

import { memo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
  MessageSquare,
  XCircle,
} from 'lucide-react';

import { cn } from '@renderer/utils/cn';
import { PrAvatar } from './PrAvatar';
import { PrCommits } from './PrCommits';
import { PrConversation } from './PrConversation';
import { PrFiles } from './PrFiles';
import type { DetailTab, MergeMethod, PullRequestDetail } from './types';
import {
  BTN,
  BTN_DANGER,
  BTN_PRIMARY,
  CHECK_COLOR,
  TONE_COLOR,
  TONE_LABEL,
  checkKind,
  checkLabel,
  checkResult,
  prTone,
  tint,
  timeAgo,
  type PrTone,
} from './utils';

const TONE_ICON: Record<PrTone, typeof GitPullRequest> = {
  open: GitPullRequest,
  merged: GitMerge,
  closed: GitPullRequestClosed,
  draft: GitPullRequestDraft,
};

const Branch = ({ name, dim }: { name: string; dim?: boolean }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded bg-button-soft-background px-1.5 py-[1px] font-mono text-[11px]',
      dim ? 'text-text-secondary' : 'text-text-primary',
    )}
  >
    <GitBranch className={'w-3 h-3 text-text-secondary'} />
    {name}
  </span>
);

interface PrDetailProps {
  detail: PullRequestDetail;
  busy: boolean;
  mergeMethod: MergeMethod;
  comment: string;
  onMergeMethodChange: (method: MergeMethod) => void;
  onCommentChange: (value: string) => void;
  onAction: (channel: string, args: unknown[], okMsg: string) => void;
  onSubmitComment: () => void;
  onCopyHash: (hash: string) => void;
}

export const PrDetail = memo(function PrDetail({
  detail,
  busy,
  mergeMethod,
  comment,
  onMergeMethodChange,
  onCommentChange,
  onAction,
  onSubmitComment,
  onCopyHash,
}: PrDetailProps) {
  const [tab, setTab] = useState<DetailTab>('overview');

  const tone = prTone(detail);
  const color = TONE_COLOR[tone];
  const Icon = TONE_ICON[tone];
  const open = detail.state === 'OPEN';
  const checks = detail.statusCheckRollup ?? [];
  const talkCount = detail.reviews.filter((r) => r.body).length + detail.comments.length;
  const kinds = checks.map((c) => checkKind(checkResult(c)));
  const passed = kinds.filter((k) => k === 'pass').length;
  const failed = kinds.filter((k) => k === 'fail').length;
  const pending = kinds.length - passed - failed;
  const warn = 'rgb(var(--warn))';

  const tabs: { id: DetailTab; label: string; count: number }[] = [
    { id: 'overview', label: 'Overview', count: 0 },
    { id: 'commits', label: 'Commits', count: detail.commits.length },
    { id: 'files', label: 'Files', count: detail.changedFiles },
    { id: 'conversation', label: 'Conversation', count: talkCount },
  ];

  return (
    <div className={'flex-1 min-h-0 flex flex-col'}>
      <header
        style={{ background: `linear-gradient(180deg, ${tint(color, 8)}, transparent)` }}
        className={'shrink-0 px-6 pt-5 border-b border-border flex flex-col gap-3'}
      >
        <div className={'flex items-start gap-3'}>
          <span
            style={{ color, background: tint(color, 15) }}
            className={'shrink-0 mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold'}
          >
            <Icon className={'w-3.5 h-3.5'} />
            {TONE_LABEL[tone]}
          </span>
          <h3 className={'flex-1 min-w-0 text-[16px] font-semibold leading-snug text-text-primary break-words'}>
            {detail.title} <span className={'font-normal text-text-secondary'}>{`#${detail.number}`}</span>
          </h3>
        </div>

        <div className={'flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px] text-text-secondary'}>
          <PrAvatar login={detail.author?.login} size={20} />
          <span className={'font-semibold text-text-primary'}>{detail.author?.login ?? 'unknown'}</span>
          <span>{detail.state === 'MERGED' ? 'merged' : 'wants to merge'}</span>
          <Branch name={detail.headRefName} />
          <ArrowRight className={'w-3 h-3 text-text-secondary/60'} />
          <Branch name={detail.baseRefName} dim />
          <span className={'text-text-secondary/40'}>·</span>
          <span>{timeAgo(detail.createdAt)}</span>
        </div>

        <div className={'flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]'}>
          <span className={'font-mono'}>
            <span className={'text-success'}>{`+${detail.additions}`}</span>{' '}
            <span className={'text-error'}>{`-${detail.deletions}`}</span>
          </span>
          <span className={'inline-flex items-center gap-1 text-text-secondary'}>
            <GitCommit className={'w-3.5 h-3.5'} />
            {`${detail.commits.length} commits`}
          </span>
          <span className={'inline-flex items-center gap-1 text-text-secondary'}>
            <FileText className={'w-3.5 h-3.5'} />
            {`${detail.changedFiles} files`}
          </span>
          <span className={'inline-flex items-center gap-1 text-text-secondary'}>
            <MessageSquare className={'w-3.5 h-3.5'} />
            {`${talkCount} comments`}
          </span>
          {detail.mergeable === 'CONFLICTING' && (
            <span className={'inline-flex items-center gap-1 text-warn font-medium'}>
              <AlertTriangle className={'w-3.5 h-3.5'} />
              Has merge conflicts
            </span>
          )}
        </div>

        <div className={'flex flex-wrap items-center gap-2'}>
          <button
            className={BTN}
            onClick={() => void window.api.invoke('pr:open-external', detail.url)}
          >
            <ExternalLink className={'w-3.5 h-3.5'} />
            Open on GitHub
          </button>
          {open && detail.isDraft && (
            <button
              className={BTN}
              disabled={busy}
              onClick={() => onAction('pr:ready', [], 'Marked as ready for review')}
            >
              Ready for review
            </button>
          )}
          {open && (
            <>
              <button
                className={BTN}
                disabled={busy}
                onClick={() => onAction('pr:review', ['approve'], 'Approved')}
              >
                Approve
              </button>
              <select
                value={mergeMethod}
                onChange={(e) => onMergeMethodChange(e.target.value as MergeMethod)}
                disabled={busy}
                className={'h-7 cursor-pointer rounded-md bg-button-soft-background px-2 text-[12px] text-text-secondary outline-none'}
              >
                <option value={'squash'}>Squash and merge</option>
                <option value={'merge'}>Create a merge commit</option>
                <option value={'rebase'}>Rebase and merge</option>
              </select>
              <button
                className={BTN_PRIMARY}
                disabled={busy || detail.isDraft}
                title={detail.isDraft ? 'Mark the draft as ready for review first' : undefined}
                onClick={() => onAction('pr:merge', [mergeMethod, false], 'Pull request merged')}
              >
                <GitMerge className={'w-3.5 h-3.5'} />
                Merge
              </button>
              <button
                className={BTN_DANGER}
                disabled={busy}
                onClick={() => onAction('pr:close', [], 'Pull request closed')}
              >
                Close
              </button>
            </>
          )}
          {detail.state === 'CLOSED' && (
            <button
              className={BTN}
              disabled={busy}
              onClick={() => onAction('pr:reopen', [], 'Pull request reopened')}
            >
              Reopen
            </button>
          )}
        </div>

        <nav className={'flex items-center gap-1 -mb-px'}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={tab === t.id ? { borderColor: color } : undefined}
              className={cn(
                'h-9 px-3 inline-flex items-center gap-1.5 border-b-2 text-[12.5px] font-medium outline-none cursor-pointer transition-colors',
                tab === t.id
                  ? 'text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary',
              )}
            >
              {t.label}
              {t.count > 0 && (
                <span className={'rounded-full bg-button-soft-background px-1.5 text-[10.5px] font-semibold text-text-secondary'}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <div className={'flex-1 min-h-0 overflow-y-auto'}>
        <div className={'p-6 max-w-[860px]'}>
          {tab === 'overview' && (
            <div className={'flex flex-col gap-5'}>
              {detail.mergeable === 'CONFLICTING' && (
                <div
                  style={{ background: tint(warn, 10), borderColor: tint(warn, 30) }}
                  className={'flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] text-text-primary'}
                >
                  <AlertTriangle className={'w-4 h-4 shrink-0 text-warn'} />
                  This branch has conflicts that must be resolved before merging.
                </div>
              )}

              <div className={'rounded-lg border border-border overflow-hidden'}>
                <div className={'flex items-center gap-2 px-3 py-1.5 bg-button-soft-background/60 text-[11.5px] text-text-secondary'}>
                  <PrAvatar login={detail.author?.login} size={18} />
                  <span className={'font-semibold text-text-primary'}>{detail.author?.login ?? 'unknown'}</span>
                  {`opened this ${timeAgo(detail.createdAt)}`}
                </div>
                <div className={'px-3 py-3 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-text-primary'}>
                  {detail.body?.trim() || (
                    <span className={'italic text-text-secondary/60'}>No description provided.</span>
                  )}
                </div>
              </div>

              {checks.length > 0 && (
                <div className={'flex flex-col gap-2'}>
                  <div className={'flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary/70'}>
                    {`Checks (${checks.length})`}
                    <span className={'normal-case tracking-normal font-medium flex items-center gap-2'}>
                      {passed > 0 && <span className={'text-success'}>{`${passed} passed`}</span>}
                      {failed > 0 && <span className={'text-error'}>{`${failed} failed`}</span>}
                      {pending > 0 && <span className={'text-warn'}>{`${pending} pending`}</span>}
                    </span>
                  </div>
                  <div className={'rounded-lg border border-border overflow-hidden'}>
                    {checks.map((c, i) => {
                      const kind = kinds[i];
                      const KindIcon = kind === 'pass' ? CheckCircle2 : kind === 'fail' ? XCircle : Clock;
                      return (
                        <div
                          key={`${checkLabel(c)}-${i}`}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-1.5 text-[12px]',
                            i > 0 && 'border-t border-border/50',
                          )}
                        >
                          <KindIcon className={'w-4 h-4 shrink-0'} style={{ color: CHECK_COLOR[kind] }} />
                          <span className={'min-w-0 flex-1 truncate text-text-primary'}>{checkLabel(c)}</span>
                          <span className={'shrink-0 font-mono text-[11px]'} style={{ color: CHECK_COLOR[kind] }}>
                            {checkResult(c) || 'pending'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'commits' && <PrCommits commits={detail.commits} onCopy={onCopyHash} />}

          {tab === 'files' && (
            <PrFiles files={detail.files} totalFiles={detail.changedFiles} url={detail.url} />
          )}

          {tab === 'conversation' && (
            <PrConversation
              reviews={detail.reviews}
              comments={detail.comments}
              comment={comment}
              busy={busy}
              onCommentChange={onCommentChange}
              onSubmit={onSubmitComment}
            />
          )}
        </div>
      </div>
    </div>
  );
});

PrDetail.displayName = 'PrDetail';