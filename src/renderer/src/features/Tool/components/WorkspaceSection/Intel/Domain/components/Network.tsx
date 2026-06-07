import { useMemo } from 'react';
import type { DataPoint } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface NetworkProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function Network({ dataPoints, activeGroup }: NetworkProps) {
  const grouped = useMemo(() => dataPoints.reduce(
    (acc, dp) => {
      const key = dp.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(dp);
      return acc;
    },
    {} as Record<string, DataPoint[]>,
  ), [dataPoints]);

  const openPortsCount = (grouped.open_port || []).length + (grouped.port || []).length;
  const serviceCount = (grouped.service || []).length + (grouped.service_banner || []).length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">📡</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No network scan data available</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Ports" value={openPortsCount} sub="open" accent="#ff6b35" />
        <StatBox label="Services" value={serviceCount} sub="detected" accent="#0a84ff" />
        <StatBox label="Total" value={dataPoints.length} sub="findings" accent="#ff6b35" />
      </div>

      <SectionHeader accent="#ff6b35">Network Scan</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source']}
      />
    </div>
  );
}