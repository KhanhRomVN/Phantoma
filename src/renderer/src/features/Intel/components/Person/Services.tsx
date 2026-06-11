import type { DataPoint } from '../../types/person/data-point';
import type { SmartCategoryGroup } from '../../types/person/smart-category';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { StatBox } from '../../components/shared/StatBox';
import { DataTable } from '../../components/shared/DataTable';

interface ServicesProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function Services({ dataPoints, activeGroup }: ServicesProps) {
  const confirmed = dataPoints.filter(
    (dp) => dp.category === 'service_registered' || dp.tags?.includes('confirmed'),
  ).length;
  const unconfirmed = dataPoints.filter(
    (dp) => dp.category === 'service_unconfirmed' || dp.tags?.includes('false-positive'),
  ).length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🔗</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No registered services found</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Total" value={dataPoints.length} sub="services" accent="#64d2ff" />
        <StatBox label="Confirmed" value={confirmed} sub="verified" accent="#30d158" />
        <StatBox
          label="Unconfirmed"
          value={unconfirmed}
          sub="uncertain"
          accent={unconfirmed > 0 ? '#f5a623' : '#30d158'}
        />
      </div>

      <SectionHeader accent="#64d2ff">Registered Services</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source']}
        maxRows={200}
      />
    </div>
  );
}
