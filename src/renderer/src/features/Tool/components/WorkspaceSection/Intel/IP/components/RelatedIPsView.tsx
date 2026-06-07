import React from 'react';
import type { DataPoint } from '../../Person/types/data-point';
import type { SmartCategoryGroup } from '../../Person/types/smart-category';
import { DataPointRow } from '../../Person/components/shared/DataPointRow';
import { SectionHeader } from '../../Person/components/shared/SectionHeader';
import { StatBox } from '../../Person/components/shared/StatBox';

interface RelatedIPsViewProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

const CATEGORY_LABELS: Record<string, string> = {
  ip_related_ip: 'Related IPs',
  ip_address: 'IP Addresses',
  peer_networks: 'Peer Networks',
};

export function RelatedIPsView({ dataPoints, activeGroup }: RelatedIPsViewProps) {
  const grouped = dataPoints.reduce((acc, dp) => {
    const key = dp.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(dp);
    return acc;
  }, {} as Record<string, DataPoint[]>);

  const relatedCount = (grouped.ip_related_ip || []).length;
  const peerCount = (grouped.peer_networks || []).length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🔗</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No related IPs found</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Related" value={relatedCount} sub="IPs" accent="#ff9f0a" />
        <StatBox label="Peers" value={peerCount} sub="networks" accent="#0a84ff" />
        <StatBox label="Total" value={dataPoints.length} sub="findings" accent="#ff9f0a" />
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([category, dps]) => (
          <div key={category}>
            <SectionHeader accent="#ff9f0a">
              {CATEGORY_LABELS[category] || category.replace('ip_', '').replace(/_/g, ' ')}
              <span className="text-[10px] font-normal text-[#6a7a9a] ml-1">({dps.length})</span>
            </SectionHeader>
            <div className="space-y-1">
              {dps.map(dp => (
                <DataPointRow key={dp.id} dataPoint={dp} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}