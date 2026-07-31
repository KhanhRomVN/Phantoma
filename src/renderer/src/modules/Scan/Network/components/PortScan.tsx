import { useMemo } from 'react';
import type { DataPoint } from '../types/scan-data-point';
import type { SmartCategoryGroup } from '../types/scan-result';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface PortScanProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function PortScan({ dataPoints, activeGroup }: PortScanProps) {
  const openPorts = dataPoints.filter((dp) => dp.metadata?.state === 'open').length;
  const filteredPorts = dataPoints.filter((dp) => dp.metadata?.state === 'filtered').length;

  const uniqueHosts = useMemo(() => {
    const hosts = new Set(
      dataPoints.filter((dp) => dp.metadata?.ip).map((dp) => String(dp.metadata!.ip)),
    );
    return hosts.size;
  }, [dataPoints]);

  const topServices = useMemo(() => {
    const serviceCount = new Map<string, number>();
    for (const dp of dataPoints) {
      if (dp.metadata?.service) {
        const svc = String(dp.metadata!.service);
        serviceCount.set(svc, (serviceCount.get(svc) || 0) + 1);
      }
    }
    return Array.from(serviceCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [dataPoints]);

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🚪</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No port scan data</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatBox label="Open Ports" value={openPorts} sub="accessible" accent="#ff6b35" />
        <StatBox label="Filtered" value={filteredPorts} sub="firewalled" accent="#f5a623" />
        <StatBox label="Hosts" value={uniqueHosts} sub="scanned" accent="#0a84ff" />
        <StatBox label="Unique Services" value={topServices.length} sub="detected" accent="#30d158" />
      </div>

      {topServices.length > 0 && (
        <>
          <SectionHeader accent="#0a84ff">Top Services</SectionHeader>
          <div className="flex flex-wrap gap-2 mb-3">
            {topServices.map(([service, count]) => (
              <span
                key={service}
                className="text-[11px] font-mono px-2 py-1 rounded bg-[#0d1017] border border-[#1c2333]"
              >
                {service}: {count}
              </span>
            ))}
          </div>
        </>
      )}

      <SectionHeader accent="#ff6b35">Open Ports ({openPorts})</SectionHeader>
      <DataTable
        dataPoints={dataPoints.filter((dp) => dp.metadata?.state === 'open')}
        columns={['value', 'category', 'severity', 'confidence', 'source']}
      />

      {filteredPorts > 0 && (
        <>
          <SectionHeader accent="#f5a623">Filtered Ports ({filteredPorts})</SectionHeader>
          <DataTable
            dataPoints={dataPoints.filter((dp) => dp.metadata?.state === 'filtered')}
            columns={['value', 'category', 'confidence', 'source']}
          />
        </>
      )}
    </div>
  );
}