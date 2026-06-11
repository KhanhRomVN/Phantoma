import { useMemo } from 'react';
import type { DataPoint } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface IdentityProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function Identity({ dataPoints, activeGroup }: IdentityProps) {
  const names = dataPoints.filter((dp) => dp.category === 'identity_full_name' || dp.category === 'identity_real_name').length;
  const aliases = dataPoints.filter((dp) => dp.category === 'identity_alias').length;
  const usernames = dataPoints.filter((dp) => dp.category === 'identity_username').length;
  const locations = dataPoints.filter((dp) => dp.category === 'identity_location').length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">👤</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No identity data available</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatBox label="Names" value={names} sub="found" accent="#0a84ff" />
        <StatBox label="Aliases" value={aliases} sub="handles" accent="#af52de" />
        <StatBox label="Usernames" value={usernames} sub="unique" accent="#30d158" />
        <StatBox label="Locations" value={locations} sub="places" accent="#f5a623" />
      </div>

      <SectionHeader accent="#0a84ff">Identity Information</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source']}
        maxRows={100}
      />
    </div>
  );
}