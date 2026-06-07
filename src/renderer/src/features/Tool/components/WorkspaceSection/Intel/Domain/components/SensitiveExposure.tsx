import { useMemo } from 'react';
import type { DataPoint } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface SensitiveExposureProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function SensitiveExposure({ dataPoints, activeGroup }: SensitiveExposureProps) {
  const grouped = useMemo(() => dataPoints.reduce(
    (acc, dp) => {
      const key = dp.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(dp);
      return acc;
    },
    {} as Record<string, DataPoint[]>,
  ), [dataPoints]);

  const criticalCount = dataPoints.filter((dp) => dp.riskScore && dp.riskScore >= 75).length;
  const noiseCount = dataPoints.filter((dp) => dp.isNoise).length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🛡️</span>
        <span className="text-[12px] font-mono text-[#30d158]">
          No sensitive exposures detected ✓
        </span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Exposures" value={dataPoints.length} sub="found" accent="#ff375f" />
        <StatBox
          label="Critical"
          value={criticalCount}
          sub="high risk"
          accent={criticalCount > 0 ? '#ff2d55' : '#30d158'}
        />
        <StatBox label="Noise" value={noiseCount} sub="false positive" accent="#f5a623" />
      </div>

      <SectionHeader accent="#ff375f">Sensitive Exposures</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'risk']}
        maxRows={100}
      />
    </div>
  );
}