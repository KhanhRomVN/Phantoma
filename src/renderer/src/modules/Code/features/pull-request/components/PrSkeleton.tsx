/**
 * ------------------------------------------------------------------
 * PR Skeleton
 * ------------------------------------------------------------------
 * Skeleton loading cho danh sách card và cho khung chi tiết PR.
 * ------------------------------------------------------------------
 */

import { memo } from 'react';

import { cn } from '@renderer/utils/cn';

const Bone = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded bg-text-secondary/10', className)} />
);

export const PrListSkeleton = memo(function PrListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={'py-1'}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={'mx-2 my-1.5 rounded-lg border border-border/40 px-3 py-2.5'}>
          <div className={'flex items-start gap-2.5'}>
            <Bone className={'w-6 h-6 rounded-md shrink-0'} />
            <div className={'flex-1 min-w-0 flex flex-col gap-2'}>
              <Bone className={cn('h-3', i % 2 ? 'w-[70%]' : 'w-[88%]')} />
              <Bone className={'h-2.5 w-[55%]'} />
              <div className={'flex items-center gap-1.5 mt-0.5'}>
                <Bone className={'h-4 w-20'} />
                <Bone className={'h-3 w-3'} />
                <Bone className={'h-4 w-12'} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

export const PrDetailSkeleton = memo(function PrDetailSkeleton() {
  return (
    <div className={'p-6 flex flex-col gap-5 max-w-[860px]'}>
      <div className={'flex flex-col gap-3'}>
        <div className={'flex items-center gap-2'}>
          <Bone className={'h-5 w-16 rounded-full'} />
          <Bone className={'h-5 w-[50%]'} />
        </div>
        <div className={'flex items-center gap-2'}>
          <Bone className={'h-5 w-5 rounded-full'} />
          <Bone className={'h-3 w-40'} />
          <Bone className={'h-5 w-24'} />
          <Bone className={'h-3 w-4'} />
          <Bone className={'h-5 w-16'} />
        </div>
        <div className={'flex items-center gap-2'}>
          <Bone className={'h-7 w-28'} />
          <Bone className={'h-7 w-20'} />
          <Bone className={'h-7 w-16'} />
        </div>
      </div>
      <div className={'flex items-center gap-4 border-b border-border pb-2'}>
        <Bone className={'h-4 w-16'} />
        <Bone className={'h-4 w-20'} />
        <Bone className={'h-4 w-14'} />
        <Bone className={'h-4 w-24'} />
      </div>
      <div className={'flex flex-col gap-2'}>
        <Bone className={'h-3 w-full'} />
        <Bone className={'h-3 w-[92%]'} />
        <Bone className={'h-3 w-[60%]'} />
      </div>
      <div className={'flex flex-col gap-2'}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={'flex items-center gap-2'}>
            <Bone className={'h-4 w-4 shrink-0'} />
            <Bone className={cn('h-3', i % 2 ? 'w-[40%]' : 'w-[55%]')} />
            <span className={'flex-1'} />
            <Bone className={'h-3 w-10'} />
          </div>
        ))}
      </div>
    </div>
  );
});

PrListSkeleton.displayName = 'PrListSkeleton';
PrDetailSkeleton.displayName = 'PrDetailSkeleton';