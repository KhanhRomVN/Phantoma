import { useMemo } from 'react';
import type { DataPoint } from '../types/scan-data-point';
import type { SmartCategoryGroup } from '../types/scan-result';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface DnsBruteforceProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function DnsBruteforce({ dataPoints, activeGroup }: DnsBruteforceProps) {
  const resolvedCount = dataPoints.filter((dp) => dp.category === 'bruteforce_resolved').length;
  const unresolvedCount = dataPoints.filter((dp) => dp.category === 'bruteforce_unresolved').length;
  const wildcardCount = dataPoints.filter((dp) => dp.category === 'bruteforce_wildcard').length;
  const internalCount = dataPoints.filter((dp) => dp.category === 'bruteforce_internal').length;
  const publicCount = resolvedCount - internalCount;

  const avgLatency = useMemo(() => {
    const latencies = dataPoints
      .filter((dp) => dp.metadata?.latency_ms !== undefined)
      .map((dp) => Number(dp.metadata!.latency_ms));
    if (latencies.length === 0) return 0;
    return Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  }, [dataPoints]);

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🔍</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No brute-force results</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatBox label="Resolved" value={publicCount} sub="public" accent="#30d158" />
        <StatBox label="Internal" value={internalCount} sub="RFC 1918" accent="#ff6b35" />
        <StatBox label="Wildcard" value={wildcardCount} sub="noise" accent="#f5a623" />
        <StatBox label="Avg Latency" value={`${avgLatency}ms`} sub="RTT" accent="#0a84ff" />
      </div>

      <SectionHeader accent="#0a84ff">Resolved Subdomains ({publicCount + internalCount})</SectionHeader>
      <DataTable
        dataPoints={dataPoints.filter((dp) => dp.category === 'bruteforce_resolved' || dp.category === 'bruteforce_internal')}
        columns={['value', 'category', 'severity', 'confidence', 'source']}
        maxRows={200}
      />

      {wildcardCount > 0 && (
        <>
          <SectionHeader accent="#f5a623">Wildcard Responses ({wildcardCount})</SectionHeader>
          <div className="text-[11px] font-mono text-[#6a7a9a] mb-2">
            These subdomains resolved due to wildcard DNS (*.phantoma.com → 104.18.32.11) — likely false positives.
          </div>
          <DataTable
            dataPoints={dataPoints.filter((dp) => dp.category === 'bruteforce_wildcard')}
            columns={['value', 'confidence', 'source']}
            maxRows={50}
          />
        </>
      )}

      {unresolvedCount > 0 && (
        <>
          <SectionHeader accent="#3a4558">Unresolved ({unresolvedCount})</SectionHeader>
          <DataTable
            dataPoints={dataPoints.filter((dp) => dp.category === 'bruteforce_unresolved')}
            columns={['value', 'confidence', 'source']}
            maxRows={50}
          />
        </>
      )}
    </div>
  );
}