import type { DataPoint } from '../../types/domain/data-point';
import type { SmartCategoryGroup } from '../../types/domain/smart-category';
import { SectionHeader } from '../shared/SectionHeader';
import { StatBox } from '../shared/StatBox';
import { DataTable } from '../shared/DataTable';

interface SubdomainsProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function Subdomains({ dataPoints, activeGroup }: SubdomainsProps) {
  const takeoverCount = dataPoints.filter((dp) => dp.category === 'subdomain_takeover').length;
  const resolvedCount = dataPoints.filter(
    (dp) => dp.displayValue && dp.displayValue.includes('.'),
  ).length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🗂️</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No subdomains discovered</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Total" value={dataPoints.length} sub="subdomains" accent="#0a84ff" />
        <StatBox label="Resolved" value={resolvedCount} sub="has IP" accent="#30d158" />
        <StatBox
          label="Takeover"
          value={takeoverCount}
          sub="at risk"
          accent={takeoverCount > 0 ? '#ff2d55' : '#30d158'}
        />
      </div>

      <SectionHeader accent="#0a84ff">Subdomains</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source', 'risk']}
        maxRows={200}
      />
    </div>
  );
}
