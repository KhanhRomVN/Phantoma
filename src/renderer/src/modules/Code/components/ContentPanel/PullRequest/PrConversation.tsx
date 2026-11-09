/**
 * ------------------------------------------------------------------
 * PR Conversation
 * ------------------------------------------------------------------
 * Review và comment của PR dạng bubble có avatar, kèm ô nhập comment.
 * Review không có nội dung hiển thị thành dòng sự kiện gọn.
 * ------------------------------------------------------------------
 */

import { memo } from 'react';
import { Loader2, MessageSquare, Send } from 'lucide-react';

import { cn } from '@renderer/utils/cn';
import { PrAvatar } from './PrAvatar';
import type { PrComment, PrReview } from './types';
import { BTN_PRIMARY, FIELD, REVIEW_META, tint, timeAgo } from './utils';

interface PrConversationProps {
  reviews: PrReview[];
  comments: PrComment[];
  comment: string;
  busy: boolean;
  onCommentChange: (value: string) => void;
  onSubmit: () => void;
}

export const PrConversation = memo(function PrConversation({
  reviews,
  comments,
  comment,
  busy,
  onCommentChange,
  onSubmit,
}: PrConversationProps) {
  const empty = reviews.length === 0 && comments.length === 0;

  return (
    <div className={'flex flex-col gap-4'}>
      {empty && (
        <div className={'flex flex-col items-center gap-2 py-10 text-text-secondary/50 text-xs'}>
          <MessageSquare className={'w-8 h-8'} strokeWidth={1.2} />
          No reviews or comments yet
        </div>
      )}

      {reviews.map((r, i) => {
        const meta = REVIEW_META[r.state] ?? { label: r.state, color: 'rgb(var(--text-secondary))' };
        const who = r.author?.login ?? 'unknown';
        if (!r.body) {
          return (
            <div key={`r-${i}`} className={'flex items-center gap-2 text-[12px] text-text-secondary'}>
              <PrAvatar login={r.author?.login} size={18} />
              <span className={'font-medium text-text-primary'}>{who}</span>
              <span
                style={{ color: meta.color, background: tint(meta.color, 14) }}
                className={'rounded px-1.5 py-[1px] text-[10.5px] font-semibold'}
              >
                {meta.label}
              </span>
            </div>
          );
        }
        return (
          <div key={`r-${i}`} className={'flex gap-3'}>
            <PrAvatar login={r.author?.login} size={28} />
            <div
              style={{ borderColor: tint(meta.color, 35) }}
              className={'min-w-0 flex-1 rounded-lg border overflow-hidden'}
            >
              <div
                style={{ background: tint(meta.color, 10) }}
                className={'flex items-center gap-2 px-3 py-1.5 text-[11.5px]'}
              >
                <span className={'font-semibold text-text-primary'}>{who}</span>
                <span style={{ color: meta.color }} className={'font-semibold'}>
                  {meta.label}
                </span>
              </div>
              <div className={'px-3 py-2 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-text-primary'}>
                {r.body}
              </div>
            </div>
          </div>
        );
      })}

      {comments.map((c, i) => (
        <div key={`c-${i}`} className={'flex gap-3'}>
          <PrAvatar login={c.author?.login} size={28} />
          <div className={'min-w-0 flex-1 rounded-lg border border-border overflow-hidden'}>
            <div className={'flex items-center gap-2 px-3 py-1.5 bg-button-soft-background/60 text-[11.5px]'}>
              <span className={'font-semibold text-text-primary'}>{c.author?.login ?? 'unknown'}</span>
              <span className={'text-text-secondary'}>{`commented ${timeAgo(c.createdAt)}`}</span>
            </div>
            <div className={'px-3 py-2 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-text-primary'}>
              {c.body}
            </div>
          </div>
        </div>
      ))}

      <div className={cn('rounded-lg border border-border p-3 flex flex-col gap-2', !empty && 'mt-1')}>
        <textarea
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          rows={3}
          placeholder={'Leave a comment'}
          className={cn(FIELD, 'py-2 resize-y')}
        />
        <div className={'flex justify-end'}>
          <button
            className={BTN_PRIMARY}
            disabled={busy || comment.trim() === ''}
            onClick={onSubmit}
          >
            {busy ? <Loader2 className={'w-3.5 h-3.5 animate-spin'} /> : <Send className={'w-3.5 h-3.5'} />}
            Comment
          </button>
        </div>
      </div>
    </div>
  );
});

PrConversation.displayName = 'PrConversation';