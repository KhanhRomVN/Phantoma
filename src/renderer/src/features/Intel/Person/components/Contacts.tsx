import { useMemo } from 'react';
import type { DataPoint } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface ContactsProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function Contacts({ dataPoints, activeGroup }: ContactsProps) {
  const emails = dataPoints.filter((dp) => dp.category === 'contact_email').length;
  const phones = dataPoints.filter((dp) => dp.category === 'contact_phone').length;
  const addresses = dataPoints.filter((dp) => dp.category === 'contact_address').length;
  const messengers = dataPoints.filter((dp) => dp.category === 'contact_messenger').length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">📧</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No contact data available</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatBox label="Emails" value={emails} sub="addresses" accent="#30d158" />
        <StatBox label="Phones" value={phones} sub="numbers" accent="#0a84ff" />
        <StatBox label="Addresses" value={addresses} sub="locations" accent="#f5a623" />
        <StatBox label="Messengers" value={messengers} sub="accounts" accent="#af52de" />
      </div>

      <SectionHeader accent="#30d158">Contact Information</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'confidence', 'source']}
        maxRows={100}
      />
    </div>
  );
}