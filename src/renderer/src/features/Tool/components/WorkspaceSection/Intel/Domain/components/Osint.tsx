import { useMemo } from 'react';
import type { DataPoint } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface OsintProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function Osint({ dataPoints, activeGroup }: OsintProps) {
  const grouped = useMemo(() => dataPoints.reduce(
    (acc, dp) => {
      const key = dp.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(dp);
      return acc;
    },
    {} as Record<string, DataPoint[]>,
  ), [dataPoints]);

  const waybackCount = (grouped.wayback_snapshot || []).length;
  const dorkCount = (grouped.google_dork || []).length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🔎</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No OSINT data available</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Total" value={dataPoints.length} sub="findings" accent="#ff9f0a" />
        <StatBox label="Dorks" value={dorkCount} sub="queries" accent="#0a84ff" />
        <StatBox label="Wayback" value={waybackCount} sub="snapshots" accent="#30d158" />
      </div>

      <SectionHeader accent="#ff9f0a">OSINT Findings</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source']}
        maxRows={100}
      />
    </div>
  );
}