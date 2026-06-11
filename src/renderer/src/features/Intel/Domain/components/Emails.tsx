import { useMemo } from 'react';
import type { DataPoint } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface EmailsProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function Emails({ dataPoints, activeGroup }: EmailsProps) {
  const grouped = useMemo(() => dataPoints.reduce(
    (acc, dp) => {
      const key = dp.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(dp);
      return acc;
    },
    {} as Record<string, DataPoint[]>,
  ), [dataPoints]);

  const uniqueEmails = new Set(
    dataPoints
      .filter((dp) => dp.category === 'harvested_email' || dp.category === 'email')
      .map((dp) => String(dp.value).toLowerCase()),
  ).size;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">📧</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No emails harvested</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Total" value={dataPoints.length} sub="found" accent="#30d158" />
        <StatBox label="Unique" value={uniqueEmails} sub="addresses" accent="#0a84ff" />
        <StatBox
          label="Patterns"
          value={(grouped.email_pattern || []).length}
          sub="detected"
          accent="#f5a623"
        />
      </div>

      <SectionHeader accent="#30d158">Harvested Emails</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'confidence', 'source']}
      />
    </div>
  );
}