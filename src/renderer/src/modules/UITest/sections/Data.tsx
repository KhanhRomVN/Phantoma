import { useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableCell,
} from '@renderer/components/ui/Table';
import Calendar from '@renderer/components/ui/Calendar/Calendar';
import { ResizableSplit } from '@renderer/components/ui/ResizableSplit';
import { Demo, Section } from '../shared';

const ROWS = [
  { id: 1, name: 'Alpha', status: 'active', size: 120 },
  { id: 2, name: 'Beta', status: 'paused', size: 80 },
  { id: 3, name: 'Gamma', status: 'done', size: 45 },
];

export function TableDemo() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <Section
      title="Table"
      description="Table, TableHeader, TableBody, TableFooter, TableRow (+ HTML attrs, onClick), TableCell (as: th | td, colSpan...), className"
    >
      <Demo label="basic + row onClick + className" column>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell as="th">Name</TableCell>
              <TableCell as="th">Status</TableCell>
              <TableCell as="th" className="text-right">
                Size
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => setSelected(row.id)}
                className={selected === row.id ? 'bg-primary/10' : 'cursor-pointer'}
              >
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell className="text-right">{row.size}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>Selected: {selected ?? 'none'}</TableCell>
              <TableCell className="text-right">{ROWS.reduce((s, r) => s + r.size, 0)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Demo>
    </Section>
  );
}

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