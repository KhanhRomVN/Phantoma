import { useMemo } from 'react';
import type { DataPoint } from '../types/scan-data-point';
import type { SmartCategoryGroup } from '../types/scan-result';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface HostDiscoveryProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function HostDiscovery({ dataPoints, activeGroup }: HostDiscoveryProps) {
  const hostsUp = dataPoints.filter((dp) => dp.category === 'host_up').length;
  const hostsDown = dataPoints.filter((dp) => dp.category === 'host_down').length;

  const averageLatency = useMemo(() => {
    const latencies = dataPoints
      .filter((dp) => dp.metadata?.latency_ms !== undefined)
      .map((dp) => Number(dp.metadata!.latency_ms));
    if (latencies.length === 0) return 0;
    return (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1);
  }, [dataPoints]);

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🔍</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No host discovery data</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Hosts Up" value={hostsUp} sub="active" accent="#30d158" />
        <StatBox label="Hosts Down" value={hostsDown} sub="unreachable" accent="#3a4558" />
        <StatBox label="Avg Latency" value={`${averageLatency}ms`} sub="RTT" accent="#0a84ff" />
      </div>

      <SectionHeader accent="#30d158">Active Hosts ({hostsUp})</SectionHeader>
      <DataTable
        dataPoints={dataPoints.filter((dp) => dp.category === 'host_up')}
        columns={['value', 'category', 'confidence', 'source']}
      />

      {hostsDown > 0 && (
        <>
          <SectionHeader accent="#3a4558">Unreachable Hosts ({hostsDown})</SectionHeader>
          <DataTable
            dataPoints={dataPoints.filter((dp) => dp.category === 'host_down')}
            columns={['value', 'category', 'confidence', 'source']}
          />
        </>
      )}
    </div>
  );
}