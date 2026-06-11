import { useMemo } from 'react';
import type { DataPoint } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface PeopleProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function People({ dataPoints, activeGroup }: PeopleProps) {
  const grouped = useMemo(
    () =>
      dataPoints.reduce(
        (acc, dp) => {
          const key = dp.category;
          if (!acc[key]) acc[key] = [];
          acc[key].push(dp);
          return acc;
        },
        {} as Record<string, DataPoint[]>,
      ),
    [dataPoints],
  );

  const emailCount = (grouped.employee_email || []).length;
  const positionCount = (grouped.employee_position || []).length;

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
        <span className="text-[12px] font-mono text-[#6a7a9a]">No personnel data discovered</span>
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

      <SectionHeader accent="#0a84ff">Personnel</SectionHeader>
      <DataTable dataPoints={dataPoints} columns={['value', 'category', 'confidence', 'source']} />
    </div>
  );
}
