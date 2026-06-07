import React from 'react';
import type { DataPoint } from '../../Person/types/data-point';
import type { SmartCategoryGroup } from '../../Person/types/smart-category';
import { DataPointRow } from '../../Person/components/shared/DataPointRow';
import { SectionHeader } from '../../Person/components/shared/SectionHeader';
import { StatBox } from '../../Person/components/shared/StatBox';

interface WhoisProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

const CATEGORY_LABELS: Record<string, string> = {
  whois_domain_name: 'Domain Name',
  whois_registrar: 'Registrar',
  whois_registry: 'Registry',
  whois_creation_date: 'Created',
  whois_expiration_date: 'Expires',
  whois_updated_date: 'Updated',
  whois_status: 'Status',
  whois_nameserver: 'Nameservers',
  whois_registrant: 'Registrant',
  whois_admin_contact: 'Admin Contact',
  whois_tech_contact: 'Tech Contact',
  whois_raw: 'Raw WHOIS',
  whois_historical: 'Historical Records',
};

export function Whois({ dataPoints, activeGroup }: WhoisProps) {
  const grouped = dataPoints.reduce(
    (acc, dp) => {
      const key = dp.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(dp);
      return acc;
    },
    {} as Record<string, DataPoint[]>,
  );

  const verifiedCount = dataPoints.filter((dp) => dp.verificationStatus === 'verified').length;
  const historicalCount = dataPoints.filter((dp) => dp.category === 'whois_historical').length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🔍</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No WHOIS data available</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Fields" value={dataPoints.length} sub="total" accent="#af52de" />
        <StatBox label="Verified" value={verifiedCount} sub="confirmed" accent="#30d158" />
        <StatBox label="Historical" value={historicalCount} sub="snapshots" accent="#f5a623" />
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([category, dps]) => (
          <div key={category}>
            <SectionHeader accent="#af52de">
              {CATEGORY_LABELS[category] || category.replace('whois_', '').replace(/_/g, ' ')}
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
