import { memo, useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { SURFACE } from './constants';
import { ActionBadge, CheckRow, FileIcon, Progress, Section } from './shared';
import type { CheckItem, FileRef, TabId, WorkflowNode } from './types';
import { diffStat, splitPath } from './utils';

interface TabContentProps {
  node: WorkflowNode;
  tab: TabId;
  isChecked: (c: CheckItem) => boolean;
  onToggle: (c: CheckItem) => void;
}

function AccentText({ children }: { children: string }) {
  return (
    <div className="border-l-2 border-primary/60 pl-4">
      <p className="text-[13.5px] leading-relaxed text-text-primary">{children}</p>
    </div>
  );
}

function FileHeading({ file }: { file: FileRef }) {
  const { dir, name } = splitPath(file.path);
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <FileIcon name={name} />
        <span className="font-mono text-[12.5px] text-text-primary truncate">{name}</span>
      </div>
      <div className="font-mono text-[10.5px] text-text-secondary/60 truncate">{dir}</div>
    </div>
  );
}

function ContextFile({ file, showBadge }: { file: FileRef; showBadge: boolean }) {
  return (
    <div className="rounded-xl p-3.5 bg-card-background ring-1 ring-white/[0.06]">
      <div className="flex items-center gap-3">
        {showBadge && <ActionBadge action={file.action} />}
        <FileHeading file={file} />
        {file.lines && <span className="font-mono text-[10.5px] text-text-secondary/60">L{file.lines}</span>}
      </div>
      <p
        className={cn(
          'mt-2.5 pl-3 border-l-2 border-primary/30 text-[12px] leading-relaxed text-text-secondary',
          showBadge && 'ml-[11px]',
        )}
      >
        {file.note}
      </p>
    </div>
  );
}

function OverviewTab({ node, isChecked, onToggle }: Omit<TabContentProps, 'tab'>) {
  return (
    <>
      <Section title="Description">
        <AccentText>{node.description}</AccentText>
      </Section>

      <Section title="Sub-tasks" meta={<Progress done={node.subtasks.filter(isChecked).length} total={node.subtasks.length} />}>
        <div className={cn(SURFACE, 'p-1.5 flex flex-col')}>
          {node.subtasks.map((c) => (
            <CheckRow key={c.id} item={c} checked={isChecked(c)} onToggle={() => onToggle(c)} />
          ))}
        </div>
      </Section>
    </>
  );
}

function DoneFilesTab({ node }: { node: WorkflowNode }) {
  const diffTotals = useMemo(
    () =>
      node.files.reduce(
        (acc, f) => {
          const s = diffStat(f);
          return { add: acc.add + s.add, del: acc.del + s.del, changed: acc.changed + (f.diff ? 1 : 0) };
        },
        { add: 0, del: 0, changed: 0 },
      ),
    [node],
  );

  return (
    <Section
      title="Changes"
      meta={
        <span className="inline-flex items-center gap-2 font-mono text-[11.5px]">
          <span className="text-text-secondary">{diffTotals.changed} files</span>
          <span className="text-success">+{diffTotals.add}</span>
          <span className="text-red-400">−{diffTotals.del}</span>
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        {node.files.map((f) => {
          const stat = diffStat(f);
          return (
            <div key={f.path} className="rounded-xl overflow-hidden bg-card-background ring-1 ring-white/[0.06]">
              <div className="flex items-center gap-3 px-4 py-2.5">
                <ActionBadge action={f.action} />
                <FileHeading file={f} />
                {f.diff ? (
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-success">+{stat.add}</span>
                    <span className="text-red-400">−{stat.del}</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-text-secondary/60">No changes</span>
                )}
              </div>
              {f.diff && (
                <div className="border-t border-border bg-black/30 py-1.5 overflow-x-auto">
                  {f.diff.map((l, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex px-4 font-mono text-[11.5px] leading-[1.7]',
                        l.t === '+' && 'bg-success/10 text-success',
                        l.t === '-' && 'bg-red-500/10 text-red-300',
                        l.t === ' ' && 'text-text-secondary',
                      )}
                    >
                      <span className="w-4 shrink-0 select-none opacity-70">{l.t}</span>
                      <span className="whitespace-pre">{l.s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function PendingFilesTab({ node }: { node: WorkflowNode }) {
  const showBadge = node.status !== 'todo';
  const changeFiles = node.files.filter((f) => f.action !== 'read');
  const referenceFiles = node.files.filter((f) => f.action === 'read');
  return (
    <>
      {changeFiles.length > 0 && (
        <Section title="Files to change" meta={<span className="text-[11px] text-text-secondary">{changeFiles.length}</span>}>
          <div className="flex flex-col gap-2.5">
            {changeFiles.map((f) => (
              <ContextFile key={f.path} file={f} showBadge={showBadge} />
            ))}
          </div>
        </Section>
      )}
      {referenceFiles.length > 0 && (
        <Section title="Reference files" meta={<span className="text-[11px] text-text-secondary">{referenceFiles.length}</span>}>
          <div className="flex flex-col gap-2.5">
            {referenceFiles.map((f) => (
              <ContextFile key={f.path} file={f} showBadge={showBadge} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function ConclusionTab({ node }: { node: WorkflowNode }) {
  const conclusion = node.conclusion;
  if (!conclusion) {
    return (
      <Section title="Conclusion">
        <div className={cn(SURFACE, 'p-4')}>
          <div className="py-8 text-center text-[12px] text-text-secondary/60">No conclusion yet</div>
        </div>
      </Section>
    );
  }
  return (
    <>
      <Section title="Conclusion">
        <AccentText>{conclusion.summary}</AccentText>
      </Section>

      <Section title="Lessons learned" meta={<span className="text-[11px] text-text-secondary">{conclusion.lessons.length}</span>}>
        <div className={cn(SURFACE, 'p-1.5 flex flex-col')}>
          {conclusion.lessons.map((text, i) => (
            <div key={i} className="flex items-start gap-2.5 px-2.5 py-2">
              <Lightbulb className="mt-[1px] w-4 h-4 shrink-0 text-warn" />
              <span className="text-[12.5px] leading-snug text-text-primary">{text}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

export const TabContent = memo(function TabContent({ node, tab, isChecked, onToggle }: TabContentProps) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 flex flex-col gap-7">
      {tab === 'overview' && <OverviewTab node={node} isChecked={isChecked} onToggle={onToggle} />}
      {tab === 'files' && (node.status === 'done' ? <DoneFilesTab node={node} /> : <PendingFilesTab node={node} />)}
      {tab === 'conclusion' && <ConclusionTab node={node} />}
    </div>
  );
});