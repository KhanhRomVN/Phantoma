import React from 'react';
import type { DataPoint } from '../../Person/types/data-point';
import type { SmartCategoryGroup } from '../../Person/types/smart-category';
import { DataPointRow } from '../../Person/components/shared/DataPointRow';
import { SectionHeader } from '../../Person/components/shared/SectionHeader';
import { StatBox } from '../../Person/components/shared/StatBox';

interface ServicesViewProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

const CATEGORY_LABELS: Record<string, string> = {
  ip_service_banner: 'Service Banners',
  ip_service_version: 'Service Versions',
  open_port: 'Open Ports',
  service_banner: 'Banners',
  port: 'Ports',
  service: 'Services',
  http_response: 'HTTP Responses',
  ssl_certificate_chain: 'SSL Chains',
};

export function ServicesView({ dataPoints, activeGroup }: ServicesViewProps) {
  const grouped = dataPoints.reduce((acc, dp) => {
    const key = dp.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(dp);
    return acc;
  }, {} as Record<string, DataPoint[]>);

  const portsCount = (grouped.open_port || []).length + (grouped.port || []).length;
  const bannersCount = (grouped.ip_service_banner || []).length + (grouped.service_banner || []).length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🖥️</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No services detected</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatBox label="Ports" value={portsCount} sub="open" accent="#30d158" />
        <StatBox label="Banners" value={bannersCount} sub="grabbed" accent="#0a84ff" />
        <StatBox label="Services" value={(grouped.service || []).length} sub="identified" accent="#f5a623" />
        <StatBox label="Total" value={dataPoints.length} sub="findings" accent="#30d158" />
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([category, dps]) => (
          <div key={category}>
            <SectionHeader accent="#30d158">
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