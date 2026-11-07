import { memo, useMemo, useState } from 'react';
import { DetailHeader } from './DetailHeader';
import { HeaderSection } from './HeaderSection';
import { MOCK_WORKFLOW } from './mockData';
import { TabContent } from './TabContent';
import { TimelineTask } from './TimelineTask';
import type { CheckItem, TabId } from './types';

export const Workflow = memo(function Workflow() {
  const plan = MOCK_WORKFLOW;
  const nextNode = useMemo(() => plan.nodes.find((n) => n.status !== 'done') ?? null, [plan]);
  const [selectedId, setSelectedId] = useState<string>(nextNode?.id ?? plan.nodes[0].id);
  const [tab, setTab] = useState<TabId>('overview');
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const selected = plan.nodes.find((n) => n.id === selectedId) ?? plan.nodes[0];

  const isChecked = (c: CheckItem) => checked[c.id] ?? c.done;
  const toggle = (c: CheckItem) => setChecked((p) => ({ ...p, [c.id]: !(p[c.id] ?? c.done) }));

  const selectNode = (id: string) => {
    setSelectedId(id);
    setTab('overview');
  };

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-background">
      <HeaderSection plan={plan} />

      <div className="flex-1 min-h-0 flex">
        <TimelineTask nodes={plan.nodes} selectedId={selectedId} isChecked={isChecked} onSelect={selectNode} />

        <div className="flex-1 min-w-0 flex flex-col">
          <DetailHeader node={selected} tab={tab} onTabChange={setTab} />
          <TabContent node={selected} tab={tab} isChecked={isChecked} onToggle={toggle} />
        </div>
      </div>
    </div>
  );
});