import { useMemo } from 'react';
import type { DataPoint } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface SocialMediaProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function SocialMedia({ dataPoints, activeGroup }: SocialMediaProps) {
  const confirmedProfiles = dataPoints.filter((dp) =>
    dp.verificationStatus === 'verified' || dp.tags?.includes('confirmed'),
  ).length;
  const noiseProfiles = dataPoints.filter((dp) =>
    dp.isNoise || dp.tags?.includes('collision'),
  ).length;
  const uniquePlatforms = new Set(dataPoints.map((dp) => dp.metadata?.platform || dp.label)).size;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🌐</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No social media profiles found</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Profiles" value={dataPoints.length} sub="total" accent="#ff6b35" />
        <StatBox
          label="Confirmed"
          value={confirmedProfiles}
          sub="verified"
          accent="#30d158"
        />
        <StatBox
          label="Noise"
          value={noiseProfiles}
          sub="collisions"
          accent={noiseProfiles > 0 ? '#f5a623' : '#30d158'}
        />
      </div>

      <SectionHeader accent="#ff6b35">Social Media Profiles ({uniquePlatforms} platforms)</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source']}
        maxRows={200}
      />
    </div>
  );
}