import React from 'react';
import type { DataPoint } from '../../Person/types/data-point';
import type { SmartCategoryGroup } from '../../Person/types/smart-category';
import { DataPointRow } from '../../Person/components/shared/DataPointRow';
import { SectionHeader } from '../../Person/components/shared/SectionHeader';
import { StatBox } from '../../Person/components/shared/StatBox';

interface EmailsProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

const CATEGORY_LABELS: Record<string, string> = {
  harvested_email: 'Harvested Emails',
  email_pattern: 'Email Patterns',
  catch_all_email: 'Catch-All',
  email: 'Emails',
};

export function Emails({ dataPoints, activeGroup }: EmailsProps) {
  const grouped = dataPoints.reduce(
    (acc, dp) => {
      const key = dp.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(dp);
      return acc;
    },
    {} as Record<string, DataPoint[]>,
  );

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

      <div className="space-y-3">
        {Object.entries(grouped).map(([category, dps]) => (
          <div key={category}>
            <SectionHeader accent="#30d158">
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
