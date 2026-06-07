import React from 'react';
import type { DataPoint } from '../../Person/types/data-point';
import type { SmartCategoryGroup } from '../../Person/types/smart-category';
import { DataPointRow } from '../../Person/components/shared/DataPointRow';
import { SectionHeader } from '../../Person/components/shared/SectionHeader';
import { StatBox } from '../../Person/components/shared/StatBox';

interface TechStackProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

const CATEGORY_LABELS: Record<string, string> = {
  tech_framework: 'Frameworks',
  tech_cms: 'CMS',
  tech_server: 'Servers',
  tech_cdn: 'CDN',
  tech_analytics: 'Analytics',
  tech_javascript: 'JavaScript',
  tech_ssl: 'SSL/TLS',
  tech_header: 'Headers',
  tech_cookie: 'Cookies',
  technology: 'Technologies',
};

export function TechStack({ dataPoints, activeGroup }: TechStackProps) {
  const grouped = dataPoints.reduce(
    (acc, dp) => {
      const key = dp.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(dp);
      return acc;
    },
    {} as Record<string, DataPoint[]>,
  );

  const uniqueTechs = new Set(dataPoints.map((dp) => dp.displayValue || dp.value)).size;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">💻</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No technologies detected</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Detected" value={dataPoints.length} sub="findings" accent="#64d2ff" />
        <StatBox label="Unique" value={uniqueTechs} sub="technologies" accent="#0a84ff" />
        <StatBox
          label="Categories"
          value={Object.keys(grouped).length}
          sub="types"
          accent="#30d158"
        />
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([category, dps]) => (
          <div key={category}>
            <SectionHeader accent="#64d2ff">
              {CATEGORY_LABELS[category] || category.replace('tech_', '').replace(/_/g, ' ')}
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
