import type { DataPoint } from '../../Person/types/data-point';
import type { SmartCategoryGroup } from '../../Person/types/smart-category';
import { DataPointRow } from '../../Person/components/shared/DataPointRow';
import { SectionHeader } from '../../Person/components/shared/SectionHeader';
import { StatBox } from '../../Person/components/shared/StatBox';

interface PeopleProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

const CATEGORY_LABELS: Record<string, string> = {
  employee_name: 'Employees',
  employee_email: 'Emails',
  employee_position: 'Positions',
};

export function People({ dataPoints, activeGroup }: PeopleProps) {
  const grouped = dataPoints.reduce(
    (acc, dp) => {
      const key = dp.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(dp);
      return acc;
    },
    {} as Record<string, DataPoint[]>,
  );

  const employeeCount = (grouped.employee_name || []).length;
  const emailCount = (grouped.employee_email || []).length;
  const positionCount = (grouped.employee_position || []).length;

  // Extract unique employees from metadata
  const uniqueEmployees = new Set(
    (grouped.employee_name || []).map((dp) => {
      const name = dp.metadata?.name || dp.displayValue || dp.value;
      return String(name).toLowerCase();
    }),
  ).size;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">👥</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">
          No personnel data discovered
        </span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatBox label="People" value={uniqueEmployees} sub="identified" accent="#0a84ff" />
        <StatBox label="Emails" value={emailCount} sub="found" accent="#30d158" />
        <StatBox label="Positions" value={positionCount} sub="roles" accent="#f5a623" />
        <StatBox label="Total" value={dataPoints.length} sub="data points" accent="#0a84ff" />
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([category, dps]) => (
          <div key={category}>
            <SectionHeader accent="#0a84ff">
              {CATEGORY_LABELS[category] || category.replace(/_/g, ' ')}
              <span className="text-[10px] font-normal text-[#6a7a9a] ml-1">({dps.length})</span>
            </SectionHeader>
            <div className="space-y-1">
              {dps.map((dp) => (
                <DataPointRow key={dp.id} dataPoint={dp} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}