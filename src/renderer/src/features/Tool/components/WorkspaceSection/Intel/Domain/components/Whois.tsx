import { useMemo } from 'react';
import type { DataPoint } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface WhoisProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function Whois({ dataPoints, activeGroup }: WhoisProps) {
  const grouped = useMemo(() => dataPoints.reduce(
    (acc, dp) => {
      const key = dp.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(dp);
      return acc;
    },
    {} as Record<string, DataPoint[]>,
  ), [dataPoints]);

  const verifiedCount = dataPoints.filter((dp) => dp.verificationStatus === 'verified').length;
  const historicalCount = dataPoints.filter((dp) => dp.category === 'whois_historical').length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🔍</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No WHOIS data available</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Fields" value={dataPoints.length} sub="total" accent="#af52de" />
        <StatBox label="Verified" value={verifiedCount} sub="confirmed" accent="#30d158" />
        <StatBox label="Historical" value={historicalCount} sub="snapshots" accent="#f5a623" />
      </div>

      <SectionHeader accent="#af52de">WHOIS Records</SectionHeader>
      <DataTable dataPoints={dataPoints} columns={['value', 'confidence', 'source']} />
    </div>
  );
}