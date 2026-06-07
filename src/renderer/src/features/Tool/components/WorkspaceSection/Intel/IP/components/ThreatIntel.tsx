import { useMemo } from 'react';
import type { DataPoint } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface ThreatIntelProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function ThreatIntel({ dataPoints, activeGroup }: ThreatIntelProps) {
  const confirmedThreats = dataPoints.filter((dp) =>
    !dp.isNoise && !dp.tags?.includes('false-positive'),
  ).length;
  const falsePositives = dataPoints.filter((dp) =>
    dp.isNoise || dp.tags?.includes('false-positive'),
  ).length;
  const criticalThreats = dataPoints.filter((dp) =>
    dp.tags?.includes('critical-risk') || dp.category === 'darkweb_mention',
  ).length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🛡️</span>
        <span className="text-[12px] font-mono text-[#30d158]">No threat intelligence data ✓</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Reports" value={dataPoints.length} sub="total" accent="#ff375f" />
        <StatBox
          label="Confirmed"
          value={confirmedThreats}
          sub="threats"
          accent={confirmedThreats > 0 ? '#ff2d55' : '#30d158'}
        />
        <StatBox label="False Pos." value={falsePositives} sub="noise" accent="#f5a623" />
      </div>

      {criticalThreats > 0 && (
        <div className="bg-[#ff2d5510] border border-[#ff2d5530] rounded p-2 mb-3">
          <span className="text-[11px] font-mono text-[#ff2d55]">
            ⚠ {criticalThreats} critical threat(s) detected — requires attention
          </span>
        </div>
      )}

      <SectionHeader accent="#ff375f">Threat Intelligence</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source', 'risk']}
        maxRows={100}
      />
    </div>
  );
}