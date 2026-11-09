/**
 * ------------------------------------------------------------------
 * PR Card
 * ------------------------------------------------------------------
 * Card một Pull Request trong danh sách: thanh màu + icon theo trạng
 * thái, tiêu đề, tác giả, nhánh head -> base và badge review.
 * ------------------------------------------------------------------
 */

import { memo } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  GitBranch,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
  XCircle,
} from 'lucide-react';

import { cn } from '@renderer/utils/cn';
import { PrAvatar } from './PrAvatar';
import type { PullRequest } from './types';
import { REVIEW_META, TONE_COLOR, prTone, timeAgo, tint, type PrTone } from './utils';

const TONE_ICON: Record<PrTone, typeof GitPullRequest> = {
  open: GitPullRequest,
  merged: GitMerge,
  closed: GitPullRequestClosed,
  draft: GitPullRequestDraft,
};

const REVIEW_ICON: Record<string, typeof Eye> = {
  APPROVED: CheckCircle2,
  CHANGES_REQUESTED: XCircle,
  REVIEW_REQUIRED: Eye,
};

interface PrCardProps {
  pr: PullRequest;
  selected: boolean;
  onSelect: (number: number) => void;
}

export const PrCard = memo(function PrCard({ pr, selected, onSelect }: PrCardProps) {
  const tone = prTone(pr);
  const color = TONE_COLOR[tone];
  const Icon = TONE_ICON[tone];
  const review = pr.reviewDecision ? REVIEW_META[pr.reviewDecision] : undefined;
  const ReviewIcon = pr.reviewDecision ? REVIEW_ICON[pr.reviewDecision] : undefined;

  return (
    <div
      onClick={() => onSelect(pr.number)}
      style={selected ? { background: tint(color, 10), borderColor: tint(color, 35) } : undefined}
      className={cn(
        'group relative mx-2 my-1.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
        !selected && 'border-border/60 hover:border-border hover:bg-card-hover',
      )}
    >
      <span
        style={{ background: color }}
        className={'absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full'}
      />

      <div className={'flex items-start gap-2.5'}>
        <span
          style={{ color, background: tint(color, 15) }}
          className={'mt-0.5 w-6 h-6 rounded-md grid place-items-center shrink-0'}
        >
          <Icon className={'w-3.5 h-3.5'} />
        </span>

        <div className={'min-w-0 flex-1'}>
          <div className={'text-[12.5px] font-semibold leading-snug text-text-primary break-words line-clamp-2'}>
            {pr.title}
          </div>

          <div className={'mt-1 flex items-center gap-1.5 text-[11px] text-text-secondary'}>
            <PrAvatar login={pr.author?.login} size={14} />
            <span className={'truncate'}>{pr.author?.login ?? 'unknown'}</span>
            <span className={'text-text-secondary/40'}>·</span>
            <span className={'font-mono shrink-0'}>{`#${pr.number}`}</span>
            <span className={'text-text-secondary/40'}>·</span>
            <span className={'shrink-0'}>{timeAgo(pr.updatedAt)}</span>
          </div>

          <div className={'mt-2 flex items-center gap-1.5 min-w-0'}>
            <span className={'inline-flex items-center gap-1 min-w-0 max-w-[45%] rounded bg-button-soft-background px-1.5 py-[1px] font-mono text-[10.5px] text-text-primary'}>
              <GitBranch className={'w-3 h-3 shrink-0 text-text-secondary'} />
              <span className={'truncate'}>{pr.headRefName}</span>
            </span>
            <ArrowRight className={'w-3 h-3 shrink-0 text-text-secondary/60'} />
            <span className={'inline-flex items-center min-w-0 max-w-[40%] rounded bg-button-soft-background px-1.5 py-[1px] font-mono text-[10.5px] text-text-secondary'}>
              <span className={'truncate'}>{pr.baseRefName}</span>
            </span>
            <span className={'flex-1'} />
            {review && ReviewIcon && (
              <span
                title={review.label}
                style={{ color: review.color, background: tint(review.color, 12) }}
                className={'shrink-0 inline-flex items-center gap-1 rounded px-1.5 py-[1px] text-[10px] font-semibold'}
              >
                <ReviewIcon className={'w-3 h-3'} />
                {review.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

PrCard.displayName = 'PrCard';