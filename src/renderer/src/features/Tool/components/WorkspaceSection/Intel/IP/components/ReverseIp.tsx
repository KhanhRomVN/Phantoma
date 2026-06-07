import { useMemo } from 'react';
import type { DataPoint } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface ReverseIpProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function ReverseIp({ dataPoints, activeGroup }: ReverseIpProps) {
  const primaryDomains = dataPoints.filter((dp) => dp.category === 'primary_domain').length;
  const relatedDomains = dataPoints.filter((dp) => dp.category === 'related_domain').length;
  const unrelatedDomains = dataPoints.filter((dp) =>
    ['unrelated_domain', 'hosted_domain'].includes(dp.category) && !dp.tags?.includes('target-domain'),
  ).length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🌐</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No hosted domains found</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Total" value={dataPoints.length} sub="domains" accent="#0a84ff" />
        <StatBox label="Target" value={primaryDomains} sub="matched" accent="#30d158" />
        <StatBox
          label="Unrelated"
          value={unrelatedDomains}
          sub="shared IP"
          accent="#6a7a9a"
        />
      </div>

      <SectionHeader accent="#0a84ff">Hosted Domains (Reverse IP)</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source']}
        maxRows={200}
      />
    </div>
  );
}