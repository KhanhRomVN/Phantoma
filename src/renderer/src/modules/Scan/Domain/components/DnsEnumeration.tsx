import { useMemo } from 'react';
import type { DataPoint } from '../types/scan-data-point';
import type { SmartCategoryGroup } from '../types/scan-result';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';
import { DataTable } from './shared/DataTable';

interface DnsEnumerationProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
}

export function DnsEnumeration({ dataPoints, activeGroup }: DnsEnumerationProps) {
  const versionCount = dataPoints.filter((dp) => dp.category === 'dns_version').length;
  const dnssecCount = dataPoints.filter((dp) => dp.category === 'dns_dnssec').length;
  const chaosCount = dataPoints.filter((dp) => dp.category === 'dns_chaos_txt').length;

  const bindVersions = useMemo(() => {
    return dataPoints
      .filter((dp) => dp.category === 'dns_version')
      .map((dp) => dp.displayValue);
  }, [dataPoints]);

  const dnssecStatus = useMemo(() => {
    return dataPoints
      .filter((dp) => dp.category === 'dns_dnssec')
      .map((dp) => dp.displayValue);
  }, [dataPoints]);

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">🌐</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No DNS enumeration data</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Version" value={versionCount} sub="BIND instances" accent="#0a84ff" />
        <StatBox label="DNSSEC" value={dnssecCount} sub="checks" accent="#f5a623" />
        <StatBox label="Chaos TXT" value={chaosCount} sub="records" accent="#30d158" />
      </div>

      {versionCount > 0 && (
        <>
          <SectionHeader accent="#0a84ff">BIND Version ({versionCount})</SectionHeader>
          <div className="space-y-1 mb-3">
            {bindVersions.map((v, i) => (
              <div key={i} className="px-2 py-1.5 bg-[#0a0e14] border border-[#111827] rounded text-[11px] font-mono text-[#c8d6f0]">
                {v}
              </div>
            ))}
          </div>
        </>
      )}

      {dnssecCount > 0 && (
        <>
          <SectionHeader accent="#f5a623">DNSSEC Status</SectionHeader>
          <div className="space-y-1 mb-3">
            {dnssecStatus.map((s, i) => (
              <div
                key={i}
                className="px-2 py-1.5 bg-[#0a0e14] border border-[#111827] rounded text-[11px] font-mono"
                style={{ color: s.toLowerCase().includes('unsigned') ? '#ff6b35' : '#30d158' }}
              >
                {s}
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHeader accent="#30d158">All DNS Enumeration</SectionHeader>
      <DataTable
        dataPoints={dataPoints}
        columns={['value', 'category', 'severity', 'confidence', 'source']}
      />
    </div>
  );
}