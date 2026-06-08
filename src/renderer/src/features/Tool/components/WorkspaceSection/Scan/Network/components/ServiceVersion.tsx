import { useMemo } from 'react';
import type { DataPoint } from '../types/scan-data-point';
import type { SmartCategoryGroup } from '../types/scan-result';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface ServiceVersionProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function ServiceVersion({ dataPoints, activeGroup }: ServiceVersionProps) {
  const uniqueProducts = useMemo(() => {
    const products = new Set(
      dataPoints.filter((dp) => dp.metadata?.product).map((dp) => String(dp.metadata!.product)),
    );
    return products.size;
  }, [dataPoints]);

  const uniqueIps = useMemo(() => {
    const ips = new Set(
      dataPoints.filter((dp) => dp.metadata?.ip).map((dp) => String(dp.metadata!.ip)),
    );
    return ips.size;
  }, [dataPoints]);

  const withVersion = dataPoints.filter((dp) => dp.metadata?.version).length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">⚙️</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No service version data</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Hosts" value={uniqueIps} sub="with services" accent="#0a84ff" />
        <StatBox label="Products" value={uniqueProducts} sub="detected" accent="#f5a623" />
        <StatBox label="Versions" value={withVersion} sub="identified" accent="#30d158" />
      </div>

      <SectionHeader accent="#f5a623">Service Details</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source', 'metadata']}
      />
    </div>
  );
}
