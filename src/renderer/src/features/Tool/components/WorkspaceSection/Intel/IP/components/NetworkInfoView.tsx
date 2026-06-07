import React from 'react';
import type { DataPoint } from '../../Person/types/data-point';
import type { SmartCategoryGroup } from '../../Person/types/smart-category';
import { DataPointRow } from '../../Person/components/shared/DataPointRow';
import { SectionHeader } from '../../Person/components/shared/SectionHeader';
import { StatBox } from '../../Person/components/shared/StatBox';

interface NetworkInfoViewProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

const CATEGORY_LABELS: Record<string, string> = {
  ip_reverse_dns: 'Reverse DNS',
  ip_ptr_record: 'PTR Records',
  ip_geo_location: 'Geo Location',
  ip_isp: 'ISP',
  ip_asn: 'ASN',
  ip_bgp_prefix: 'BGP Prefixes',
  ip_bgp_peer: 'BGP Peers',
  ip_bgp_aspath: 'BGP AS Path',
  ip_cidr: 'CIDR',
  ip_netrange: 'Net Range',
  geo_location: 'Geo Location',
  asn: 'ASN',
  cidr_range: 'CIDR Ranges',
  hosting_provider: 'Hosting',
  cloud_provider: 'Cloud',
};

export function NetworkInfoView({ dataPoints, activeGroup }: NetworkInfoViewProps) {
  const grouped = dataPoints.reduce((acc, dp) => {
    const key = dp.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(dp);
    return acc;
  }, {} as Record<string, DataPoint[]>);

  const asnCount = (grouped.ip_asn || []).length + (grouped.asn || []).length;
  const geoCount = (grouped.ip_geo_location || []).length + (grouped.geo_location || []).length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🌐</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No network information available</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatBox label="Total" value={dataPoints.length} sub="points" accent="#af52de" />
        <StatBox label="ASN" value={asnCount} sub="networks" accent="#0a84ff" />
        <StatBox label="Geo" value={geoCount} sub="locations" accent="#30d158" />
        <StatBox label="Groups" value={Object.keys(grouped).length} sub="types" accent="#f5a623" />
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([category, dps]) => (
          <div key={category}>
            <SectionHeader accent="#af52de">
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