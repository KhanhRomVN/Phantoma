import { useMemo } from 'react';
import type { DataPoint } from '../types/scan-data-point';
import type { SmartCategoryGroup } from '../types/scan-result';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface OSDetectionProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function OSDetection({ dataPoints, activeGroup }: OSDetectionProps) {
  const highAccuracy = dataPoints.filter((dp) => dp.metadata?.accuracy && Number(dp.metadata.accuracy) >= 85).length;
  const lowAccuracy = dataPoints.filter((dp) => dp.metadata?.accuracy && Number(dp.metadata.accuracy) < 85).length;

  const osDistribution = useMemo(() => {
    const dist = new Map<string, number>();
    for (const dp of dataPoints) {
      const os = dp.metadata?.operatingSystem;
      if (os) {
        const key = String(os).split(' ')[0];
        dist.set(key, (dist.get(key) || 0) + 1);
      }
    }
    return Array.from(dist.entries()).sort((a, b) => b[1] - a[1]);
  }, [dataPoints]);

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🖥️</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No OS detection data</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Hosts" value={dataPoints.length} sub="fingerprinted" accent="#0a84ff" />
        <StatBox label="High Accuracy" value={highAccuracy} sub="≥85%" accent="#30d158" />
        <StatBox label="Low Accuracy" value={lowAccuracy} sub="<85%" accent="#f5a623" />
      </div>

      {osDistribution.length > 0 && (
        <>
          <SectionHeader accent="#0a84ff">OS Distribution</SectionHeader>
          <div className="flex flex-wrap gap-2 mb-3">
            {osDistribution.map(([os, count]) => (
              <span
                key={os}
                className="text-[11px] font-mono px-2 py-1 rounded bg-[#0d1017] border border-[#1c2333]"
              >
                {os}: {count}
              </span>
            ))}
          </div>
        </>
      )}

      <SectionHeader accent="#ff6b35">OS Fingerprinting Results</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source', 'metadata']}
      />
    </div>
  );
}