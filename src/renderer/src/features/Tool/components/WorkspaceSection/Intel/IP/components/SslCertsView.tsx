import React from 'react';
import type { DataPoint } from '../../Person/types/data-point';
import type { SmartCategoryGroup } from '../../Person/types/smart-category';
import { DataPointRow } from '../../Person/components/shared/DataPointRow';
import { SectionHeader } from '../../Person/components/shared/SectionHeader';
import { StatBox } from '../../Person/components/shared/StatBox';

interface SslCertsViewProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

const CATEGORY_LABELS: Record<string, string> = {
  ip_ssl_cert: 'SSL Certificates',
  certificate: 'Certificates',
  cert_issuer: 'Issuers',
  cert_domains: 'Covered Domains',
  cert_validity: 'Validity',
  ssl_certificate_chain: 'SSL Chains',
};

export function SslCertsView({ dataPoints, activeGroup }: SslCertsViewProps) {
  const grouped = dataPoints.reduce((acc, dp) => {
    const key = dp.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(dp);
    return acc;
  }, {} as Record<string, DataPoint[]>);

  const certCount = (grouped.ip_ssl_cert || []).length + (grouped.certificate || []).length;
  const uniqueIssuers = new Set(
    (grouped.cert_issuer || []).map(dp => dp.displayValue || dp.value)
  ).size;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🔒</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No SSL certificates on this IP</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Certs" value={certCount} sub="found" accent="#64d2ff" />
        <StatBox label="Issuers" value={uniqueIssuers} sub="unique" accent="#0a84ff" />
        <StatBox label="Total" value={dataPoints.length} sub="points" accent="#64d2ff" />
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([category, dps]) => (
          <div key={category}>
            <SectionHeader accent="#64d2ff">
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