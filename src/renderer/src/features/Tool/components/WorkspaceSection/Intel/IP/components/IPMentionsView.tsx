import React from 'react';
import type { DataPoint } from '../../Person/types/data-point';
import type { SmartCategoryGroup } from '../../Person/types/smart-category';
import { DataPointRow } from '../../Person/components/shared/DataPointRow';
import { SectionHeader } from '../../Person/components/shared/SectionHeader';
import { StatBox } from '../../Person/components/shared/StatBox';

interface IPMentionsViewProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

const CATEGORY_LABELS: Record<string, string> = {
  social_mention: 'Social Media',
  forum_mention: 'Forums',
  darkweb_mention: 'Dark Web',
  pastebin_entry: 'Pastebin',
  news_mention: 'News',
};

export function IPMentionsView({ dataPoints, activeGroup }: IPMentionsViewProps) {
  const grouped = dataPoints.reduce((acc, dp) => {
    const key = dp.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(dp);
    return acc;
  }, {} as Record<string, DataPoint[]>);

  const darkwebCount = (grouped.darkweb_mention || []).length;
  const noiseCount = dataPoints.filter(dp => dp.isNoise).length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">💬</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No mentions of this IP found</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Total" value={dataPoints.length} sub="mentions" accent="#f5a623" />
        <StatBox label="Dark Web" value={darkwebCount} sub="findings" accent={darkwebCount > 0 ? '#ff2d55' : '#30d158'} />
        <StatBox label="Noise" value={noiseCount} sub="flagged" accent="#6a7a9a" />
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([category, dps]) => (
          <div key={category}>
            <SectionHeader accent="#f5a623">
              {CATEGORY_LABELS[category] || category.replace(/_/g, ' ')}
              <span className="text-[10px] font-normal text-[#6a7a9a] ml-1">({dps.length})</span>
            </SectionHeader>
            <div className="space-y-1">
              {dps.map(dp => (
                <DataPointRow key={dp.id} dataPoint={dp} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}