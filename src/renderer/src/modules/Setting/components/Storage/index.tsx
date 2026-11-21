import React, { useMemo, useState } from 'react';
import { Eraser, HardDrive, Trash2 } from 'lucide-react';
import { MOCK_DISK, MOCK_STORAGE } from '../../mock/mockData';
import { BAR, Badge, PageHeader, Row, Section, SoftButton, StatTile } from '../shared';
import { cn } from '@renderer/utils/cn';

const fmt = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`);

const Storage: React.FC = () => {
  const [slices, setSlices] = useState(MOCK_STORAGE);

  const total = useMemo(() => slices.reduce((n, s) => n + s.sizeMb, 0), [slices]);
  const diskPct = Math.round((MOCK_DISK.usedMb / MOCK_DISK.totalMb) * 100);

  const clear = (id: string) =>
    setSlices((prev) => prev.map((s) => (s.id === id ? { ...s, sizeMb: 0 } : s)));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Storage" description="See what takes up space and clean it up." />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatTile label="Phantoma data" value={fmt(total)} icon={<HardDrive className="h-3.5 w-3.5" />} hint="~/.phantoma" />
        <StatTile
          label="Disk used"
          value={`${diskPct}%`}
          tone={diskPct > 85 ? 'error' : diskPct > 70 ? 'warn' : 'success'}
          progress={diskPct}
          hint={`${fmt(MOCK_DISK.usedMb)} of ${fmt(MOCK_DISK.totalMb)}`}
        />
        <StatTile
          label="Reclaimable"
          value={fmt(slices.filter((s) => s.id === 'cache' || s.id === 'logs').reduce((n, s) => n + s.sizeMb, 0))}
          tone="warn"
          icon={<Eraser className="h-3.5 w-3.5" />}
          hint="Cache and logs"
        />
      </div>

      <Section title="Breakdown" bodyClassName="divide-y-0">
        <div className="px-4 py-4">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-text-secondary/15">
            {slices.map((s) => (
              <div
                key={s.id}
                title={`${s.label}: ${fmt(s.sizeMb)}`}
                className={cn('h-full transition-all', BAR[s.tone])}
                style={{ width: `${total ? (s.sizeMb / total) * 100 : 0}%` }}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {slices.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary">
                <span className={cn('h-2 w-2 rounded-full', BAR[s.tone])} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Locations">
        {slices.map((s) => (
          <Row
            key={s.id}
            label={s.label}
            description={<span className="font-mono">{s.path}</span>}
          >
            <Badge tone={s.tone}>{fmt(s.sizeMb)}</Badge>
            {(s.id === 'cache' || s.id === 'logs') && (
              <SoftButton tone="error" disabled={s.sizeMb === 0} onClick={() => clear(s.id)}>
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </SoftButton>
            )}
          </Row>
        ))}
      </Section>
    </div>
  );
};

export default Storage;