import { useMemo } from 'react';
import type { DataPoint } from '../../types/domain/data-point';
import type { SmartCategoryGroup } from '../../types/domain/smart-category';
import { SectionHeader } from '../shared/SectionHeader';
import { StatBox } from '../shared/StatBox';
import { DataTable } from '../shared/DataTable';

interface SslTlsCertsProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function SslTlsCerts({ dataPoints, activeGroup }: SslTlsCertsProps) {
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

  const certCount = (grouped.certificate || []).length;
  const uniqueIssuers = new Set(
    (grouped.cert_issuer || []).map((dp) => dp.displayValue || dp.value),
  ).size;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🔒</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No SSL/TLS certificates found</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Certs" value={certCount} sub="found" accent="#64d2ff" />
        <StatBox label="Issuers" value={uniqueIssuers} sub="unique" accent="#0a84ff" />
        <StatBox label="Total" value={dataPoints.length} sub="data points" accent="#64d2ff" />
      </div>

      <SectionHeader accent="#64d2ff">SSL/TLS Certificates</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source']}
        maxRows={200}
      />
    </div>
  );
}
