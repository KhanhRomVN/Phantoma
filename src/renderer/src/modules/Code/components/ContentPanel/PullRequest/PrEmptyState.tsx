/**
 * ------------------------------------------------------------------
 * PR Empty States
 * ------------------------------------------------------------------
 * Empty state cho danh sách PR (theo bộ lọc) và cho khung chi tiết
 * khi chưa chọn PR nào.
 * ------------------------------------------------------------------
 */

import { memo } from 'react';
import { GitMerge, GitPullRequest, GitPullRequestClosed, Inbox, Plus } from 'lucide-react';

import type { Filter } from './types';
import { BTN_PRIMARY, TONE_COLOR as TONE_COLOR_EXPORT, tint } from './utils';

const COPY: Record<Filter, { title: string; hint: string; color: string; Icon: typeof Inbox }> = {
  open: {
    title: 'No open pull requests',
    hint: 'Everything is merged or closed. Push a branch and open a new pull request.',
    color: TONE_COLOR_EXPORT.open,
    Icon: GitPullRequest,
  },
  merged: {
    title: 'Nothing merged yet',
    hint: 'Merged pull requests will show up here.',
    color: TONE_COLOR_EXPORT.merged,
    Icon: GitMerge,
  },
  closed: {
    title: 'No closed pull requests',
    hint: 'Pull requests closed without merging will show up here.',
    color: TONE_COLOR_EXPORT.closed,
    Icon: GitPullRequestClosed,
  },
  all: {
    title: 'No pull requests yet',
    hint: 'This repository has no pull requests. Create the first one.',
    color: TONE_COLOR_EXPORT.draft,
    Icon: Inbox,
  },
};

export const PrListEmpty = memo(function PrListEmpty({
  filter,
  onCreate,
}: {
  filter: Filter;
  onCreate: () => void;
}) {
  const { title, hint, color, Icon } = COPY[filter];
  return (
    <div className={'flex flex-col items-center gap-3 px-6 py-14 text-center'}>
      <div
        style={{ color, background: tint(color, 12), borderColor: tint(color, 35) }}
        className={'w-14 h-14 rounded-2xl border border-dashed grid place-items-center'}
      >
        <Icon className={'w-6 h-6'} strokeWidth={1.5} />
      </div>
      <div className={'text-[13px] font-semibold text-text-primary'}>{title}</div>
      <p className={'text-[12px] leading-relaxed text-text-secondary max-w-[240px]'}>{hint}</p>
      {(filter === 'open' || filter === 'all') && (
        <button onClick={onCreate} className={BTN_PRIMARY}>
          <Plus className={'w-3.5 h-3.5'} />
          New pull request
        </button>
      )}
    </div>
  );
});

export const PrDetailEmpty = memo(function PrDetailEmpty() {
  return (
    <div className={'flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center'}>
      <div className={'relative w-20 h-20'}>
        <span
          style={{ background: tint(TONE_COLOR_EXPORT.merged, 14) }}
          className={'absolute left-0 top-2 w-14 h-14 rounded-2xl rotate-[-8deg]'}
        />
        <span
          style={{ background: tint(TONE_COLOR_EXPORT.open, 16) }}
          className={'absolute right-0 bottom-1 w-14 h-14 rounded-2xl rotate-[8deg]'}
        />
        <span className={'absolute inset-3 rounded-2xl border border-border bg-card-background grid place-items-center text-primary'}>
          <GitPullRequest className={'w-7 h-7'} strokeWidth={1.5} />
        </span>
      </div>
      <div className={'text-[13px] font-semibold text-text-primary'}>Select a pull request</div>
      <p className={'text-[12px] leading-relaxed text-text-secondary max-w-[260px]'}>
        Pick one from the list to review its commits, changed files and conversation.
      </p>
    </div>
  );
});

PrListEmpty.displayName = 'PrListEmpty';
PrDetailEmpty.displayName = 'PrDetailEmpty';