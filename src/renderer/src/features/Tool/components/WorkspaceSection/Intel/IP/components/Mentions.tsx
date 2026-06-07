import { useMemo } from 'react';
import type { DataPoint } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface MentionsProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function Mentions({ dataPoints, activeGroup }: MentionsProps) {
  const darkwebMentions = dataPoints.filter((dp) => dp.category === 'darkweb_mention').length;
  const forumMentions = dataPoints.filter((dp) => dp.category === 'forum_mention').length;
  const socialMentions = dataPoints.filter((dp) => dp.category === 'social_mention').length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">💬</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No internet mentions found</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Total" value={dataPoints.length} sub="mentions" accent="#ff9f0a" />
        <StatBox label="Social" value={socialMentions} sub="platforms" accent="#0a84ff" />
        <StatBox
          label="Dark Web"
          value={darkwebMentions}
          sub="mentions"
          accent={darkwebMentions > 0 ? '#ff2d55' : '#30d158'}
        />
      </div>

      {darkwebMentions > 0 && (
        <div className="bg-[#ff2d5510] border border-[#ff2d5530] rounded p-2 mb-3">
          <span className="text-[11px] font-mono text-[#ff2d55]">
            ⚠ {darkwebMentions} dark web mention(s) — potential targeting
          </span>
        </div>
      )}

      <SectionHeader accent="#ff9f0a">Internet Mentions</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source']}
      />
    </div>
  );
}