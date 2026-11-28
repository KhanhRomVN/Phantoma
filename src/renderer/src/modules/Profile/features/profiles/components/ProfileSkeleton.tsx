import { cn } from '@renderer/utils/cn';

function Bone({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-text-secondary/10', className)} />;
}

function SourceBarSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Bone className="h-4 w-12" />
      <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
        {['w-24', 'w-28', 'w-24', 'w-20'].map((w, i) => (
          <Bone key={i} className={cn('h-7', w)} />
        ))}
      </div>
    </div>
  );
}

function StatSectionSkeleton() {
  return (
    <div className="flex gap-2.5">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex flex-1 items-center gap-3 rounded-md bg-card-background px-3.5 py-2.5">
          <Bone className="h-8 w-8 shrink-0" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Bone className="h-4 w-10" />
            <Bone className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ToolPanelSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <Bone className="h-[34px] flex-1" />
        <Bone className="h-[34px] w-[34px]" />
        <Bone className="h-[34px] w-28" />
        <Bone className="h-[34px] w-[34px]" />
        <Bone className="h-[34px] w-[34px]" />
      </div>
      <div className="flex items-center gap-1.5">
        {['w-10', 'w-16', 'w-16', 'w-16', 'w-20', 'w-24', 'w-24'].map((w, i) => (
          <Bone key={i} className={cn('h-6', w)} />
        ))}
        <Bone className="ml-auto h-6 w-24" />
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-md bg-card-background">
      <div className="flex items-center gap-4 border-b border-border px-3 py-3">
        <Bone className="h-3 w-4" />
        {['w-16', 'w-14', 'w-16', 'w-16', 'w-14', 'w-16'].map((w, i) => (
          <Bone key={i} className={cn('h-3', w)} />
        ))}
      </div>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border px-3 py-3">
          <Bone className="h-4 w-4" />
          <Bone className="h-[30px] w-[30px] shrink-0" />
          <div className="flex w-44 flex-col gap-1.5">
            <Bone className="h-3.5 w-28" />
            <Bone className="h-3 w-40" />
          </div>
          <Bone className="h-5 w-16" />
          <Bone className="h-2 w-20" />
          <Bone className="h-6 w-24" />
          <Bone className="h-5 w-14" />
          <Bone className="h-6 w-20" />
          <Bone className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <>
      <SourceBarSkeleton />
      <StatSectionSkeleton />
      <ToolPanelSkeleton />
      <TableSkeleton />
    </>
  );
}

export default ProfileSkeleton;