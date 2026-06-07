import { useMemo } from 'react';
import type { DataPoint } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface SslCertsProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function SslCerts({ dataPoints, activeGroup }: SslCertsProps) {
  const certIssuers = dataPoints.filter((dp) => dp.category === 'cert_ip_issuer').length;
  const certDomains = dataPoints.filter((dp) =>
    ['cert_ip_domains', 'cert_ip_san'].includes(dp.category),
  ).length;

  const uniqueIssuers = new Set(
    dataPoints
      .filter((dp) => dp.category === 'cert_ip_issuer')
      .map((dp) => dp.displayValue || dp.value),
  ).size;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🔒</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No SSL certificates found</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Certs" value={certIssuers} sub="issuers" accent="#64d2ff" />
        <StatBox label="Domains" value={certDomains} sub="on certs" accent="#0a84ff" />
        <StatBox label="Issuers" value={uniqueIssuers} sub="unique" accent="#30d158" />
      </div>

      <SectionHeader accent="#64d2ff">SSL/TLS Certificates (IP-based)</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source']}
        maxRows={200}
      />
    </div>
  );
}