import { useMemo } from 'react';
import type { DataPoint } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface BgpProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function Bgp({ dataPoints, activeGroup }: BgpProps) {
  const asnEntries = dataPoints.filter((dp) => dp.category === 'bgp_asn').length;
  const prefixEntries = dataPoints.filter((dp) => dp.category === 'bgp_prefix').length;
  const peerEntries = dataPoints.filter((dp) => dp.category === 'bgp_peer').length;
  const upstreamEntries = dataPoints.filter((dp) => dp.category === 'bgp_upstream').length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🔀</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No BGP data available</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatBox label="ASN" value={asnEntries} sub="entries" accent="#af52de" />
        <StatBox label="Prefixes" value={prefixEntries} sub="ranges" accent="#0a84ff" />
        <StatBox label="Peers" value={peerEntries} sub="peers" accent="#30d158" />
        <StatBox label="Upstreams" value={upstreamEntries} sub="providers" accent="#f5a623" />
      </div>

      <SectionHeader accent="#af52de">BGP / ASN Data</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source', 'metadata']}
        maxRows={200}
      />
    </div>
  );
}