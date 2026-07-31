import { useMemo } from 'react';
import type { DataPoint } from '../../types/domain/data-point';
import type { SmartCategoryGroup } from '../../types/domain/smart-category';
import { SectionHeader } from '../shared/SectionHeader';
import { StatBox } from '../shared/StatBox';
import { DataTable } from '../shared/DataTable';

interface InfrastructureProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function Infrastructure({ dataPoints, activeGroup }: InfrastructureProps) {
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

  const ipCount = (grouped.ip_address || []).length;
  const asnCount = (grouped.asn || []).length;
  const hostingCount = (grouped.hosting_provider || []).length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🏗️</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">
          No infrastructure data available
        </span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatBox label="IPs" value={ipCount} sub="addresses" accent="#ff6b35" />
        <StatBox label="ASN" value={asnCount} sub="networks" accent="#0a84ff" />
        <StatBox label="Hosting" value={hostingCount} sub="providers" accent="#30d158" />
        <StatBox label="Total" value={dataPoints.length} sub="points" accent="#ff6b35" />
      </div>

      <SectionHeader accent="#ff6b35">Infrastructure</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source', 'metadata']}
      />
    </div>
  );
}
