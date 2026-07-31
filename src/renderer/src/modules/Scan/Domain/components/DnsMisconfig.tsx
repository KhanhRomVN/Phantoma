import { useMemo } from 'react';
import type { DataPoint } from '../types/scan-data-point';
import type { SmartCategoryGroup } from '../types/scan-result';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface DnsMisconfigProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function DnsMisconfig({ dataPoints, activeGroup }: DnsMisconfigProps) {
  const criticalCount = dataPoints.filter((dp) => dp.category === 'misconfig_critical').length;
  const highCount = dataPoints.filter((dp) => dp.category === 'misconfig_high').length;
  const mediumCount = dataPoints.filter((dp) => dp.category === 'misconfig_medium').length;
  const lowCount = dataPoints.filter((dp) => dp.category === 'misconfig_low').length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">✅</span>
        <span className="text-[12px] font-mono text-[#30d158]">No misconfigurations found</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatBox
          label="Critical"
          value={criticalCount}
          sub="immediate action"
          accent={criticalCount > 0 ? '#ff2d55' : '#3a4558'}
        />
        <StatBox
          label="High"
          value={highCount}
          sub="fix ASAP"
          accent={highCount > 0 ? '#ff6b35' : '#3a4558'}
        />
        <StatBox
          label="Medium"
          value={mediumCount}
          sub="review"
          accent={mediumCount > 0 ? '#f5a623' : '#3a4558'}
        />
        <StatBox
          label="Low"
          value={lowCount}
          sub="advisory"
          accent={lowCount > 0 ? '#0a84ff' : '#3a4558'}
        />
      </div>

      {criticalCount + highCount > 0 && (
        <>
          <SectionHeader accent="#ff2d55">Critical & High Severity</SectionHeader>
          <DataTable
            dataPoints={dataPoints.filter(
              (dp) => dp.category === 'misconfig_critical' || dp.category === 'misconfig_high',
            )}
            columns={['value', 'severity', 'confidence', 'source', 'metadata']}
          />
        </>
      )}

      {(mediumCount > 0 || lowCount > 0) && (
        <>
          <SectionHeader accent="#f5a623">Medium & Low Severity</SectionHeader>
          <DataTable
            dataPoints={dataPoints.filter(
              (dp) => dp.category === 'misconfig_medium' || dp.category === 'misconfig_low' || dp.category === 'misconfig_info',
            )}
            columns={['value', 'severity', 'confidence', 'source']}
          />
        </>
      )}
    </div>
  );
}