import type { DataPoint } from '../../Person/types/data-point';
import type { SmartCategoryGroup } from '../../Person/types/smart-category';
import { DataPointRow } from '../../Person/components/shared/DataPointRow';
import { SectionHeader } from '../../Person/components/shared/SectionHeader';
import { StatBox } from '../../Person/components/shared/StatBox';

interface DnsRecordsProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

const RECORD_LABELS: Record<string, string> = {
  dns_a_record: 'A (IPv4)',
  dns_aaaa_record: 'AAAA (IPv6)',
  dns_mx_record: 'MX (Mail)',
  dns_ns_record: 'NS (Nameserver)',
  dns_soa_record: 'SOA',
  dns_txt_record: 'TXT',
  dns_cname_record: 'CNAME',
  dns_srv_record: 'SRV',
  dns_ptr_record: 'PTR',
  dns_caa_record: 'CAA',
  dns_ds_record: 'DS',
  dns_dnskey_record: 'DNSKEY',
  dns_historical: 'Historical',
};

export function DnsRecords({ dataPoints, activeGroup }: DnsRecordsProps) {
  const grouped = dataPoints.reduce(
    (acc, dp) => {
      const key = dp.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(dp);
      return acc;
    },
    {} as Record<string, DataPoint[]>,
  );

  const recordTypes = Object.keys(grouped).length;
  const highConfCount = dataPoints.filter((dp) => dp.confidence >= 0.7).length;

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🌐</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No DNS records found</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Records" value={dataPoints.length} sub="total" accent="#30d158" />
        <StatBox label="Types" value={recordTypes} sub="record types" accent="#0a84ff" />
        <StatBox label="High Conf" value={highConfCount} sub="≥70%" accent="#30d158" />
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([category, dps]) => (
          <div key={category}>
            <SectionHeader accent="#30d158">
              {RECORD_LABELS[category] ||
                category.replace('dns_', '').replace(/_/g, ' ').toUpperCase()}
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
