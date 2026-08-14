import { useMemo } from 'react';
import type { DataPoint } from '../../types/domain/data-point';
import type { SmartCategoryGroup } from '../../types/domain/smart-category';
import { SectionHeader } from '../shared/SectionHeader';
import { StatBox } from '../shared/StatBox';
import { DataTable } from '../shared/DataTable';

interface MentionsProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function Mentions({ dataPoints, activeGroup }: MentionsProps) {
  const grouped = useMemo(
    () =>
      dataPoints.reduce(
        (acc, dp) => {
          const key = dp.category;
          if (!acc[key]) acc[key] = [];
          acc[key].push(dp);
          return acc;
        },
        {} as Record<string, DataPoint[]>,
      ),
    [dataPoints],
  );

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">💬</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No internet mentions found</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Total" value={dataPoints.length} sub="mentions" accent="#f5a623" />
        <StatBox label="Sources" value={Object.keys(grouped).length} sub="types" accent="#0a84ff" />
        <StatBox
          label="Noise"
          value={dataPoints.filter((dp) => dp.isNoise).length}
          sub="flagged"
          accent="#6a7a9a"
        />
      </div>

      <SectionHeader accent="#f5a623">Internet Mentions</SectionHeader>
      <DataTable dataPoints={dataPoints} columns={['value', 'category', 'confidence', 'source']} />
    </div>
  );
}
