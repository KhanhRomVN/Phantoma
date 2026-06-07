import React from 'react';
import type { DataPoint } from '../../Person/types/data-point';
import type { SmartCategoryGroup } from '../../Person/types/smart-category';
import { DataPointRow } from '../../Person/components/shared/DataPointRow';
import { SectionHeader } from '../../Person/components/shared/SectionHeader';
import { StatBox } from '../../Person/components/shared/StatBox';

interface ReputationViewProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

const CATEGORY_LABELS: Record<string, string> = {
  ip_abuse_report: 'Abuse Reports',
  ip_spam_list: 'Spam Lists',
  ip_threat_intel: 'Threat Intelligence',
};

export function ReputationView({ dataPoints, activeGroup }: ReputationViewProps) {
  const grouped = dataPoints.reduce((acc, dp) => {
    const key = dp.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(dp);
    return acc;
  }, {} as Record<string, DataPoint[]>);

  const abuseCount = (grouped.ip_abuse_report || []).length;
  const spamCount = (grouped.ip_spam_list || []).length;
  const threatCount = (grouped.ip_threat_intel || []).length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">✅</span>
        <span className="text-[12px] font-mono text-[#30d158]">No reputation issues — IP is clean</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Abuse" value={abuseCount} sub="reports" accent="#ff2d55" />
        <StatBox label="Spam" value={spamCount} sub="blacklists" accent="#f5a623" />
        <StatBox label="Threats" value={threatCount} sub="intel" accent="#ff375f" />
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([category, dps]) => (
          <div key={category}>
            <SectionHeader accent="#ff2d55">
              {CATEGORY_LABELS[category] || category.replace('ip_', '').replace(/_/g, ' ')}
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