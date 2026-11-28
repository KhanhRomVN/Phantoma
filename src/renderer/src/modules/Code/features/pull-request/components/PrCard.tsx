// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { memo } from 'react';

// ── UI ──
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  GitBranch,
  XCircle,
} from 'lucide-react';

// ── Components ──
import { PrAvatar } from './PrAvatar';

// ── Utils ──
import { cn } from '@renderer/utils/cn';
import { REVIEW_META, TONE_COLOR, prTone, timeAgo, tint } from '../utils/pull-request.util';

// ── Types ──
import type { PullRequest } from '../types/pull-request.types';

// ─── Constants ───────────────────────────────────────────────────────────────
const REVIEW_ICON: Record<string, typeof Eye> = {
  APPROVED: CheckCircle2,
  CHANGES_REQUESTED: XCircle,
  REVIEW_REQUIRED: Eye,
};

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface PrCardProps {
  pr: PullRequest;
  selected: boolean;
  onSelect: (number: number) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const PrCard = memo(function PrCard({ pr, selected, onSelect }: PrCardProps) {
  const tone = prTone(pr);
  const color = TONE_COLOR[tone];

  const review = pr.reviewDecision ? REVIEW_META[pr.reviewDecision] : undefined;
  const ReviewIcon = pr.reviewDecision ? REVIEW_ICON[pr.reviewDecision] : undefined;

  return (
    <div
      onClick={() => onSelect(pr.number)}
      style={selected ? { backgroundImage: `linear-gradient(${tint(color, 8)}, ${tint(color, 8)})`, borderColor: tint(color, 35) } : undefined}
      className={cn(
        'group relative mx-2 my-1.5 rounded-lg border bg-card-background px-3 py-2.5 cursor-pointer transition-colors',
        !selected && 'border-border/60 hover:border-border hover:bg-card-hover',
      )}
    >

      <div className={'flex items-start gap-2'}>

        <div className={'min-w-0 flex-1 text-[12.5px] font-medium leading-snug text-text-primary break-words line-clamp-2'}>
          {pr.title}
        </div>
        <span className={'mt-[2px] shrink-0 font-mono text-[10.5px] text-text-secondary'}>
          {`#${pr.number}`}
        </span>
      </div>

      <div className={'mt-1.5 flex items-center gap-2 min-w-0'}>
        <span className={'inline-flex min-w-0 items-center gap-1 font-mono text-[10.5px] text-text-secondary'}>
          <GitBranch style={{ color }} className={'h-3 w-3 shrink-0'} />
          <span className={'truncate max-w-[110px] text-text-primary/90'}>{pr.headRefName}</span>
          <ArrowRight className={'h-3 w-3 shrink-0 text-text-secondary/50'} />
          <span className={'truncate max-w-[70px]'}>{pr.baseRefName}</span>
        </span>
        <span className={'flex-1'} />
        {review && ReviewIcon && (
          <span title={review.label} style={{ color: review.color }} className={'shrink-0'}>
            <ReviewIcon className={'h-3.5 w-3.5'} />
          </span>
        )}
        <span title={pr.author?.login ?? 'unknown'} className={'shrink-0'}>
          <PrAvatar login={pr.author?.login} size={16} />
        </span>
        <span className={'shrink-0 text-[10.5px] text-text-secondary'}>{timeAgo(pr.updatedAt)}</span>
      </div>
    </div>
  );
});

PrCard.displayName = 'PrCard';