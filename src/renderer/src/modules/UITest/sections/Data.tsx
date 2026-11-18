import { useState } from 'react';
import Calendar from '@renderer/components/ui/Calendar/Calendar';
import { ResizableSplit } from '@renderer/components/ui/ResizableSplit';
import { Demo, Section } from '../shared';

export function CalendarDemo() {
  const [value, setValue] = useState<string | null>(null);

  return (
    <Section title="Calendar" description="Props: value (yyyy-MM-dd), onChange, className">
      <Demo label="controlled">
        <Calendar value={value} onChange={setValue} className="w-64 rounded-lg border border-border" />
        <span className="text-xs text-text-secondary">value = {value ?? 'null'}</span>
      </Demo>
      <Demo label="initial value">
        <Calendar value="2026-01-15" onChange={() => undefined} className="w-64 rounded-lg border border-border" />
      </Demo>
    </Section>
  );
}

const Pane = ({ label }: { label: string }) => (
  <div className="flex h-full w-full items-center justify-center p-2 text-xs text-text-secondary">
    {label}
  </div>
);

export function ResizableSplitDemo() {
  return (
    <Section
      title="ResizableSplit"
      description="Props: children (2 phần tử), direction, initialSize (%), minSize (%), maxSize (%)"
    >
      <Demo label="direction=horizontal (mặc định 50 / 20-80)" column>
        <div className="h-40 w-full overflow-hidden rounded-lg border border-border">
          <ResizableSplit direction="horizontal">
            <Pane label="Left" />
            <Pane label="Right" />
          </ResizableSplit>
        </div>
      </Demo>
      <Demo label="direction=vertical" column>
        <div className="h-48 w-full overflow-hidden rounded-lg border border-border">
          <ResizableSplit direction="vertical">
            <Pane label="Top" />
            <Pane label="Bottom" />
          </ResizableSplit>
        </div>
      </Demo>
      <Demo label="initialSize=30, minSize=10, maxSize=90" column>
        <div className="h-40 w-full overflow-hidden rounded-lg border border-border">
          <ResizableSplit direction="horizontal" initialSize={30} minSize={10} maxSize={90}>
            <Pane label="30%" />
            <Pane label="70%" />
          </ResizableSplit>
        </div>
      </Demo>
    </Section>
  );
}