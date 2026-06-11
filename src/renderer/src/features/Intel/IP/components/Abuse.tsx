import { useMemo } from 'react';
import type { DataPoint } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface AbuseProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function Abuse({ dataPoints, activeGroup }: AbuseProps) {
  const spamReports = dataPoints.filter((dp) =>
    ['spam_report', 'spam_listing'].includes(dp.category),
  ).length;
  const exploitReports = dataPoints.filter((dp) =>
    ['exploit_listing', 'brute_force', 'hacking_report'].includes(dp.category),
  ).length;
  const malwareUrls = dataPoints.filter((dp) => dp.category === 'malware_url').length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">📋</span>
        <span className="text-[12px] font-mono text-[#30d158]">No abuse reports ✓</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Reports" value={dataPoints.length} sub="total" accent="#f5a623" />
        <StatBox label="Spam" value={spamReports} sub="reports" accent="#ff9f0a" />
        <StatBox
          label="Malware"
          value={malwareUrls}
          sub="URLs"
          accent={malwareUrls > 0 ? '#ff2d55' : '#30d158'}
        />
      </div>

      <SectionHeader accent="#f5a623">Abuse Reports & Listings</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source']}
        maxRows={100}
      />
    </div>
  );
}