import type { DataPoint } from '../../Person/types/data-point';
import type { SmartCategoryGroup } from '../../Person/types/smart-category';
import { DataPointRow } from '../../Person/components/shared/DataPointRow';
import { SectionHeader } from '../../Person/components/shared/SectionHeader';
import { StatBox } from '../../Person/components/shared/StatBox';

interface SubdomainsProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

const CATEGORY_LABELS: Record<string, string> = {
  subdomain: 'Active',
  subdomain_takeover: 'Takeover Risk',
  subdomain_wildcard: 'Wildcard',
  subdomain_internal: 'Internal',
  subdomain_cname: 'CNAME',
};

export function Subdomains({ dataPoints, activeGroup }: SubdomainsProps) {
  const grouped = dataPoints.reduce(
    (acc, dp) => {
      const key = dp.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(dp);
      return acc;
    },
    {} as Record<string, DataPoint[]>,
  );

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

      <div className="space-y-3">
        {Object.entries(grouped).map(([category, dps]) => (
          <div key={category}>
            <SectionHeader accent="#0a84ff">
              {CATEGORY_LABELS[category] || category.replace(/_/g, ' ')}
              <span className="text-[10px] font-normal text-[#6a7a9a] ml-1">({dps.length})</span>
            </SectionHeader>
            <div className="space-y-1">
              {dps.slice(0, 100).map((dp) => (
                <DataPointRow key={dp.id} dataPoint={dp} />
              ))}
              {dps.length > 100 && (
                <div className="text-[11px] font-mono text-[#6a7a9a] text-center py-2">
                  +{dps.length - 100} more subdomains
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
